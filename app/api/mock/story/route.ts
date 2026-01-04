import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { Tokenizer } from "@/lib/core/books/tokenizer";
import { TextChunker } from "@/lib/core/books/text-chunker";
import { PollyNarrationService } from "@/lib/features/narration/polly-service.server";
import { alignSpeechMarksToTokens, getWordTokensForChunk } from "@/lib/core/books/speech-mark-aligner";

import { createClient as createAuthClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
    console.log("Mock Mode: Returning Ginger the Giraffe story from dedicated mock endpoint and persisting to Supabase");

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get current user for owner_user_id
    const authClient = createAuthClient();
    const { data: { user } } = await authClient.auth.getUser();

    try {
        const { words, userProfile } = await req.json();
        const ownerId = user?.id || null;
        const mockPath = path.join(process.cwd(), 'data', 'mock', 'response.json');

        if (!fs.existsSync(mockPath)) {
            return NextResponse.json({ error: "Mock data file not found" }, { status: 404 });
        }

        const rawText = fs.readFileSync(mockPath, 'utf8').trim();
        const data = JSON.parse(rawText);
        const bookId = crypto.randomUUID();

        // --- 1. Prepare Images (Pre-upload mock images for convenience in mock mode) ---
        const tokens = Tokenizer.tokenize(data.content);
        const voiceId = process.env.POLLY_VOICE_ID || 'Kevin';
        const bookImages: any[] = [];

        // Calculate after_word_index for each scene and prepare images
        let currentWordIndex = 0;
        const scenesWithIndices = data.scenes.map((scene: any, index: number) => {
            const sceneTokens = Tokenizer.tokenize(scene.text);
            const wordCount = Tokenizer.getWords(sceneTokens).length;
            const afterWordIndex = currentWordIndex + wordCount - 1;
            currentWordIndex += wordCount;

            // Map mock images (1.png to 5.png)
            const imageNumber = (index % 5) + 1;
            const mockImagePath = `${bookId}/images/scene-${index + 1}.png`;
            const localMockPath = path.join(process.cwd(), 'data', 'mock', `${imageNumber}.png`);

            if (fs.existsSync(localMockPath)) {
                bookImages.push({
                    id: crypto.randomUUID(),
                    src: mockImagePath,
                    afterWordIndex: afterWordIndex,
                    caption: `Illustration for scene ${index + 1}`,
                    alt: scene.image_prompt
                });
            }

            return {
                ...scene,
                after_word_index: afterWordIndex
            };
        });

        // Upload images to storage concurrently
        await Promise.all(bookImages.map(async (img, idx) => {
            const localPath = path.join(process.cwd(), 'data', 'mock', `${(idx % 5) + 1}.png`);
            const buffer = fs.readFileSync(localPath);
            await supabase.storage.from('book-assets').upload(img.src, buffer, {
                contentType: 'image/png',
                upsert: true
            });

            // Also add to book_media for consistency
            await supabase.from('book_media').upsert({
                book_id: bookId,
                owner_user_id: ownerId,
                media_type: 'image',
                path: img.src,
                after_word_index: img.afterWordIndex,
                metadata: {
                    caption: img.caption,
                    alt: img.alt,
                    isMock: true
                }
            }, { onConflict: 'book_id,path' });
        }));

        const bookKey = `${data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.random().toString(36).substring(2, 7)}`;

        const { data: book, error: bookError } = await supabase
            .from('books')
            .upsert({
                id: bookId,
                book_key: bookKey,
                owner_user_id: ownerId,
                title: data.title,
                text: data.content,
                images: bookImages, // Populated with mock images
                tokens: tokens,
                origin: 'user_generated',
                schema_version: 2,
                voice_id: voiceId,
                metadata: {
                    userProfile,
                    wordsUsed: words,
                    mainCharacterDescription: data.mainCharacterDescription,
                    scenes: scenesWithIndices,
                    isMock: true
                }
            })
            .select()
            .single();

        if (bookError) throw bookError;

        // --- 2. Generate Narration Shards (Background) ---
        (async () => {
            try {
                const textChunks = TextChunker.chunk(data.content);
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
                        owner_user_id: ownerId,
                        chunk_index: chunk.index,
                        start_word_index: chunk.startWordIndex,
                        end_word_index: chunk.endWordIndex,
                        audio_path: storagePath,
                        timings: alignedTimings,
                        voice_id: voiceId
                    }, { onConflict: 'book_id,chunk_index,voice_id' });
                }
                console.log(`Mock Sharding complete for book ${book.id}`);
            } catch (err) {
                console.error(`Mock Sharding failed for book ${book.id}:`, err);
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
