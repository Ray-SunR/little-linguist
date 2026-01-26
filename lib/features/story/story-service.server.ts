import { SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { AuditService, AuditAction, EntityType } from "@/lib/features/audit/audit-service.server";
import { Tokenizer } from "@/lib/core/books/tokenizer";
import { TextChunker } from "@/lib/core/books/text-chunker";
import { NarrationFactory } from "@/lib/features/narration/factory.server";
import { alignSpeechMarksToTokens, getWordTokensForChunk } from "@/lib/core/books/speech-mark-aligner";
import { StoryRepository } from "@/lib/core/stories/repository.server";
import {
    getOrCreateIdentity,
    reserveCredits,
    refundCredits,
    UsageIdentity
} from "@/lib/features/usage/usage-service.server";
import { AIFactory } from "@/lib/core/integrations/ai/factory.server";
import { RewardService, RewardType } from "@/lib/features/activity/reward-service.server";

export interface CreateStoryOptions {
    words: string[];
    childId: string;
    userProfile?: {
        name?: string;
        age?: number;
        gender?: string;
        topic?: string;
        setting?: string;
        avatarStoragePath?: string;
    };
    storyLengthMinutes?: number;
    imageSceneCount?: number;
    idempotencyKey?: string;
    timezone?: string;
    guestId?: string;
}

export class StoryService {
    constructor(
        private supabase: SupabaseClient,
        private serviceRoleClient: SupabaseClient,
        private userId: string
    ) {}

    async createStory(options: CreateStoryOptions, waitUntil: (promise: Promise<any>) => void) {
        const { 
            words, 
            childId, 
            userProfile, 
            storyLengthMinutes: reqStoryLength = 5, 
            imageSceneCount: reqImageCount, 
            idempotencyKey,
            timezone = 'UTC',
            guestId
        } = options;

        const storyIdempotencyKey = idempotencyKey ? `${idempotencyKey}:story` : undefined;
        const imageIdempotencyKey = idempotencyKey ? `${idempotencyKey}:images` : undefined;

        // Coerce and validate story length (Minutes)
        const parsedStoryLength = Number(reqStoryLength);
        if (!Number.isFinite(parsedStoryLength)) {
            throw new Error("Invalid storyLength");
        }
        const storyLengthMinutes = Math.min(Math.max(parsedStoryLength, 1), 10);

        // Number of sections is derived from minutes (1 section per minute)
        const totalSections = storyLengthMinutes;

        // Validate Image Scene Count
        let imageSceneCount = reqImageCount !== undefined ? Number(reqImageCount) : totalSections;
        if (!Number.isFinite(imageSceneCount)) {
            imageSceneCount = totalSections;
        }
        imageSceneCount = Math.min(Math.max(imageSceneCount, 0), totalSections);

        // 0. Input Validation
        if (!childId || typeof childId !== 'string' || !/^[0-9a-f-]{36}$/i.test(childId)) {
            throw new Error("Valid childId is required");
        }

        if (!Array.isArray(words) || words.length > 10) {
            throw new Error("Provide up to 10 words");
        }

        if (words.some(w => typeof w !== 'string' || w.length > 30)) {
            throw new Error("Each word must be a string under 30 characters");
        }

        // 1. Fetch child profile
        const { data: child, error: childError } = await this.supabase
            .from('children')
            .select('*')
            .eq('id', childId)
            .single();

        if (childError || !child) {
            throw new Error("Child profile not found");
        }

        const { 
            first_name: dbName, 
            age: dbAge, 
            gender: dbGender, 
            avatar_paths: avatarPaths, 
            primary_avatar_index: primaryAvatarIndex 
        } = child;

        const name = userProfile?.name || dbName;
        const age = userProfile?.age || dbAge;
        const gender = userProfile?.gender || dbGender;
        const topic = userProfile?.topic;
        const setting = userProfile?.setting;

        const isTestMode = process.env.TEST_MODE === 'true';

        // 1.1 Determine the avatar to use
        let childAvatar: string | undefined = userProfile?.avatarStoragePath || undefined;

        if (childAvatar) {
            const isOwnedByUser = childAvatar.startsWith(`${this.userId}/`);
            const isChildAsset = avatarPaths?.includes(childAvatar);
            
            let isGuestOwned = false;
            if (childAvatar.startsWith('guests/')) {
                if (guestId && childAvatar.startsWith(`guests/${guestId}/`)) {
                    isGuestOwned = true;
                }
            }

            if (!isOwnedByUser && !isChildAsset && !isGuestOwned) {
                if (childAvatar.startsWith('guests/')) {
                    const filename = childAvatar.split('/').pop();
                    const claimedPath = avatarPaths?.find((p: string) => p.endsWith(`/${filename}`) && p.startsWith(`${this.userId}/`));
                    
                    if (claimedPath) {
                        childAvatar = claimedPath;
                    } else {
                        childAvatar = undefined;
                    }
                } else {
                    childAvatar = undefined;
                }
            }
        }

        if (!childAvatar) {
            childAvatar = (avatarPaths && avatarPaths.length > 0)
                ? (avatarPaths[primaryAvatarIndex ?? 0] || avatarPaths[0])
                : undefined;
        }

        const wordsList = words.join(", ");
        const bookId = crypto.randomUUID();

        // 1.5 Usage Tracking & Quotas
        const identity = await getOrCreateIdentity({ id: this.userId } as any);

        const reservationResult = isTestMode
            ? { success: true }
            : await reserveCredits(identity, [
                { featureName: "story_generation", increment: 1, childId, metadata: { book_id: bookId }, idempotencyKey: storyIdempotencyKey, entityId: bookId, entityType: 'story' },
                { featureName: "image_generation", increment: imageSceneCount, childId, metadata: { book_id: bookId }, idempotencyKey: imageIdempotencyKey, entityId: bookId, entityType: 'story' }
            ]);

        if (!reservationResult.success) {
            const errorMsg = reservationResult.error || "";
            const isLimitError = errorMsg.includes("LIMIT_REACHED");
            const isImageError = errorMsg.includes("image_generation");

            if (isLimitError) {
                if (isImageError) {
                    const err = new Error("IMAGE_LIMIT_REACHED");
                    (err as any).status = 403;
                    throw err;
                }
                const err = new Error("LIMIT_REACHED");
                (err as any).status = 403;
                throw err;
            }

            throw new Error("SYSTEM_ERROR");
        }

        // Audit: Generation Started
        await AuditService.log({
            action: AuditAction.STORY_STARTED,
            entityType: EntityType.STORY,
            userId: this.userId,
            identityKey: identity?.identity_key,
            childId: childId,
            details: {
                imageCount: imageSceneCount,
                bookId: bookId
            }
        });

        let creditsRefunded = 0;

        try {
            const aiProvider = AIFactory.getProvider();
            const generated = await aiProvider.generateStory(words, {
                name, age, gender, topic, setting
            }, {
                storyLengthMinutes,
                imageSceneCount,
                idempotencyKey: storyIdempotencyKey
            });

            const data = generated.rawResponse;
            const rawPrompt = generated.rawPrompt || "";

            if (!data.title || !data.content || !data.mainCharacterDescription || !Array.isArray(data.sections) || data.sections.length === 0 || !Array.isArray(data.image_scenes)) {
                throw new Error("The storyteller had a hiccup. Please try again!");
            }

            let validImageScenes = data.image_scenes.filter((img: any) =>
                typeof img.section_index === 'number' &&
                img.section_index >= 0 &&
                img.section_index < data.sections.length &&
                typeof img.image_prompt === 'string' &&
                img.image_prompt.trim() !== ""
            );

            if (validImageScenes.length > imageSceneCount) {
                validImageScenes = validImageScenes.slice(0, imageSceneCount);
            }

            const actualImageCount = validImageScenes.length;
            if (actualImageCount < imageSceneCount && !isTestMode) {
                const refundAmount = imageSceneCount - actualImageCount;
                if (refundAmount > 0) {
                    await refundCredits(identity!, "image_generation", refundAmount, childId, { book_id: bookId }, imageIdempotencyKey, bookId, 'story');
                    creditsRefunded += refundAmount;
                }
            }

            const nameRegex = new RegExp(`\\b${name}\\b`, 'gi');
            data.sections = data.sections.map((section: any, index: number) => {
                const imageRecord = validImageScenes.find((img: any) => img.section_index === index);
                let image_prompt = imageRecord?.image_prompt || "";

                if (image_prompt !== "") {
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

            let bookEmbedding: number[] | null = null;
            try {
                const embeddingText = `Title: ${data.title}. Description: ${data.content.substring(0, 500)}. Keywords: ${wordsList}.`;
                bookEmbedding = await AIFactory.getProvider().generateEmbedding(embeddingText);
            } catch (err) {
                console.error("[StoryService] Failed to generate embedding:", err);
            }

            const { data: book, error: bookError } = await this.serviceRoleClient
                .from('books')
                .upsert({
                    id: bookId,
                    book_key: bookKey,
                    owner_user_id: this.userId,
                    title: data.title,
                    origin: 'user_generated',
                    min_grade: age <= 2 ? -1 : (age <= 5 ? 0 : (age <= 8 ? 1 : 3)),
                    voice_id: voiceId,
                    total_tokens: tokens.length,
                    estimated_reading_time: storyLengthMinutes,
                    child_id: childId,
                    schema_version: 2,
                    embedding: bookEmbedding,
                    description: data.content.substring(0, 500),
                    keywords: wordsList.split(',').map((w: string) => w.trim()),
                    metadata: {
                        isAIGenerated: true,
                        sections: sectionsWithIndices,
                        mainCharacterDescription: data.mainCharacterDescription
                    }
                })
                .select()
                .single();

            if (bookError) throw bookError;

            const { error: contentError } = await this.serviceRoleClient
                .from('book_contents')
                .upsert({
                    book_id: bookId,
                    tokens,
                    full_text: fullContent
                });

            if (contentError) throw contentError;

            const storyRepo = new StoryRepository(this.serviceRoleClient);
            await storyRepo.createStory({
                id: book.id,
                owner_user_id: this.userId,
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

            if (childId) {
                await this.serviceRoleClient
                    .from('child_books')
                    .upsert({
                        child_id: childId,
                        book_id: bookId,
                        is_completed: false,
                        is_favorite: false,
                        last_read_at: new Date().toISOString()
                    }, { onConflict: 'child_id,book_id' });
            }

            // Background Tasks
            waitUntil((async () => {
                try {
                    const logGenerationStep = async (step: string, logData: any) => {
                        try {
                            await this.serviceRoleClient.rpc('append_story_log', {
                                story_id: book.id,
                                new_log: {
                                    step,
                                    timestamp: new Date().toISOString(),
                                    ...logData
                                }
                            });
                        } catch (e) {
                            console.error("Failed to log generation step:", e);
                        }
                    };

                    await logGenerationStep('starting_background_tasks', { actualImageCount });

                    const textChunks = TextChunker.chunk(fullContent);
                    const polly = NarrationFactory.getProvider();

                    for (const chunk of textChunks) {
                        const { audioBuffer, speechMarks } = await polly.synthesize(chunk.text);
                        const storagePath = `${book.id}/audio/${voiceId}/${chunk.index}.mp3`;

                        const { error: uploadError } = await this.serviceRoleClient.storage.from('book-assets').upload(storagePath, audioBuffer, {
                            contentType: 'audio/mpeg',
                            upsert: true
                        });

                        if (uploadError) {
                            throw new Error(`Failed to upload audio chunk ${chunk.index}: ${uploadError.message}`);
                        }

                        const wordTokensForChunk = getWordTokensForChunk(tokens, chunk.startWordIndex, chunk.endWordIndex);
                        const alignedTimings = alignSpeechMarksToTokens(speechMarks, wordTokensForChunk);

                        await this.serviceRoleClient.from('book_audios').upsert({
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

                    if (actualImageCount > 0) {
                        const { ImageGenerationFactory } = await import('@/lib/features/image-generation/factory');
                        const provider = ImageGenerationFactory.getProvider();

                        let userPhotoBuffer: Buffer | undefined;
                        if (childAvatar) {
                            try {
                                const { data: photoData, error: downloadError } = await this.serviceRoleClient.storage
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
                        const batchSize = 2;

                        for (let i = 0; i < sectionsToGenerate.length; i += batchSize) {
                            const batch = sectionsToGenerate.slice(i, i + batchSize);

                            await Promise.all(batch.map(async ({ section, index: currentIndex }: { section: any; index: number }) => {
                                try {
                                    await this.serviceRoleClient.rpc('update_section_image_status', {
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

                                    const { error: uploadError } = await this.serviceRoleClient.storage.from('book-assets').upload(imageStoragePath, result.imageBuffer, {
                                        contentType: result.mimeType,
                                        upsert: true
                                    });

                                    if (uploadError) {
                                        throw new Error(`Failed to upload image: ${uploadError.message}`);
                                    }

                                    if (!hasSetCover) {
                                        hasSetCover = true;
                                        await this.serviceRoleClient
                                            .from('books')
                                            .update({ cover_image_path: imageStoragePath })
                                            .eq('id', bookId);
                                    }

                                    await this.serviceRoleClient.from('book_media').upsert({
                                        book_id: bookId,
                                        media_type: 'image',
                                        path: imageStoragePath,
                                        after_word_index: section.after_word_index,
                                        metadata: {
                                            caption: `Illustration for section ${currentIndex + 1}`,
                                            alt: section.image_prompt
                                        },
                                        owner_user_id: this.userId
                                    }, { onConflict: 'book_id,path' });

                                    await this.serviceRoleClient.rpc('update_section_image_status', {
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

                                    await this.serviceRoleClient.rpc('update_section_image_status', {
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

                        if (successfulCount < actualImageCount) {
                            const failedCount = actualImageCount - successfulCount;
                            if (failedCount > 0 && identity && !isTestMode) {
                                await refundCredits(identity, "image_generation", failedCount, childId, { book_id: bookId }, imageIdempotencyKey, bookId, 'story');
                            }
                        }
                    }

                    const bgStoryRepo = new StoryRepository(this.serviceRoleClient);
                    await bgStoryRepo.updateStoryStatus(book.id, 'completed');
                    await logGenerationStep('story_completed', {});
                } catch (err) {
                    console.error(`Background processing failed:`, err);
                    const errorMessage = err instanceof Error ? err.message : String(err);

                    if (identity && identity.identity_key !== 'unknown' && !isTestMode) {
                        const remainingImagesCharged = imageSceneCount - creditsRefunded;

                        await refundCredits(identity, "story_generation", 1, childId, { book_id: bookId }, storyIdempotencyKey, bookId, 'story');
                        if (remainingImagesCharged > 0) {
                            await refundCredits(identity, "image_generation", remainingImagesCharged, childId, { book_id: bookId }, imageIdempotencyKey, bookId, 'story');
                        }
                    }

                    await this.serviceRoleClient
                        .from('stories')
                        .update({
                            status: 'failed',
                            error_message: errorMessage,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', book.id);

                    try {
                        await this.serviceRoleClient.rpc('append_story_log', {
                            story_id: book.id,
                            new_log: {
                                step: 'generation_failed',
                                timestamp: new Date().toISOString(),
                                error: errorMessage
                            }
                        });
                    } catch (e) {
                        console.error("Failed to log generation failure:", e);
                    }
                }
            })());

            // Rewards
            const rewardService = new RewardService(this.supabase);
            
            await rewardService.claimReward({
                childId: childId,
                rewardType: RewardType.STORY_GENERATED,
                entityId: bookId,
                timezone,
                metadata: {
                    title: data.sections[0]?.title || "Untitled",
                    sectionCount: data.sections.length,
                    sceneCount: totalSections,
                    imageCount: actualImageCount,
                    totalTokens: tokens.length
                }
            });

            return {
                ...data,
                sections: sectionsWithIndices,
                book_id: book.id,
                tokens: tokens,
                rawPrompt,
                rawResponse: data
            };

        } catch (error: any) {
            console.error("Story generation error:", error);

            if (identity && identity.identity_key !== 'unknown' && !isTestMode) {
                const remainingImagesCharged = imageSceneCount - creditsRefunded;

                await refundCredits(identity, "story_generation", 1, childId, { book_id: bookId }, storyIdempotencyKey, bookId, 'story');
                if (remainingImagesCharged > 0) {
                    await refundCredits(identity, "image_generation", remainingImagesCharged, childId, { book_id: bookId }, imageIdempotencyKey, bookId, 'story');
                }
            }

            await AuditService.log({
                action: AuditAction.STORY_FAILED,
                entityType: EntityType.STORY,
                entityId: bookId,
                userId: this.userId,
                identityKey: identity?.identity_key,
                childId: childId,
                details: {
                    error: error.message,
                    refunded: !isTestMode
                }
            });

            throw error;
        }
    }
}
