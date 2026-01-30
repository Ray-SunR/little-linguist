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
    private storyRepo: StoryRepository;

    constructor(
        private supabase: SupabaseClient,
        private serviceRoleClient: SupabaseClient,
        private userId: string
    ) {
        this.storyRepo = new StoryRepository(this.serviceRoleClient);
    }

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

        const { storyLengthMinutes, imageSceneCount, totalSections } = this.validateAndNormalizeLengths(reqStoryLength, reqImageCount);
        this.validateInputs(childId, words);

        const child = await this.fetchChildProfile(childId);
        const { name, age, gender, childAvatar } = this.resolveProfileDetails(child, userProfile, guestId);

        const bookId = crypto.randomUUID();
        const identity = await getOrCreateIdentity({ id: this.userId } as any);
        const { storyIdempotencyKey, imageIdempotencyKey } = this.getIdempotencyKeys(idempotencyKey);

        const isTestMode = process.env.TEST_MODE === 'true';

        // 1. Reserve Credits
        await this.handleCreditReservation(identity, storyIdempotencyKey, imageIdempotencyKey, bookId, childId, imageSceneCount, isTestMode);

        // 2. Log Start
        await this.logGenerationStart(identity, bookId, childId, imageSceneCount);

        let creditsRefunded = 0;

        try {
            // 3. AI Generation
            const { data, rawPrompt, actualImageCount, refundAmount } = await this.generateStoryContent(words, name, age, gender, userProfile?.topic, userProfile?.setting, storyLengthMinutes, imageSceneCount, storyIdempotencyKey);
            
            if (refundAmount > 0 && !isTestMode) {
                await refundCredits(identity!, "image_generation", refundAmount, childId, { book_id: bookId }, imageIdempotencyKey, bookId, 'story');
                creditsRefunded += refundAmount;
            }

            // 4. Persistence
            const book = await this.persistStoryToDb(bookId, data, rawPrompt, name, age, gender, childId, childAvatar, words, storyLengthMinutes, actualImageCount, storyIdempotencyKey);

            // 5. Background Tasks
            this.launchBackgroundTasks(book, data, childAvatar, actualImageCount, identity, imageSceneCount, creditsRefunded, waitUntil, imageIdempotencyKey, storyIdempotencyKey, childId, isTestMode);

            // 6. Rewards
            await this.claimGenerationReward(childId, bookId, data, totalSections, actualImageCount, timezone);

            return {
                ...data,
                sections: data.sections, // Already contains indices from persistStoryToDb logic if needed, but let's be careful
                book_id: book.id,
                tokens: Tokenizer.tokenize(data.sections.map((s: any) => s.text).join('\n\n')),
                rawPrompt,
                rawResponse: data
            };

        } catch (error: any) {
            console.error("[StoryService] Story generation failed synchronously:", error);
            await this.handleGenerationFailure(identity, bookId, childId, imageSceneCount, creditsRefunded, storyIdempotencyKey, imageIdempotencyKey, isTestMode, error);
            throw error;
        }
    }

    private validateAndNormalizeLengths(reqStoryLength: any, reqImageCount: any) {
        const parsedStoryLength = Number(reqStoryLength);
        if (!Number.isFinite(parsedStoryLength)) throw new Error("Invalid storyLength");
        const storyLengthMinutes = Math.min(Math.max(parsedStoryLength, 1), 10);
        const totalSections = storyLengthMinutes;

        let imageSceneCount = reqImageCount !== undefined ? Number(reqImageCount) : totalSections;
        if (!Number.isFinite(imageSceneCount)) imageSceneCount = totalSections;
        imageSceneCount = Math.min(Math.max(imageSceneCount, 0), totalSections);

        return { storyLengthMinutes, imageSceneCount, totalSections };
    }

    private validateInputs(childId: string, words: string[]) {
        if (!childId || typeof childId !== 'string' || !/^[0-9a-f-]{36}$/i.test(childId)) {
            throw new Error("Valid childId is required");
        }
        if (!Array.isArray(words) || words.length > 10) {
            throw new Error("Provide up to 10 words");
        }
        if (words.some(w => typeof w !== 'string' || w.length > 30)) {
            throw new Error("Each word must be a string under 30 characters");
        }
    }

    private async fetchChildProfile(childId: string) {
        const { data: child, error: childError } = await this.supabase
            .from('children')
            .select('*')
            .eq('id', childId)
            .single();

        if (childError || !child) throw new Error("Child profile not found");
        return child;
    }

    private resolveProfileDetails(child: any, userProfile: any, guestId?: string) {
        const { first_name: dbName, age: dbAge, gender: dbGender, avatar_paths: avatarPaths, primary_avatar_index: primaryAvatarIndex } = child;
        const name = userProfile?.name || dbName;
        const age = userProfile?.age || dbAge;
        const gender = (userProfile?.gender || dbGender || 'neutral') as 'boy' | 'girl' | 'other' | 'neutral';

        let childAvatar: string | undefined = userProfile?.avatarStoragePath || undefined;
        if (childAvatar) {
            const isOwnedByUser = childAvatar.startsWith(`${this.userId}/`);
            const isChildAsset = avatarPaths?.includes(childAvatar);
            let isGuestOwned = guestId && childAvatar.startsWith(`guests/${guestId}/`);
            if (!isOwnedByUser && !isChildAsset && !isGuestOwned) {
                if (childAvatar.startsWith('guests/')) {
                    const filename = childAvatar.split('/').pop();
                    childAvatar = avatarPaths?.find((p: string) => p.endsWith(`/${filename}`) && p.startsWith(`${this.userId}/`)) || undefined;
                } else {
                    childAvatar = undefined;
                }
            }
        }
        if (!childAvatar) {
            childAvatar = (avatarPaths && avatarPaths.length > 0) ? (avatarPaths[primaryAvatarIndex ?? 0] || avatarPaths[0]) : undefined;
        }

        return { name, age, gender, childAvatar };
    }

    private getIdempotencyKeys(idempotencyKey?: string) {
        return {
            storyIdempotencyKey: idempotencyKey ? `${idempotencyKey}:story` : undefined,
            imageIdempotencyKey: idempotencyKey ? `${idempotencyKey}:images` : undefined
        };
    }

    private async handleCreditReservation(identity: UsageIdentity, storyKey?: string, imageKey?: string, bookId?: string, childId?: string, imageCount: number = 0, isTestMode: boolean = false) {
        if (isTestMode) return;
        const result = await reserveCredits(identity, [
            { featureName: "story_generation", increment: 1, childId, metadata: { book_id: bookId }, idempotencyKey: storyKey, entityId: bookId, entityType: 'story' },
            { featureName: "image_generation", increment: imageCount, childId, metadata: { book_id: bookId }, idempotencyKey: imageKey, entityId: bookId, entityType: 'story' }
        ]);

        if (!result.success) {
            const errorMsg = result.error || "";
            const err = new Error(errorMsg.includes("image_generation") ? "IMAGE_LIMIT_REACHED" : "LIMIT_REACHED");
            if (errorMsg.includes("LIMIT_REACHED")) (err as any).status = 403;
            throw err;
        }
    }

    private async logGenerationStart(identity: UsageIdentity, bookId: string, childId: string, imageCount: number) {
        await AuditService.log({
            action: AuditAction.STORY_STARTED,
            entityType: EntityType.STORY,
            userId: this.userId,
            identityKey: identity?.identity_key,
            childId,
            details: { imageCount, bookId }
        });
    }

    private async generateStoryContent(words: string[], name: string, age: number, gender: 'boy' | 'girl' | 'other' | 'neutral', topic?: string, setting?: string, storyLengthMinutes: number = 5, imageSceneCount: number = 3, storyIdempotencyKey?: string) {
        const aiProvider = AIFactory.getProvider();
        const generated = await aiProvider.generateStory(words, { name, age, gender, topic, setting }, { storyLengthMinutes, imageSceneCount, idempotencyKey: storyIdempotencyKey });
        
        const data = generated.rawResponse;
        if (!data.title || !data.content || !data.mainCharacterDescription || !Array.isArray(data.sections) || data.sections.length === 0 || !Array.isArray(data.image_scenes)) {
            throw new Error("The storyteller had a hiccup. Please try again!");
        }

        const validImageScenes = data.image_scenes.filter((img: any) =>
            typeof img.section_index === 'number' && img.section_index >= 0 && img.section_index < data.sections.length &&
            typeof img.image_prompt === 'string' && img.image_prompt.trim() !== ""
        ).slice(0, imageSceneCount);

        const refundAmount = imageSceneCount - validImageScenes.length;
        
        // Normalize prompts with [1] marker
        const nameRegex = new RegExp(`\\b${name}\\b`, 'gi');
        data.sections = data.sections.map((section: any, index: number) => {
            const imageRecord = validImageScenes.find((img: any) => img.section_index === index);
            let image_prompt = imageRecord?.image_prompt || "";
            if (image_prompt !== "") {
                image_prompt = image_prompt.replace(nameRegex, "[1]");
                if (!image_prompt.includes("[1]")) image_prompt = `[1] ${image_prompt}`;
            }
            return { ...section, image_prompt, image_status: image_prompt !== "" ? 'pending' : null, retry_count: 0 };
        });

        return { data, rawPrompt: generated.rawPrompt || "", actualImageCount: validImageScenes.length, refundAmount };
    }

    private async persistStoryToDb(bookId: string, data: any, rawPrompt: string, name: string, age: number, gender: string, childId: string, avatarUrl?: string, words: string[] = [], storyLengthMinutes: number = 5, actualImageCount: number = 0, storyIdempotencyKey?: string) {
        const voiceId = process.env.POLLY_VOICE_ID || 'Kevin';
        const fullContent = data.sections.map((s: any) => s.text).join('\n\n');
        const tokens = Tokenizer.tokenize(fullContent);
        
        let currentWordIndex = 0;
        const sectionsWithIndices = data.sections.map((section: any) => {
            const sectionTokens = Tokenizer.tokenize(section.text);
            const wordCount = Tokenizer.getWords(sectionTokens).length;
            const afterWordIndex = currentWordIndex + wordCount - 1;
            currentWordIndex += wordCount;
            return { ...section, after_word_index: afterWordIndex };
        });

        data.sections = sectionsWithIndices;

        const bookKey = `${data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.random().toString(36).substring(2, 7)}`;
        let bookEmbedding: number[] | null = null;
        try {
            bookEmbedding = await AIFactory.getProvider().generateEmbedding(`Title: ${data.title}. Description: ${data.content.substring(0, 500)}.`);
        } catch (e) { console.error("[StoryService] Embedding failed", e); }

        const { data: book, error: bookError } = await this.serviceRoleClient.from('books').upsert({
            id: bookId, book_key: bookKey, owner_user_id: this.userId, title: data.title, origin: 'user_generated',
            min_grade: age <= 2 ? -1 : (age <= 5 ? 0 : (age <= 8 ? 1 : 3)),
            voice_id: voiceId, total_tokens: tokens.length, estimated_reading_time: storyLengthMinutes, child_id: childId,
            schema_version: 2, embedding: bookEmbedding, description: data.content.substring(0, 500),
            keywords: words.map(w => w.trim()),
            metadata: { isAIGenerated: true, sections: sectionsWithIndices, mainCharacterDescription: data.mainCharacterDescription }
        }).select().single();
        if (bookError) throw bookError;

        await this.serviceRoleClient.from('book_contents').upsert({ book_id: bookId, tokens, full_text: fullContent });
        
        await this.storyRepo.createStory({
            id: bookId, owner_user_id: this.userId, child_id: childId, main_character_description: data.mainCharacterDescription,
            sections: sectionsWithIndices, status: 'generating', avatar_url: avatarUrl, story_length_minutes: storyLengthMinutes,
            image_scene_count: actualImageCount, child_name: name, child_age: age, child_gender: gender, words_used: words,
            raw_prompt: rawPrompt, raw_response: data, book_id: bookId
        });

        await this.serviceRoleClient.from('child_books').upsert({ child_id: childId, book_id: bookId, is_completed: false, is_favorite: false, last_read_at: new Date().toISOString() }, { onConflict: 'child_id,book_id' });

        return book;
    }

    private launchBackgroundTasks(book: any, data: any, childAvatar: string | undefined, actualImageCount: number, identity: any, imageSceneCount: number, creditsRefunded: number, waitUntil: any = (p: any) => p, imageKey?: string, storyKey?: string, childId?: string, isTestMode: boolean = false) {
        waitUntil((async () => {
            const logStep = async (step: string, logData?: any) => {
                try {
                    await this.serviceRoleClient.rpc('append_story_log', { story_id: book.id, new_log: { step, timestamp: new Date().toISOString(), ...logData } });
                } catch (e) { console.error("Log failed", e); }
            };

            try {
                await logStep('starting_background_tasks', { actualImageCount });

                // 1. Audio
                const fullContent = data.sections.map((s: any) => s.text).join('\n\n');
                const textChunks = TextChunker.chunk(fullContent);
                const polly = NarrationFactory.getProvider();
                const tokens = Tokenizer.tokenize(fullContent);

                for (const chunk of textChunks) {
                    const { audioBuffer, speechMarks } = await polly.synthesize(chunk.text);
                    const storagePath = `${book.id}/audio/${book.voice_id}/${chunk.index}.mp3`;
                    await this.serviceRoleClient.storage.from('book-assets').upload(storagePath, audioBuffer, { contentType: 'audio/mpeg', upsert: true });
                    const alignedTimings = alignSpeechMarksToTokens(speechMarks, getWordTokensForChunk(tokens, chunk.startWordIndex, chunk.endWordIndex));
                    await this.serviceRoleClient.from('book_audios').upsert({ book_id: book.id, chunk_index: chunk.index, start_word_index: chunk.startWordIndex, end_word_index: chunk.endWordIndex, audio_path: storagePath, timings: alignedTimings, voice_id: book.voice_id }, { onConflict: 'book_id,chunk_index,voice_id' });
                }
                await logStep('narration_completed');

                // 2. Images
                if (actualImageCount > 0) {
                    const { ImageGenerationFactory } = await import('@/lib/features/image-generation/factory');
                    const provider = ImageGenerationFactory.getProvider();
                    let photoBuffer: Buffer | undefined;
                    if (childAvatar) {
                        try {
                            const { data: pd } = await this.serviceRoleClient.storage.from('user-assets').download(childAvatar);
                            if (pd) photoBuffer = Buffer.from(await pd.arrayBuffer());
                        } catch (e) { await logStep('avatar_download_failed', { error: String(e) }); }
                    }

                    const sectionsToGen = data.sections.map((s: any, i: number) => ({ s, i })).filter((x: any) => x.s.image_prompt);
                    let hasSetCover = false;
                        for (let i = 0; i < sectionsToGen.length; i += 2) {
                            const batch = sectionsToGen.slice(i, i + 2);
                            await Promise.all(batch.map(async ({ s, i: idx }: any) => {
                                let attempt = 0;
                                const maxRetries = 2;
                                let success = false;

                                while (attempt <= maxRetries && !success) {
                                    try {
                                        await this.serviceRoleClient.rpc('update_section_image_status', { p_book_id: book.id, p_section_index: idx, p_status: 'generating' });
                                        const res = await provider.generateImage({ prompt: s.image_prompt, subjectImage: photoBuffer, characterDescription: data.mainCharacterDescription, imageSize: '1K' });
                                        const path = `${book.id}/images/section-${idx}-${Date.now()}.png`;
                                        await this.serviceRoleClient.storage.from('book-assets').upload(path, res.imageBuffer, { contentType: res.mimeType, upsert: true });
                                        if (!hasSetCover) { hasSetCover = true; await this.serviceRoleClient.from('books').update({ cover_image_path: path }).eq('id', book.id); }
                                        await this.serviceRoleClient.from('book_media').upsert({ book_id: book.id, media_type: 'image', path, after_word_index: s.after_word_index, metadata: { caption: `Illustration ${idx + 1}`, alt: s.image_prompt }, owner_user_id: this.userId }, { onConflict: 'book_id,path' });
                                        await this.serviceRoleClient.rpc('update_section_image_status', { p_book_id: book.id, p_section_index: idx, p_status: 'success', p_storage_path: path });
                                        await logStep(`image_generated_${idx}`, { sectionIndex: idx, storagePath: path, attempt });
                                        success = true;
                                    } catch (e) {
                                        attempt++;
                                        if (attempt > maxRetries) {
                                            await this.serviceRoleClient.rpc('update_section_image_status', { p_book_id: book.id, p_section_index: idx, p_status: 'failed', p_error_message: String(e) });
                                            await logStep(`image_failed_${idx}`, { error: String(e), attempt });
                                        } else {
                                            console.warn(`[StoryService] Retrying image ${idx} (attempt ${attempt}) due to error:`, e);
                                            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                                        }
                                    }
                                }
                            }));
                        }
                }

                await this.storyRepo.updateStoryStatus(book.id, 'completed');
                await logStep('story_completed');
            } catch (err) {
                console.error("Background processing failed:", err);
                await this.handleBackgroundFailure(identity, book.id, childId, imageSceneCount, creditsRefunded, err, storyKey, imageKey, isTestMode);
            }
        })());
    }

    private async claimGenerationReward(childId: string, bookId: string, data: any, totalSections: number, actualImageCount: number, timezone: string) {
        const rewardService = new RewardService(this.supabase);
        await rewardService.claimReward({
            childId, rewardType: RewardType.STORY_GENERATED, entityId: bookId, timezone,
            metadata: { title: data.sections[0]?.title || "Untitled", sectionCount: data.sections.length, sceneCount: totalSections, imageCount: actualImageCount }
        });
    }

    private async handleGenerationFailure(identity: any, bookId: string, childId: string, imageCount: number, refunded: number, storyKey?: string, imageKey?: string, isTestMode: boolean = false, error?: any) {
        if (identity && identity.identity_key !== 'unknown' && !isTestMode) {
            await refundCredits(identity, "story_generation", 1, childId, { book_id: bookId }, storyKey, bookId, 'story');
            const remaining = imageCount - refunded;
            if (remaining > 0) await refundCredits(identity, "image_generation", remaining, childId, { book_id: bookId }, imageKey, bookId, 'story');
        }
        await AuditService.log({ action: AuditAction.STORY_FAILED, entityType: EntityType.STORY, entityId: bookId, userId: this.userId, identityKey: identity?.identity_key, childId, details: { error: error?.message, refunded: !isTestMode } });
    }

    private async handleBackgroundFailure(identity: any, bookId: string, childId: string | undefined, imageCount: number, refunded: number, err: any, storyKey?: string, imageKey?: string, isTestMode: boolean = false) {
        const msg = err instanceof Error ? err.message : String(err);
        if (identity && identity.identity_key !== 'unknown' && !isTestMode) {
            await refundCredits(identity, "story_generation", 1, childId, { book_id: bookId }, storyKey, bookId, 'story');
            const remaining = imageCount - refunded;
            if (remaining > 0) await refundCredits(identity, "image_generation", remaining, childId, { book_id: bookId }, imageKey, bookId, 'story');
        }
        await this.serviceRoleClient.from('stories').update({ status: 'failed', error_message: msg, updated_at: new Date().toISOString() }).eq('id', bookId);
        await this.serviceRoleClient.rpc('append_story_log', { story_id: bookId, new_log: { step: 'generation_failed', timestamp: new Date().toISOString(), error: msg } });
    }
}
