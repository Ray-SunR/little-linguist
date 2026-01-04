import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Tokenizer } from "@/lib/core/books/tokenizer";
import { TextChunker } from "@/lib/core/books/text-chunker";
import { PollyNarrationService } from "@/lib/features/narration/polly-service.server";
import { alignSpeechMarksToTokens, getWordTokensForChunk } from "@/lib/core/books/speech-mark-aligner";

import { createClient as createAuthClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return NextResponse.json({ error: "API Key missing on server" }, { status: 500 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get current user for owner_user_id
    const authClient = createAuthClient();
    const { data: { user } } = await authClient.auth.getUser();

    try {
        const { words, userProfile } = await req.json();
        const { name, age, gender } = userProfile;
        const wordsList = words.join(", ");
        const bookId = crypto.randomUUID();
        const ownerId = user?.id || null;

        // --- 1. Handle User Photo Upload ---
        let finalUserProfile = { ...userProfile };
        if (userProfile.avatarUrl && userProfile.avatarUrl.startsWith('data:')) {
            try {
                const base64Data = userProfile.avatarUrl.split(',')[1];
                const buffer = Buffer.from(base64Data, 'base64');
                const photoPath = `${bookId}/user-uploads/seed-photo.png`;

                await supabase.storage.from('book-assets').upload(photoPath, buffer, {
                    contentType: 'image/png',
                    upsert: true
                });

                finalUserProfile.avatarUrl = photoPath; // Store relative path in DB
            } catch (err) {
                console.error("Failed to upload user photo:", err);
            }
        }

        const systemInstruction = "You are a creative storyteller for children. You output structured JSON stories with scene-by-scene descriptions for illustrators.";
        const userPrompt = `Write a short, engaging children's story for a ${age}-year-old ${gender} named ${name}.
The story MUST include the following words: ${wordsList}.
Split the story into exactly 5 distinct scenes.

For the JSON output:
1. In the "text" field: Use the name "${name}" naturally to tell the story.
2. In the "image_prompt" field: ALWAYS use the placeholder "[1]" to represent the main character ${name}. Do NOT use the name "${name}" in image prompts. ALWAYS start the image_prompt with "[1]" doing an action. Example: "[1] is running through a forest" or "[1] looks up at the stars".

IMPORTANT: Every image_prompt MUST contain "[1]" at least once. This is critical for the illustrator.

Also, provide a "mainCharacterDescription" which is a consistent physical description of ${name} (e.g., "A 6-year-old boy with curly brown hair wearing a green t-shirt").

The story should be fun, educational, and age-appropriate.`;

        const genAI = new GoogleGenAI({ apiKey });
        const response = await genAI.models.generateContent({
            model: "gemini-2.0-flash-exp",
            contents: userPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        content: { type: Type.STRING, description: "A full text version of the story" },
                        mainCharacterDescription: { type: Type.STRING },
                        scenes: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    text: { type: Type.STRING },
                                    image_prompt: { type: Type.STRING }
                                },
                                required: ["text", "image_prompt"]
                            }
                        }
                    },
                    required: ["title", "content", "scenes", "mainCharacterDescription"]
                },
                systemInstruction: systemInstruction,
                temperature: 0.8,
            }
        });

        const data = JSON.parse(response.text || '{}');

        // --- 2. Persist Story to Database ---
        const tokens = Tokenizer.tokenize(data.content);
        const voiceId = process.env.POLLY_VOICE_ID || 'Kevin';

        // Calculate after_word_index for each scene
        let currentWordIndex = 0;
        const scenesWithIndices = data.scenes.map((scene: any) => {
            const sceneTokens = Tokenizer.tokenize(scene.text);
            const wordCount = Tokenizer.getWords(sceneTokens).length;
            const afterWordIndex = currentWordIndex + wordCount - 1;
            currentWordIndex += wordCount;
            return {
                ...scene,
                after_word_index: afterWordIndex
            };
        });

        const bookKey = `${data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.random().toString(36).substring(2, 7)}`;

        const { data: book, error: bookError } = await supabase
            .from('books')
            .upsert({
                id: bookId,
                book_key: bookKey,
                owner_user_id: ownerId,
                title: data.title,
                text: data.content,
                images: [], // Required by schema
                tokens: tokens,
                origin: 'user_generated',
                schema_version: 2,
                voice_id: voiceId,
                metadata: {
                    userProfile: finalUserProfile,
                    wordsUsed: words,
                    mainCharacterDescription: data.mainCharacterDescription,
                    scenes: scenesWithIndices,
                    generationOptions: {
                        name,
                        age,
                        gender,
                        words
                    },
                    prompts: {
                        system: systemInstruction,
                        user: userPrompt
                    }
                }
            })
            .select()
            .single();

        if (bookError) throw bookError;

        // --- 3. Generate Narration Shards (Background-ish but sequentially for simplicity) ---
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
                console.log(`Sharding complete for book ${book.id}`);
            } catch (err) {
                console.error(`Sharding failed for book ${book.id}:`, err);
            }
        })();

        return NextResponse.json({
            ...data,
            scenes: scenesWithIndices,
            book_id: book.id,
            tokens: tokens
        });

    } catch (error: any) {
        console.error("Gemini Story API error:", error);
        return NextResponse.json({ error: error.message || "Failed to generate story" }, { status: 500 });
    }
}
