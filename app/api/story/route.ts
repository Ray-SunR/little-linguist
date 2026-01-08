import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Tokenizer } from "@/lib/core/books/tokenizer";
import { TextChunker } from "@/lib/core/books/text-chunker";
import { PollyNarrationService } from "@/lib/features/narration/polly-service.server";
import { alignSpeechMarksToTokens, getWordTokensForChunk } from "@/lib/core/books/speech-mark-aligner";
import { createClient as createAuthClient } from "@/lib/supabase/server";
import { StoryRepository } from "@/lib/core/stories/repository.server";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return NextResponse.json({ error: "API Key missing on server" }, { status: 500 });
    }

    const authClient = createAuthClient();
    const { data: { user } } = await authClient.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized. Please sign in to create stories." }, { status: 401 });
    }

    // Use user-scoped client for most operations to respect RLS
    const supabase = authClient;

    try {
        // We'll need the service role client ONLY for background operations 
        // Guard env vars to fail gracefully
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !supabaseServiceKey) {
            console.error("Missing Supabase env vars for service role client");
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }
        const serviceRoleClient = createClient(supabaseUrl, supabaseServiceKey);

        const body = await req.json();
        const { words, childId, userProfile } = body || {};

        // 0. Input Validation
        if (!childId || typeof childId !== 'string' || !/^[0-9a-f-]{36}$/i.test(childId)) {
            return NextResponse.json({ error: "Valid childId is required" }, { status: 400 });
        }

        if (!Array.isArray(words) || words.length > 10) {
            return NextResponse.json({ error: "Provide up to 10 words" }, { status: 400 });
        }

        if (words.some(w => typeof w !== 'string' || w.length > 30)) {
            return NextResponse.json({ error: "Each word must be a string under 30 characters" }, { status: 400 });
        }

        // 1. Fetch child profile
        const { data: child, error: childError } = await supabase
            .from('children')
            .select('*')
            .eq('id', childId)
            .single(); // RLS will handle owner_user_id ownership

        if (childError || !child) {
            return NextResponse.json({ error: "Child profile not found" }, { status: 404 });
        }

        const { first_name: dbName, age: dbAge, gender: dbGender, avatar_paths: avatarPaths, primary_avatar_index: primaryAvatarIndex } = child;

        // Use userProfile from request as priority, fallback to DB
        const name = userProfile?.name || dbName;
        const age = userProfile?.age || dbAge;
        const gender = userProfile?.gender || dbGender;
        const topic = userProfile?.topic;
        const setting = userProfile?.setting;

        let childAvatar = (avatarPaths && avatarPaths.length > 0)
            ? (avatarPaths[primaryAvatarIndex ?? 0] || avatarPaths[0])
            : null;

        // Handle custom photo override from userProfile
        if (userProfile?.avatarUrl && userProfile.avatarUrl.startsWith('data:image/')) {
            const MAX_OVERRIDE_SIZE = 5 * 1024 * 1024; // 5MB limit
            const matches = userProfile.avatarUrl.match(/^data:(image\/(\w+));base64,(.+)$/);

            if (!matches) {
                return NextResponse.json({ error: "Invalid photo format. Please provide a standard image." }, { status: 400 });
            }

            const mimeType = matches[1];
            const ext = matches[2] === 'jpeg' ? 'jpg' : matches[2];
            const base64Data = matches[3];
            const buffer = Buffer.from(base64Data, 'base64');

            if (buffer.length > MAX_OVERRIDE_SIZE) {
                return NextResponse.json({ error: "Photo is too large. Please use an image under 5MB." }, { status: 400 });
            }

            // Only allow common image types
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!allowedTypes.includes(mimeType)) {
                return NextResponse.json({ error: "Unsupported image type. Please use JPG, PNG, or WEBP." }, { status: 400 });
            }

            try {
                const timestamp = Date.now();
                const randomId = crypto.randomUUID().split('-')[0];
                const storagePath = `${user.id}/story-overrides/${childId}/${timestamp}-${randomId}.${ext}`;

                const { error: uploadError } = await serviceRoleClient.storage
                    .from('user-assets')
                    .upload(storagePath, buffer, {
                        contentType: mimeType,
                        upsert: true
                    });

                if (uploadError) {
                    console.error("Failed to upload story photo override:", uploadError);
                    return NextResponse.json({ error: "Failed to upload your custom photo. Please try again." }, { status: 500 });
                }

                childAvatar = storagePath;
            } catch (err) {
                console.error("Error processing custom photo override:", err);
                return NextResponse.json({ error: "Error processing your custom photo." }, { status: 500 });
            }
        }

        const wordsList = words.join(", ");
        const bookId = crypto.randomUUID();
        const ownerUserId = user.id;

        const systemInstruction = "You are a creative storyteller for children. You output structured JSON stories with scene-by-scene descriptions for illustrators.";
        const userPrompt = `Write a short, engaging children's story for a ${age}-year-old ${gender} named ${name}.
${topic ? `The story topic is: ${topic}.` : ''}
${setting ? `The story setting is: ${setting}.` : ''}
${wordsList ? `The story MUST include the following words: ${wordsList}.` : ''}
Split the story into exactly 2 distinct scenes.

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

        // 1.5 Validate LLM output structure
        if (!data.title || !data.content || !data.mainCharacterDescription || !Array.isArray(data.scenes) || data.scenes.length === 0) {
            console.error("Malformed LLM response:", data);
            return NextResponse.json({ error: "The storyteller had a hiccup. Please try again!" }, { status: 502 });
        }

        // Validate each scene and enforce character placeholder
        const nameRegex = new RegExp(`\\b${name}\\b`, 'gi');
        for (const scene of data.scenes) {
            if (typeof scene.text !== 'string' || typeof scene.image_prompt !== 'string') {
                console.error("Invalid scene data:", scene);
                return NextResponse.json({ error: "The storyteller provided incomplete scenes. Please try again!" }, { status: 502 });
            }

            // Scrub name from image prompts and ensure [1] is present
            if (!scene.image_prompt.includes("[1]")) {
                scene.image_prompt = `[1] ${scene.image_prompt}`;
            }

            // Replace any explicit mentions of the name with [1]
            scene.image_prompt = scene.image_prompt.replace(nameRegex, "[1]");
        }

        // Reconstruct full content from scenes to ensure indices align perfectly.
        const fullContent = data.scenes.map((s: any) => s.text).join('\n\n');
        const tokens = Tokenizer.tokenize(fullContent);
        const voiceId = process.env.POLLY_VOICE_ID || 'Kevin';

        let currentWordIndex = 0;
        const scenesWithIndices = data.scenes.map((scene: any) => {
            const sceneTokens = Tokenizer.tokenize(scene.text);
            const wordCount = Tokenizer.getWords(sceneTokens).length;
            const afterWordIndex = currentWordIndex + wordCount - 1;
            currentWordIndex += wordCount;
            return { ...scene, after_word_index: afterWordIndex };
        });

        const bookKey = `${data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.random().toString(36).substring(2, 7)}`;

        // 2. Create Book Metadata
        const { data: book, error: bookError } = await serviceRoleClient
            .from('books')
            .upsert({
                id: bookId,
                book_key: bookKey,
                owner_user_id: ownerUserId,
                title: data.title,
                origin: 'user_generated',
                voice_id: voiceId,
                total_tokens: tokens.length,
                child_id: childId,
                schema_version: 2,
                metadata: {
                    isAIGenerated: true,
                    scenes: scenesWithIndices,
                    mainCharacterDescription: data.mainCharacterDescription
                }
            })
            .select()
            .single();

        if (bookError) throw bookError;

        // 3. Create Book Content (HEAVY)
        const { error: contentError } = await serviceRoleClient
            .from('book_contents')
            .upsert({
                book_id: bookId,
                tokens,
                full_text: fullContent
            });

        if (contentError) throw contentError;

        // 4. Create Story Record
        const storyRepo = new StoryRepository(serviceRoleClient);
        await storyRepo.createStory({
            id: book.id,
            owner_user_id: ownerUserId,
            child_id: childId,
            main_character_description: data.mainCharacterDescription,
            scenes: scenesWithIndices,
            status: 'generating',
            avatar_url: childAvatar
        });

        // 5. Background Narration (uses service-role since user context is lost)
        const bgStoryRepo = new StoryRepository(serviceRoleClient);
        (async () => {
            try {
                const textChunks = TextChunker.chunk(fullContent);
                const polly = new PollyNarrationService();

                for (const chunk of textChunks) {
                    const { audioBuffer, speechMarks } = await polly.synthesize(chunk.text);
                    const storagePath = `${book.id}/audio/${voiceId}/${chunk.index}.mp3`;

                    await serviceRoleClient.storage.from('book-assets').upload(storagePath, audioBuffer, {
                        contentType: 'audio/mpeg',
                        upsert: true
                    });

                    const wordTokensForChunk = getWordTokensForChunk(tokens, chunk.startWordIndex, chunk.endWordIndex);
                    const alignedTimings = alignSpeechMarksToTokens(speechMarks, wordTokensForChunk);

                    await serviceRoleClient.from('book_audios').upsert({
                        book_id: book.id,
                        chunk_index: chunk.index,
                        start_word_index: chunk.startWordIndex,
                        end_word_index: chunk.endWordIndex,
                        audio_path: storagePath,
                        timings: alignedTimings,
                        voice_id: voiceId
                    }, { onConflict: 'book_id,chunk_index,voice_id' });
                }

                await bgStoryRepo.updateStoryStatus(book.id, 'completed');
            } catch (err) {
                console.error(`Background processing failed:`, err);
                await bgStoryRepo.updateStoryStatus(book.id, 'failed').catch(e => console.error("Failed to set failure status", e));
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
