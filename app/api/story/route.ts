import { GoogleGenAI, Type } from "@google/genai";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { AuditService, AuditAction, EntityType } from "@/lib/features/audit/audit-service.server";
import { Tokenizer } from "@/lib/core/books/tokenizer";
import { TextChunker } from "@/lib/core/books/text-chunker";
import { PollyNarrationService } from "@/lib/features/narration/polly-service.server";
import { alignSpeechMarksToTokens, getWordTokensForChunk } from "@/lib/core/books/speech-mark-aligner";
import { createClient as createAuthClient } from "@/lib/supabase/server";
import { StoryRepository } from "@/lib/core/stories/repository.server";
import {
    getOrCreateIdentity,
    reserveCredits,
    refundCredits,
    UsageIdentity
} from "@/lib/features/usage/usage-service.server";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return NextResponse.json({ error: "API Key missing on server" }, { status: 500 });
    }

    const authClient = createAuthClient();
    let { data: { user } } = await authClient.auth.getUser();

    // We'll need the service role client ONLY for background operations 
    // Guard env vars to fail gracefully
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
        console.error("Missing Supabase env vars for service role client");
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }
    const serviceRoleClient = createClient(supabaseUrl, supabaseServiceKey);

    // [TEST MODE] Bypassing auth for integration tests in development
    if (!user && process.env.NODE_ENV === 'development') {
        const testUserId = req.headers.get('x-test-user-id');
        if (testUserId) {
            console.warn(`[TEST MODE] Bypassing auth for user: ${testUserId}`);
            const { data: adminUser } = await serviceRoleClient.auth.admin.getUserById(testUserId);
            if (adminUser?.user) user = adminUser.user;
        }
    }

    if (!user) {
        return NextResponse.json({ error: "Unauthorized. Please sign in to create stories." }, { status: 401 });
    }

    // Use user-scoped client for most operations to respect RLS
    // Note: if test mode bypass was used, RLS might still fail unless we use serviceRoleClient
    // for subsequent calls. For safety in test mode, we'll swap supabase to serviceRoleClient
    // ONLY if the bypass was active.
    const isTestBypass = !!req.headers.get('x-test-user-id') && process.env.NODE_ENV === 'development';
    const supabase = isTestBypass ? serviceRoleClient : authClient;

    // Scoped variable for refunding in catch block
    let identity: UsageIdentity | null = null;
    let storyLengthMinutes = 5;

    try {
        const body = await req.json();
        const { words, childId, userProfile, storyLengthMinutes: reqStoryLength = 5, imageSceneCount: reqImageCount, idempotencyKey } = body || {};

        // Coerce and validate story length (Minutes)
        // User requested 1-10 minutes range
        const parsedStoryLength = Number(reqStoryLength);
        if (!Number.isFinite(parsedStoryLength)) {
            return NextResponse.json({ error: "Invalid storyLength" }, { status: 400 });
        }
        storyLengthMinutes = Math.min(Math.max(parsedStoryLength, 1), 10);

        // Map minutes to target word count (~130 WPM baseline for children stories)
        const targetWordCount = storyLengthMinutes * 130;

        // Number of sections is derived from minutes (1 section per minute)
        const totalSections = storyLengthMinutes;

        // Validate Image Scene Count
        // Default to totalSections if not provided
        let imageSceneCount = reqImageCount !== undefined ? Number(reqImageCount) : totalSections;
        if (!Number.isFinite(imageSceneCount)) {
            imageSceneCount = totalSections;
        }
        // Ensure imageSceneCount does not exceed totalSections
        imageSceneCount = Math.min(Math.max(imageSceneCount, 0), totalSections);

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

        const ownerUserId = user.id;
        const isTestMode = process.env.TEST_MODE === 'true';

        // 1.1 Determine the avatar to use (Priority: Storage Path > DB Default)
        let childAvatar = userProfile?.avatarStoragePath || null;

        if (childAvatar) {
            // SECURITY: Validate that the avatar belongs to the user or the child
            const isOwnedByUser = childAvatar.startsWith(`${ownerUserId}/`);
            const isChildAsset = avatarPaths?.includes(childAvatar);

            if (!isOwnedByUser && !isChildAsset) {
                console.warn(`[Security] Invalid avatar path attempted: ${childAvatar}. User: ${ownerUserId}`);
                childAvatar = null;
            }
        }

        // If no override was provided (or it was invalid/rejected), fallback to child's primary avatar
        if (!childAvatar) {
            childAvatar = (avatarPaths && avatarPaths.length > 0)
                ? (avatarPaths[primaryAvatarIndex ?? 0] || avatarPaths[0])
                : null;
        }

        const wordsList = words.join(", ");
        const bookId = crypto.randomUUID();

        const systemInstruction = "You are a creative storyteller for children. You output structured JSON stories with section-by-section descriptions. You must strictly follow the requested number of image scenes.";

        // Determine complexity based on age
        let complexityInstruction = "The story should be fun, educational, and age-appropriate.";
        if (age <= 5) {
            complexityInstruction = "Use simple, rhythmic, and repetitive text with short sentences which are perfect for early readers.";
        } else if (age <= 8) {
            complexityInstruction = "Write an engaging adventure with moderate vocabulary suitable for elementary schoolers.";
        } else {
            complexityInstruction = "Create a more complex narrative with richer vocabulary and deeper themes suitable for older children.";
        }

        const userPrompt = `Write a children's story for a ${age}-year-old ${gender} named ${name}. 
The story SHOULD BE AT LEAST ${targetWordCount} words long. This is a ${storyLengthMinutes}-minute story, so ensure each of the ${totalSections} sections is descriptive and substantial (approx. ${Math.round(targetWordCount / totalSections)} words per section).
${topic ? `The story topic is: ${topic}.` : ''}
${setting ? `The story setting is: ${setting}.` : ''}
${wordsList ? `The story MUST include the following words: ${wordsList}.` : ''}
${complexityInstruction}

Split the story into exactly ${totalSections} distinct sections.

For the JSON output:
1. In the "text" field: Use the name "${name}" naturally to tell the story. Each section should be a paragraph of approximately ${Math.round(targetWordCount / totalSections)} words.
2. In the "image_scenes" array: 
   - You MUST provide EXACTLY ${imageSceneCount} items in this array.
   - Each item must have a 'section_index' (the index of the section in the 'sections' array it belongs to, 0 to ${totalSections - 1}).
   - Each item must have an 'image_prompt'.
   - ALWAYS use the placeholder "[1]" to represent the main character ${name} in the 'image_prompt'. Do NOT use the name "${name}".
   - ALWAYS start the 'image_prompt' with "[1]" doing an action. Example: "[1] is running through a forest".

IMPORTANT INSTRUCTION FOR IMAGES:
1. The 'image_scenes' array MUST have a length of EXACTLY ${imageSceneCount}.
2. Distribute these ${imageSceneCount} illustrations at regular intervals throughout the ${totalSections} sections.
3. Every 'image_prompt' MUST contain "[1]" at least once.

Also, provide a "mainCharacterDescription" which is a consistent physical description of ${name} (e.g., "A 6-year-old boy with curly brown hair wearing a green t-shirt").

FINAL RECAP:
- Total Sections (in 'sections' array): ${totalSections}
- Total Illustrations (in 'image_scenes' array): ${imageSceneCount}
- Target Total Words: ${targetWordCount}`;

        // 1.5 Usage Tracking & Quotas (Executed BEFORE expensive AI generation)
        identity = await getOrCreateIdentity(user);

        // Use atomic batch reservation to prevent race conditions and partial commits
        const reservationResult = isTestMode
            ? { success: true }
            : await reserveCredits(identity, [
                { featureName: "story_generation", increment: 1, childId, metadata: { book_id: bookId }, idempotencyKey, entityId: bookId, entityType: 'story' },
                { featureName: "image_generation", increment: imageSceneCount, childId, metadata: { book_id: bookId }, idempotencyKey, entityId: bookId, entityType: 'story' }
            ]);

        if (!reservationResult.success) {
            const errorMsg = reservationResult.error || "";
            const isLimitError = errorMsg.includes("LIMIT_REACHED");
            const isImageError = errorMsg.includes("image_generation");

            if (isLimitError) {
                if (isImageError) {
                    return NextResponse.json({
                        error: "IMAGE_LIMIT_REACHED",
                        message: `You don't have enough energy to generate ${imageSceneCount} images!`,
                    }, { status: 403 });
                }

                return NextResponse.json({
                    error: "LIMIT_REACHED",
                    message: "You have reached your daily story limit!",
                }, { status: 403 });
            }

            // If reservation failed but NOT because of a limit, it's a system error
            console.error("[StoryAPI] Usage reservation failed:", reservationResult.error);
            return NextResponse.json({
                error: "SYSTEM_ERROR",
                message: "Failed to reserve credits. Please try again."
            }, { status: 500 });
        }

        // Audit: Generation Started
        console.info("[StoryAPI] Logging STORY_STARTED...");
        await AuditService.log({
            action: AuditAction.STORY_STARTED,
            entityType: EntityType.STORY,
            userId: ownerUserId,
            identityKey: identity?.identity_key,
            childId: childId,
            details: {
                prompt: userPrompt?.substring(0, 100),
                imageCount: imageSceneCount,
                bookId: bookId
            }
        });
        console.info("[StoryAPI] STORY_STARTED logged.");

        let creditsRefunded = 0; // Track refunds to avoid double-dipping

        try {
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
                            sections: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        text: { type: Type.STRING }
                                    },
                                    required: ["text"]
                                }
                            },
                            image_scenes: {
                                type: Type.ARRAY,
                                description: `Provide exactly ${imageSceneCount} image scenes.`,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        section_index: { type: Type.NUMBER, description: "The index of the section this image belongs to (0-based)" },
                                        image_prompt: { type: Type.STRING }
                                    },
                                    required: ["section_index", "image_prompt"]
                                }
                            }
                        },
                        required: ["title", "content", "sections", "mainCharacterDescription", "image_scenes"]
                    },
                    systemInstruction: systemInstruction,
                    temperature: 0.8,
                }
            });

            const rawPrompt = `System: ${systemInstruction}\n\nUser: ${userPrompt}`;
            const rawResponseText = response.text || '{}';
            const data = JSON.parse(rawResponseText);

            // 1.5 Validate LLM output structure
            if (!data.title || !data.content || !data.mainCharacterDescription || !Array.isArray(data.sections) || data.sections.length === 0 || !Array.isArray(data.image_scenes)) {
                console.error("Malformed LLM response:", data);
                throw new Error("The storyteller had a hiccup. Please try again!");
            }

            // Consistency Check: Ensure image_scenes map to valid indices
            let validImageScenes = data.image_scenes.filter((img: any) =>
                typeof img.section_index === 'number' &&
                img.section_index >= 0 &&
                img.section_index < data.sections.length &&
                typeof img.image_prompt === 'string' &&
                img.image_prompt.trim() !== ""
            );

            // Cap the number of images to the requested amount (Usage Protection)
            if (validImageScenes.length > imageSceneCount) {
                console.warn(`[StoryAPI] Model generated more images than requested (${validImageScenes.length}/${imageSceneCount}). Truncating.`);
                validImageScenes = validImageScenes.slice(0, imageSceneCount);
            }

            // Strong Consistency: Credit Refund if model under-generated
            const actualImageCount = validImageScenes.length;
            if (actualImageCount < imageSceneCount && !isTestMode) {
                const refundAmount = imageSceneCount - actualImageCount;
                if (refundAmount > 0) {
                    console.warn(`[StoryAPI] Model under-generated images (${actualImageCount}/${imageSceneCount}). Refunding ${refundAmount} credits.`);
                    await refundCredits(identity!, "image_generation", refundAmount, childId, { book_id: bookId }, idempotencyKey, bookId, 'story');
                    creditsRefunded += refundAmount;
                }
            }

            // Map image prompts back to sections for compatibility
            const nameRegex = new RegExp(`\\b${name}\\b`, 'gi');
            data.sections = data.sections.map((section: any, index: number) => {
                const imageRecord = validImageScenes.find((img: any) => img.section_index === index);
                let image_prompt = imageRecord?.image_prompt || "";

                if (image_prompt !== "") {
                    // Scrub name from image prompts and ensure [1] is present
                    image_prompt = image_prompt.replace(nameRegex, "[1]");
                    if (!image_prompt.includes("[1]")) {
                        image_prompt = `[1] ${image_prompt}`;
                    }
                }

                return {
                    ...section,
                    image_prompt,
                    image_status: image_prompt !== "" ? 'pending' : null,
                    retry_count: 0
                };
            });

            // Reconstruct full content from sections to ensure indices align perfectly.
            const fullContent = data.sections.map((s: any) => s.text).join('\n\n');
            const tokens = Tokenizer.tokenize(fullContent);
            const voiceId = process.env.POLLY_VOICE_ID || 'Kevin';

            let currentWordIndex = 0;
            const sectionsWithIndices = data.sections.map((section: any) => {
                const sectionTokens = Tokenizer.tokenize(section.text);
                const wordCount = Tokenizer.getWords(sectionTokens).length;
                const afterWordIndex = currentWordIndex + wordCount - 1;
                currentWordIndex += wordCount;
                return { ...section, after_word_index: afterWordIndex };
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
                    min_grade: age <= 2 ? -1 : (age <= 5 ? 0 : (age <= 8 ? 1 : 3)), // Approximate grade based on age
                    voice_id: voiceId,
                    total_tokens: tokens.length,
                    estimated_reading_time: storyLengthMinutes,
                    child_id: childId,
                    schema_version: 2,
                    metadata: {
                        isAIGenerated: true,
                        sections: sectionsWithIndices,
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
                sections: sectionsWithIndices,
                status: 'generating',
                avatar_url: childAvatar,
                story_length_minutes: storyLengthMinutes,
                image_scene_count: actualImageCount,
                child_name: name,
                child_age: age,
                child_gender: gender,
                words_used: wordsList ? wordsList.split(',').map(s => s.trim()) : [],
                raw_prompt: rawPrompt,
                raw_response: data,
                book_id: bookId
            });

            // 4.5 Initialize Child Progress Entry (in child_books)
            if (childId) {
                await serviceRoleClient
                    .from('child_books')
                    .upsert({
                        child_id: childId,
                        book_id: bookId,
                        is_completed: false,
                        is_favorite: false,
                        last_read_at: new Date().toISOString()
                    }, { onConflict: 'child_id,book_id' });
            }

            // 5. Background Narration & Image Generation
            const bgStoryRepo = new StoryRepository(serviceRoleClient);

            // Helper to log steps to the story record (Atomic via RPC)
            const logGenerationStep = async (step: string, data: any) => {
                try {
                    await serviceRoleClient.rpc('append_story_log', {
                        story_id: book.id,
                        new_log: {
                            step,
                            timestamp: new Date().toISOString(),
                            ...data
                        }
                    });
                } catch (e) {
                    console.error("Failed to log generation step:", e);
                }
            };

            waitUntil((async () => {
                try {
                    await logGenerationStep('starting_background_tasks', { actualImageCount });

                    // Narration Task
                    const textChunks = TextChunker.chunk(fullContent);
                    const polly = new PollyNarrationService();

                    for (const chunk of textChunks) {
                        const { audioBuffer, speechMarks } = await polly.synthesize(chunk.text);
                        const storagePath = `${book.id}/audio/${voiceId}/${chunk.index}.mp3`;

                        const { error: uploadError } = await serviceRoleClient.storage.from('book-assets').upload(storagePath, audioBuffer, {
                            contentType: 'audio/mpeg',
                            upsert: true
                        });

                        if (uploadError) {
                            throw new Error(`Failed to upload audio chunk ${chunk.index}: ${uploadError.message}`);
                        }

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

                    await logGenerationStep('narration_completed', { chunkCount: textChunks.length });

                    // Image Generation Task
                    if (actualImageCount > 0) {
                        const { ImageGenerationFactory } = await import('@/lib/features/image-generation/factory');
                        const provider = ImageGenerationFactory.getProvider();

                        let userPhotoBuffer: Buffer | undefined;
                        if (childAvatar) {
                            try {
                                const { data: photoData, error: downloadError } = await serviceRoleClient.storage
                                    .from('user-assets')
                                    .download(childAvatar);

                                if (downloadError) throw downloadError;

                                if (photoData) {
                                    const arrayBuffer = await photoData.arrayBuffer();
                                    userPhotoBuffer = Buffer.from(arrayBuffer);
                                }
                            } catch (err) {
                                console.warn("Background task: Failed to download user photo reference:", err);
                                await logGenerationStep('avatar_download_failed', { error: String(err), avatarPath: childAvatar });
                            }
                        }

                        const sectionsToGenerate = sectionsWithIndices
                            .map((section: any, index: number) => ({ section, index }))
                            .filter(({ section }: { section: any }) => section.image_prompt && section.image_prompt.trim() !== "");

                        const successfulIndices: number[] = [];
                        let hasSetCover = false;
                        const batchSize = 2; // Throttle to avoid rate limits

                        for (let i = 0; i < sectionsToGenerate.length; i += batchSize) {
                            const batch = sectionsToGenerate.slice(i, i + batchSize);

                            await Promise.all(batch.map(async ({ section, index: currentIndex }: { section: any; index: number }) => {
                                try {
                                    // Set status to generating
                                    await serviceRoleClient.rpc('update_section_image_status', {
                                        p_book_id: bookId,
                                        p_section_index: currentIndex,
                                        p_status: 'generating'
                                    });

                                    const result = await provider.generateImage({
                                        prompt: section.image_prompt,
                                        subjectImage: userPhotoBuffer,
                                        characterDescription: data.mainCharacterDescription,
                                        imageSize: '1K'
                                    });

                                    const imageStoragePath = `${bookId}/images/section-${currentIndex}-${Date.now()}.png`;

                                    const { error: uploadError } = await serviceRoleClient.storage.from('book-assets').upload(imageStoragePath, result.imageBuffer, {
                                        contentType: result.mimeType,
                                        upsert: true
                                    });

                                    if (uploadError) {
                                        throw new Error(`Failed to upload image: ${uploadError.message}`);
                                    }

                                    // Race-condition safe(r) check
                                    // Even if parallel, the chances of exact simultaneous execution are low enough for this optimization
                                    // Ideally this would be outside the parallel block or atomic, but this is sufficient to prevent massive spam
                                    if (!hasSetCover) {
                                        hasSetCover = true;
                                        await serviceRoleClient
                                            .from('books')
                                            .update({ cover_image_path: imageStoragePath })
                                            .eq('id', bookId);
                                    }

                                    await serviceRoleClient.from('book_media').upsert({
                                        book_id: bookId,
                                        media_type: 'image',
                                        path: imageStoragePath,
                                        after_word_index: section.after_word_index,
                                        metadata: {
                                            caption: `Illustration for section ${currentIndex + 1}`,
                                            alt: section.image_prompt
                                        },
                                        owner_user_id: ownerUserId
                                    }, { onConflict: 'book_id,path' });

                                    // Set status to success and store path
                                    await serviceRoleClient.rpc('update_section_image_status', {
                                        p_book_id: bookId,
                                        p_section_index: currentIndex,
                                        p_status: 'success',
                                        p_storage_path: imageStoragePath
                                    });

                                    await logGenerationStep(`image_generated_${currentIndex}`, {
                                        sectionIndex: currentIndex,
                                        storagePath: imageStoragePath,
                                        request: result.requestContext,
                                        response: result.responseMetadata
                                    });

                                    successfulIndices.push(currentIndex);
                                } catch (err) {
                                    console.error(`Background task: Failed to generate image for section ${currentIndex}:`, err);

                                    // Set status to failed
                                    await serviceRoleClient.rpc('update_section_image_status', {
                                        p_book_id: bookId,
                                        p_section_index: currentIndex,
                                        p_status: 'failed',
                                        p_error_message: String(err)
                                    });

                                    await logGenerationStep(`image_failed_${currentIndex}`, {
                                        sectionIndex: currentIndex,
                                        error: String(err),
                                        prompt: section.image_prompt
                                    });
                                }
                            }));
                        }

                        const successfulCount = successfulIndices.length;

                        await logGenerationStep('image_generation_finished', {
                            successfulCount,
                            totalRequested: actualImageCount
                        });

                        // Logic Change: If ALL images fail, we do NOT fail the story.
                        // We just refund the images and keep the text story.
                        if (actualImageCount > 0 && successfulCount === 0) {
                            console.warn("All image generations failed. Proceeding with story but refunding images.");
                            // Refund will be handled by the general partial refund block below
                        }

                        // P2: Refund credits for partially (or fully) failed images
                        if (successfulCount < actualImageCount) {
                            const failedCount = actualImageCount - successfulCount;
                            if (failedCount > 0 && identity && !isTestMode) {
                                console.warn(`[StoryAPI] Failed to generate ${failedCount} images. Refunding credits.`);
                                await refundCredits(identity, "image_generation", failedCount, childId, { book_id: bookId }, idempotencyKey, bookId, 'story');
                            }
                        }
                    }

                    await bgStoryRepo.updateStoryStatus(book.id, 'completed');
                    await logGenerationStep('story_completed', {});
                } catch (err) {
                    console.error(`Background processing failed:`, err);
                    const errorMessage = err instanceof Error ? err.message : String(err);

                    // Refund credits on total background failure ONLY if not in test mode
                    if (identity && identity.identity_key !== 'unknown' && !isTestMode) {
                        console.warn(`[StoryAPI] Background task failed. Refunding credits for ${identity.identity_key}`);

                        // We need to calculate what to refund. 
                        // We charged: 1 story + imageSceneCount (initial)
                        // We already refunded: creditsRefunded (under-generation)
                        // If we are here, something catastrophic happened.

                        // BUT: logic above might have already refunded partial failures if we got past image generation.
                        // Ideally we check if we are failing BEFORE image generation or AFTER.
                        // For simplicity/safety: we try to refund the remaining "charged" amount.

                        const remainingImagesCharged = imageSceneCount - creditsRefunded;

                        await refundCredits(identity, "story_generation", 1, childId, { book_id: bookId }, idempotencyKey, bookId, 'story');
                        if (remainingImagesCharged > 0) {
                            await refundCredits(identity, "image_generation", remainingImagesCharged, childId, { book_id: bookId }, idempotencyKey, bookId, 'story');
                        }
                    }

                    await serviceRoleClient
                        .from('stories')
                        .update({
                            status: 'failed',
                            error_message: errorMessage,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', book.id);

                    await logGenerationStep('generation_failed', { error: errorMessage });
                }
            })());

            // Audit: Generation Success (Text phase)
            const totalSections = data.sections.length;
            console.info("[StoryAPI] Logging STORY_GENERATED...");
            await AuditService.log({
                action: AuditAction.STORY_GENERATED,
                entityType: EntityType.STORY,
                entityId: bookId,
                userId: ownerUserId,
                identityKey: identity?.identity_key,
                childId: childId,
                details: {
                    title: data.sections[0]?.title || "Untitled",
                    sectionCount: data.sections.length,
                    sceneCount: totalSections,
                    imageCount: actualImageCount,
                    totalTokens: data.total_tokens || 0
                }
            });
            console.info("[StoryAPI] STORY_GENERATED logged.");

            return NextResponse.json({
                ...data,
                sections: sectionsWithIndices,
                book_id: book.id,
                tokens: tokens,
                rawPrompt,
                rawResponse: data
            });

        } catch (error: any) {
            console.error("Gemini Story API error:", error);

            // Critical: Refund credits on system failure ONLY if identity is known AND not in test mode
            if (identity && identity.identity_key !== 'unknown' && !isTestMode) {
                console.warn(`[StoryAPI] Generation failed after reservation. Refunding credits for ${identity.identity_key}`);

                // Refund everything we haven't already refunded
                const remainingImagesCharged = imageSceneCount - creditsRefunded;

                await refundCredits(identity, "story_generation", 1, childId, { book_id: bookId }, idempotencyKey, bookId, 'story');
                if (remainingImagesCharged > 0) {
                    await refundCredits(identity, "image_generation", remainingImagesCharged, childId, { book_id: bookId }, idempotencyKey, bookId, 'story');
                }
            }

            // Audit: Generation Failed
            console.info("[StoryAPI] Logging STORY_FAILED...");
            await AuditService.log({
                action: AuditAction.STORY_FAILED,
                entityType: EntityType.STORY,
                entityId: bookId, // Might exist if ID generated earlier
                userId: ownerUserId,
                identityKey: identity?.identity_key,
                childId: childId,
                details: {
                    error: error.message,
                    refunded: !isTestMode
                }
            });
            console.info("[StoryAPI] STORY_FAILED logged.");

            return NextResponse.json({ error: error.message || "Failed to generate story" }, { status: 500 });
        }
    } catch (error: any) {
        // This catch block handles errors that happen BEFORE usage reservation (e.g. input validation, identity creation failures)
        console.error("Story API Input/Setup Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
