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
    console.log("Mock Mode: Returning story and persisting to `books` and `stories` tables");

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const authClient = createAuthClient();
    const { data: { user } } = await authClient.auth.getUser();

    try {
        const { words, userProfile } = await req.json();
        const { name, age, gender } = userProfile;
        const ownerId = user?.id || null;
        const mockPath = path.join(process.cwd(), 'data', 'mock', 'response.json');

        if (!fs.existsSync(mockPath)) {
            return NextResponse.json({ error: "Mock data file not found" }, { status: 404 });
        }

        const rawText = fs.readFileSync(mockPath, 'utf8').trim();
        const data = JSON.parse(rawText);
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
                owner_user_id: ownerId,
                title: data.title,
                text: fullContent,
                images: [],
                tokens: tokens,
                origin: 'user_generated',
                schema_version: 2,
                voice_id: voiceId,
                metadata: { isMock: true }
            })
            .select()
            .single();

        if (bookError) throw bookError;

        const storyRepo = new StoryRepository(supabase);
        await storyRepo.createStory({
            id: book.id,
            owner_user_id: ownerId,
            child_name: name,
            child_age: age,
            child_gender: gender,
            words_used: words,
            main_character_description: data.mainCharacterDescription,
            scenes: scenesWithIndices,
            status: 'generating',
            avatar_url: userProfile.avatarUrl // In mock, we might just pass the URL string
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
                        owner_user_id: ownerId,
                        chunk_index: chunk.index,
                        start_word_index: chunk.startWordIndex,
                        end_word_index: chunk.endWordIndex,
                        audio_path: storagePath,
                        timings: alignedTimings,
                        voice_id: voiceId
                    }, { onConflict: 'book_id,chunk_index,voice_id' });
                }

                await storyRepo.updateStoryStatus(book.id, 'completed');
                console.log(`Mock Sharding and status update complete for book ${book.id}`);
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
