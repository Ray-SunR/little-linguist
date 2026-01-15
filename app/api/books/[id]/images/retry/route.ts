import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { createClient as createAuthClient } from "@/lib/supabase/server";
import {
    getOrCreateIdentity,
    reserveCredits,
    refundCredits,
} from "@/lib/features/usage/usage-service.server";
import { ImageGenerationFactory } from '@/lib/features/image-generation/factory';

export const dynamic = 'force-dynamic';

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    const bookId = params.id;
    let body;
    try {
        body = await req.json();
    } catch (e) {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { sectionIndex } = body || {};

    if (sectionIndex === undefined) {
        return NextResponse.json({ error: "sectionIndex is required" }, { status: 400 });
    }

    const authClient = createAuthClient();
    const { data: { user } } = await authClient.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const serviceRoleClient = createClient(supabaseUrl, supabaseServiceKey);

    try {
        // 1. Fetch book data
        const { data: book, error: bookError } = await serviceRoleClient
            .from('books')
            .select('*, owner_user_id, metadata, child_id')
            .eq('id', bookId)
            .single();

        if (bookError || !book) {
            return NextResponse.json({ error: "Book not found" }, { status: 404 });
        }

        // Verify ownership
        if (book.owner_user_id !== user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const sections = book.metadata?.sections || [];
        const section = sections[sectionIndex];

        if (!section) {
            return NextResponse.json({ error: "Section not found" }, { status: 404 });
        }

        // Verify it actually expects an image
        if (!section.image_prompt || section.image_prompt.trim() === "" || section.image_prompt.trim() === "[1]") {
            return NextResponse.json({ error: "This section does not have an image to generate" }, { status: 400 });
        }

        // Verify status and retry count
        const status = section.image_status;
        const retryCount = section.retry_count || 0;

        if (status !== 'failed' && status !== 'pending') {
            return NextResponse.json({ error: `Cannot retry image with status: ${status}` }, { status: 400 });
        }

        if (retryCount >= 3) {
            return NextResponse.json({ error: "Max retry limit reached for this image" }, { status: 403 });
        }

        const { data: story, error: storyError } = await serviceRoleClient
            .from('stories')
            .select('avatar_url, main_character_description')
            .eq('id', bookId)
            .single();

        if (storyError || !story) {
            return NextResponse.json({ error: "Story data not found" }, { status: 500 });
        }

        // 2. Usage Tracking
        const identity = await getOrCreateIdentity(user);
        const reservationResult = await reserveCredits(identity, [
            {
                featureName: "image_generation",
                increment: 1,
                childId: book.child_id,
                metadata: { book_id: bookId, section_index: sectionIndex, is_retry: true },
                entityId: bookId,
                entityType: 'story'
            }
        ]);

        if (!reservationResult.success) {
            return NextResponse.json({
                error: "LIMIT_REACHED",
                message: reservationResult.error || "Insufficient credits for retry"
            }, { status: 403 });
        }

        // 3. Mark as generating immediately
        await serviceRoleClient.rpc('update_section_image_status', {
            p_book_id: bookId,
            p_section_index: sectionIndex,
            p_status: 'generating'
        });

        // 4. Background task for the actual generation
        const generateTask = async () => {
            try {
                let userPhotoBuffer: Buffer | undefined;

                if (story.avatar_url) {
                    try {
                        const { data: photoData, error: downloadError } = await serviceRoleClient.storage
                            .from('user-assets')
                            .download(story.avatar_url);

                        if (photoData) {
                            const arrayBuffer = await photoData.arrayBuffer();
                            userPhotoBuffer = Buffer.from(arrayBuffer);
                        }
                    } catch (err) {
                        console.warn("[RetryAPI] Failed to download character reference:", err);
                    }
                }

                const provider = ImageGenerationFactory.getProvider();
                const result = await provider.generateImage({
                    prompt: section.image_prompt,
                    subjectImage: userPhotoBuffer,
                    characterDescription: story.main_character_description,
                    imageSize: '1K'
                });

                const imageStoragePath = `${bookId}/images/section-${sectionIndex}-${Date.now()}.png`;

                const { error: uploadError } = await serviceRoleClient.storage
                    .from('book-assets')
                    .upload(imageStoragePath, result.imageBuffer, {
                        contentType: result.mimeType,
                        upsert: true
                    });

                if (uploadError) throw uploadError;

                // Update book_media
                await serviceRoleClient.from('book_media').upsert({
                    book_id: bookId,
                    media_type: 'image',
                    path: imageStoragePath,
                    after_word_index: section.after_word_index,
                    metadata: {
                        caption: `Illustration for section ${sectionIndex + 1}`,
                        alt: section.image_prompt
                    },
                    owner_user_id: user.id
                }, { onConflict: 'book_id,path' });

                // Set status to success
                await serviceRoleClient.rpc('update_section_image_status', {
                    p_book_id: bookId,
                    p_section_index: sectionIndex,
                    p_status: 'success',
                    p_storage_path: imageStoragePath
                });

            } catch (err) {
                console.error("[RetryAPI] Generation failed:", err);
                await serviceRoleClient.rpc('update_section_image_status', {
                    p_book_id: bookId,
                    p_section_index: sectionIndex,
                    p_status: 'failed',
                    p_error_message: String(err)
                });

                // Refund for failed retry
                try {
                    await refundCredits(
                        identity,
                        "image_generation",
                        1,
                        book.child_id,
                        { book_id: bookId, section_index: sectionIndex, is_retry: true },
                        `retry-refund-${bookId}-${sectionIndex}-${retryCount}`,
                        bookId,
                        'story'
                    );
                } catch (refundErr) {
                    console.error("[RetryAPI] Failed to refund credit:", refundErr);
                }
            }
        };

        // Fire and forget (Next.js maintains the context long enough or Vercel waitUntil can be used if available)
        // Here we use waitUntil to ensure the task completes in serverless environments.
        waitUntil(generateTask());

        return NextResponse.json({ success: true, status: 'generating' });

    } catch (error: any) {
        console.error("[RetryAPI] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
