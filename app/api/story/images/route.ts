import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { createClient } from "@supabase/supabase-js";
import { createClient as createAuthClient } from "@/lib/supabase/server";
import { ImageGenerationFactory } from '@/lib/features/image-generation/factory';
import { StoryRepository } from '@/lib/core/stories/repository.server';

export async function POST(req: Request) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const authClient = createAuthClient();
    const { data: { user } } = await authClient.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized. Please sign in to generate images." }, { status: 401 });
    }

    try {
        const { bookId, sceneIndex: rawSceneIndex } = await req.json();

        if (!bookId || typeof bookId !== 'string') {
            return NextResponse.json({ error: "Valid bookId is required" }, { status: 400 });
        }

        let sceneIndex: number | undefined;
        if (rawSceneIndex !== undefined) {
            sceneIndex = parseInt(String(rawSceneIndex), 10);
            if (isNaN(sceneIndex) || sceneIndex < 0) {
                return NextResponse.json({ error: "Invalid sceneIndex" }, { status: 400 });
            }
        }

        const storyRepo = new StoryRepository(supabase);
        const story = await storyRepo.getStoryById(bookId, user.id);

        if (!story) {
            return NextResponse.json({ error: "Story meta not found or unauthorized" }, { status: 404 });
        }

        const scenes = story.scenes || [];
        const mainCharacterDescription = story.main_character_description || 'the main character';

        if (scenes.length === 0) {
            return NextResponse.json({ error: "No scenes found in story" }, { status: 400 });
        }

        if (sceneIndex !== undefined && (sceneIndex < 0 || sceneIndex >= scenes.length)) {
            return NextResponse.json({ error: `Invalid sceneIndex ${sceneIndex}. Story has ${scenes.length} scenes.` }, { status: 400 });
        }

        let userPhotoBuffer: Buffer | undefined;
        if (story.avatar_url) {
            try {
                // story.avatar_url now stores the bucket path (e.g. "guardianNo/avatars/childNo/timestamp.jpg")
                // We need to download this from the 'user-assets' bucket.
                const { data: photoData, error: downloadError } = await supabase.storage
                    .from('user-assets')
                    .download(story.avatar_url);

                if (downloadError) {
                    console.warn(`Failed to download user photo from user-assets with path ${story.avatar_url}:`, downloadError);
                } else if (photoData) {
                    const arrayBuffer = await photoData.arrayBuffer();
                    userPhotoBuffer = Buffer.from(arrayBuffer);
                }
            } catch (err) {
                console.error("Failed to download user photo:", err);
            }
        }

        const provider = ImageGenerationFactory.getProvider();
        const results = [];

        const indicesToGenerate = sceneIndex !== undefined
            ? [sceneIndex]
            : scenes.map((_: any, i: number) => i);

        for (const i of indicesToGenerate) {
            const scene = scenes[i];
            if (!scene) continue;

            try {
                const result = await provider.generateImage({
                    prompt: scene.image_prompt,
                    subjectImage: userPhotoBuffer,
                    characterDescription: mainCharacterDescription,
                    imageSize: '1K'
                });

                const storagePath = `${bookId}/images/scene-${i}-${Date.now()}.png`;

                await supabase.storage.from('book-assets').upload(storagePath, result.imageBuffer, {
                    contentType: result.mimeType,
                    upsert: true
                });

                await supabase.from('book_media').upsert({
                    book_id: bookId,
                    media_type: 'image',
                    path: storagePath,
                    after_word_index: scene.after_word_index,
                    metadata: {
                        caption: `Illustration for scene ${i + 1}`,
                        alt: scene.image_prompt
                    },
                    owner_user_id: story.owner_user_id
                }, { onConflict: 'book_id,path' });

                results.push({ sceneIndex: i, storagePath });
            } catch (err) {
                console.error(`Failed to generate image for scene ${i}:`, err);
                results.push({ sceneIndex: i, error: (err as Error).message });
            }
        }

        // Mark the book as completed if we processed all scenes, regardless of individual image failures.
        // This ensures the user can at least read the story and see the successful images.
        if (sceneIndex === undefined) {
            await storyRepo.updateStoryStatus(bookId, 'completed');
            
            const anyFailed = results.some(r => r.error);
            if (anyFailed) {
                console.warn(`Book ${bookId} marked as completed with partial failures.`, results.filter(r => r.error));
            } else {
                console.log(`Book ${bookId} marked as completed (all ${results.length} images generated).`);
            }
        }

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        console.error("Image generation API error:", error);
        return NextResponse.json({ error: error.message || "Failed to generate images" }, { status: 500 });
    }
}
