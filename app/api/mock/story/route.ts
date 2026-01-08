import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { Tokenizer } from "@/lib/core/books/tokenizer";
import { TextChunker } from "@/lib/core/books/text-chunker";
import { PollyNarrationService } from "@/lib/features/narration/polly-service.server";
import { alignSpeechMarksToTokens, getWordTokensForChunk } from "@/lib/core/books/speech-mark-aligner";
import { createClient as createAuthClient } from "@/lib/supabase/server";
import { StoryRepository } from "@/lib/core/stories/repository.server";

export async function POST(req: Request) {

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const authClient = createAuthClient();
    const { data: { user } } = await authClient.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized. Please sign in to create stories." }, { status: 401 });
    }

    // Use regular client for RLS-aware lookups where possible, but we need service role for mock writes
    const userSupabase = authClient;

    try {
        const body = await req.json();
        const { words, childId, userProfile } = body || {};

        const ownerUserId = user.id;

        // 0. Input Validation (Parity with production)
        if (childId && (typeof childId !== 'string' || !/^[0-9a-f-]{36}$/i.test(childId))) {
            return NextResponse.json({ error: "Invalid childId format" }, { status: 400 });
        }

        if (words && (!Array.isArray(words) || words.length > 10)) {
            return NextResponse.json({ error: "Provide up to 10 words" }, { status: 400 });
        }

        // Fetch child profile if childId is provided - VALIDATE OWNERSHIP
        let child = null;
        if (childId) {
            const { data, error: childError } = await userSupabase
                .from('children')
                .select('*')
                .eq('id', childId)
                .single(); // RLS handles owner_user_id check

            if (childError || !data) {
                return NextResponse.json({ error: "Child profile not found or unauthorized" }, { status: 404 });
            }
            child = data;
        }

        let childAvatar = null;
        if (child) {
            const { avatar_paths: avatarPaths, primary_avatar_index: primaryAvatarIndex } = child;
            childAvatar = (avatarPaths && avatarPaths.length > 0)
                ? (avatarPaths[primaryAvatarIndex ?? 0] || avatarPaths[0])
                : null;
        }

        // Handle custom photo override from userProfile
        if (userProfile?.avatarUrl && userProfile.avatarUrl.startsWith('data:image/')) {
            const MAX_OVERRIDE_SIZE = 5 * 1024 * 1024; // 5MB limit
            const matches = userProfile.avatarUrl.match(/^data:(image\/(\w+));base64,(.+)$/);

            if (!matches) {
                return NextResponse.json({ error: "Invalid photo format." }, { status: 400 });
            }

            const mimeType = matches[1];
            const ext = matches[2] === 'jpeg' ? 'jpg' : matches[2];
            const base64Data = matches[3];
            const buffer = Buffer.from(base64Data, 'base64');

            if (buffer.length > MAX_OVERRIDE_SIZE) {
                return NextResponse.json({ error: "Photo is too large (max 5MB)." }, { status: 400 });
            }

            // Only allow common image types
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!allowedTypes.includes(mimeType)) {
                return NextResponse.json({ error: "Unsupported image type." }, { status: 400 });
            }

            try {
                const timestamp = Date.now();
                const randomId = crypto.randomUUID().split('-')[0];
                const storagePath = `${user?.id || 'mock'}/story-overrides/${childId || 'anonymous'}/${timestamp}-${randomId}.${ext}`;

                const { error: uploadError } = await supabase.storage
                    .from('user-assets')
                    .upload(storagePath, buffer, {
                        contentType: mimeType,
                        upsert: true
                    });

                if (uploadError) {
                    console.error("Failed to upload mock story photo override:", uploadError);
                    return NextResponse.json({ error: "Failed to upload photo." }, { status: 500 });
                }

                childAvatar = storagePath;
            } catch (err) {
                console.error("Error processing custom photo override in mock:", err);
                return NextResponse.json({ error: "Error processing photo." }, { status: 500 });
            }
        }

        const mockPath = path.join(process.cwd(), 'data', 'mock', 'response.json');

        if (!fs.existsSync(mockPath)) {
            return NextResponse.json({ error: "Mock data file not found" }, { status: 404 });
        }

        const rawText = fs.readFileSync(mockPath, 'utf8').trim();
        const data = JSON.parse(rawText);

        // Security: Ensure mock data also respects prompt conventions
        for (const scene of data.scenes) {
            if (!scene.image_prompt.includes("[1]")) {
                scene.image_prompt = `[1] ${scene.image_prompt}`; // Auto-fix mock data if missing
            }
        }

        const bookId = crypto.randomUUID();

        // Reconstruct full content from scenes to ensure indices align perfectly.
        const fullContent = data.scenes.map((s: any) => s.text).join('\n\n');
        const tokens = Tokenizer.tokenize(fullContent);
        const voiceId = process.env.POLLY_VOICE_ID || 'Kevin';

        // Calculate scene indices
        let currentWordIndex = 0;
        const scenesWithIndices = data.scenes.map((scene: any) => {
            const sceneTokens = Tokenizer.tokenize(scene.text);
            const wordCount = Tokenizer.getWords(sceneTokens).length;
            const afterWordIndex = currentWordIndex + wordCount - 1;
            currentWordIndex += wordCount;
            return { ...scene, after_word_index: afterWordIndex };
        });

        const bookKey = `${data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.random().toString(36).substring(2, 7)}`;

        const { data: book, error: bookError } = await supabase
            .from('books')
            .upsert({
                id: bookId,
                book_key: bookKey,
                owner_user_id: ownerUserId,
                title: data.title,
                origin: 'user_generated',
                voice_id: voiceId,
                total_tokens: tokens.length,
                metadata: { isMock: true }
            })
            .select()
            .single();

        if (bookError) throw bookError;

        // Create Book Content
        const { error: contentError } = await supabase
            .from('book_contents')
            .upsert({
                book_id: bookId,
                tokens,
                full_text: fullContent
            });

        if (contentError) throw contentError;

        const storyRepo = new StoryRepository(supabase);
        await storyRepo.createStory({
            id: book.id,
            owner_user_id: ownerUserId,
            child_id: childId,
            main_character_description: data.mainCharacterDescription,
            scenes: scenesWithIndices,
            status: 'generating',
            avatar_url: childAvatar
        });

        (async () => {
            try {
                const textChunks = TextChunker.chunk(fullContent);
                const polly = new PollyNarrationService();

                for (const chunk of textChunks) {
                    const { audioBuffer, speechMarks } = await polly.synthesize(chunk.text);
                    const storagePath = `${book.id}/audio/${voiceId}/${chunk.index}.mp3`;

                    await supabase.storage.from('book-assets').upload(storagePath, audioBuffer, {
                        contentType: 'audio/mpeg',
                        upsert: true
                    });

                    const wordTokensForChunk = getWordTokensForChunk(tokens, chunk.startWordIndex, chunk.endWordIndex);
                    const alignedTimings = alignSpeechMarksToTokens(speechMarks, wordTokensForChunk);

                    await supabase.from('book_audios').upsert({
                        book_id: book.id,
                        chunk_index: chunk.index,
                        start_word_index: chunk.startWordIndex,
                        end_word_index: chunk.endWordIndex,
                        audio_path: storagePath,
                        timings: alignedTimings,
                        voice_id: voiceId
                    }, { onConflict: 'book_id,chunk_index,voice_id' });
                }

                await storyRepo.updateStoryStatus(book.id, 'completed');
            } catch (err) {
                console.error(`Mock Sharding failed:`, err);
                await storyRepo.updateStoryStatus(book.id, 'failed').catch(e => console.error(e));
            }
        })();

        return NextResponse.json({
            ...data,
            scenes: scenesWithIndices,
            book_id: book.id,
            tokens: tokens
        });
    } catch (error: any) {
        console.error("Mock Story API error:", error);
        return NextResponse.json({ error: "Failed to load mock story: " + error.message }, { status: 500 });
    }
}
