import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ClaudeStoryService } from "@/lib/features/bedrock/claude-service.server";
import { NovaStoryService } from "@/lib/features/nova/nova-service.server";
import { Tokenizer } from "@/lib/core/books/tokenizer";
import { NarrationFactory } from "@/lib/features/narration/factory.server";
import { getOrCreateIdentity, reserveCredits } from "@/lib/features/usage/usage-service.server";
import { AuditService, AuditAction, EntityType } from "@/lib/features/audit/audit-service.server";
import { RewardService, RewardType } from "@/lib/features/activity/reward-service.server";

const BUCKET = "user-assets";

export interface MagicSentenceResult {
    id: string;
    sentence: string;
    audioUrl?: string;
    imageUrl?: string;
    timingMarkers: any[];
    tokens: any[];
    words: string[];
    created_at: string;
}

export class MagicSentenceService {
    private adminSupabase: SupabaseClient;

    constructor(private userId: string) {
        this.adminSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
    }

    private async verifyChildOwnership(childId: string): Promise<boolean> {
        const { data, error } = await this.adminSupabase
            .from('children')
            .select('owner_user_id')
            .eq('id', childId)
            .single();
        
        if (error || !data) return false;
        return data.owner_user_id === this.userId;
    }

    private async getChildAge(childId: string): Promise<number> {
        const { data } = await this.adminSupabase
            .from('children')
            .select('birth_year')
            .eq('id', childId)
            .single();
        
        if (data?.birth_year) {
            const currentYear = new Date().getFullYear();
            return currentYear - data.birth_year;
        }
        return 6; // Default age
    }

    async generateMagicSentence(
        words: string[], 
        activeChildId: string, 
        generateImage: boolean = false,
        timezone: string = 'UTC'
    ): Promise<MagicSentenceResult> {
        // 1. Security Check
        const isOwner = await this.verifyChildOwnership(activeChildId);
        if (!isOwner) {
            throw new Error("FORBIDDEN: Child profile not owned by user");
        }

        const age = await this.getChildAge(activeChildId);
        const sentenceId = globalThis.crypto.randomUUID();
        const identity = await getOrCreateIdentity({ id: this.userId } as any);

        // 2. Quota Reservation
        const usageRequests: any[] = [
            { 
                featureName: 'magic_sentence', 
                increment: 1, 
                childId: activeChildId, 
                metadata: { words, magic_sentence_id: sentenceId },
                entityId: sentenceId,
                entityType: 'magic_sentence'
            }
        ];
        if (generateImage) {
            usageRequests.push({ 
                featureName: 'image_generation', 
                increment: 1, 
                childId: activeChildId, 
                metadata: { type: 'magic_sentence', magic_sentence_id: sentenceId },
                entityId: sentenceId,
                entityType: 'magic_sentence'
            });
        }

        const quotaReservation = await reserveCredits(identity, usageRequests);
        if (!quotaReservation.success) {
            throw new Error(`LIMIT_REACHED: ${quotaReservation.error}`);
        }

        let generationSuccessful = false;
        try {
            const claude = new ClaudeStoryService();
            const polly = NarrationFactory.getProvider();
            const nova = new NovaStoryService();

            // A. Generate content
            const { sentence, imagePrompt } = await claude.generateMagicSentence(words, age);
            const { audioBuffer, speechMarks } = await polly.synthesize(sentence);
            const timingMarkers = speechMarks.map((mark, idx) => ({
                wordIndex: idx,
                startMs: mark.time,
                endMs: speechMarks[idx + 1] ? speechMarks[idx + 1].time : mark.time + 500,
                value: mark.value
            }));

            let imageBase64: string | undefined;
            if (generateImage) {
                imageBase64 = await nova.generateImage(imagePrompt);
            }

            // B. Upload Assets
            const storagePrefix = `${this.userId}/${activeChildId}/magic_sentences/${sentenceId}`;
            const uploads = [
                this.adminSupabase.storage.from(BUCKET).upload(`${storagePrefix}/audio.mp3`, audioBuffer, { contentType: "audio/mpeg", upsert: true }),
                this.adminSupabase.storage.from(BUCKET).upload(`${storagePrefix}/timing.json`, Buffer.from(JSON.stringify(timingMarkers)), { contentType: "application/json", upsert: true })
            ];

            if (imageBase64) {
                const imageBuffer = Buffer.from(imageBase64, 'base64');
                uploads.push(this.adminSupabase.storage.from(BUCKET).upload(`${storagePrefix}/image.png`, imageBuffer, { contentType: "image/png", upsert: true }));
            }

            const uploadResults = await Promise.all(uploads);
            for (const res of uploadResults) {
                if (res.error) throw res.error;
            }

            // C. DB Persistence
            const { data: inserted, error: dbError } = await this.adminSupabase.from('child_magic_sentences').insert({
                id: sentenceId,
                child_id: activeChildId,
                words,
                sentence,
                audio_path: `${storagePrefix}/audio.mp3`,
                timing_path: `${storagePrefix}/timing.json`,
                image_path: generateImage ? `${storagePrefix}/image.png` : null
            }).select('created_at').single();

            if (dbError) throw dbError;

            generationSuccessful = true;

            // D. Deterministic Rewards
            const rewardService = new RewardService(this.adminSupabase);
            const rewardResult = await rewardService.claimReward({
                childId: activeChildId,
                rewardType: RewardType.MAGIC_SENTENCE_GENERATED,
                entityId: sentenceId,
                timezone,
                metadata: { word_count: words.length, has_image: generateImage }
            });

            if (!rewardResult.success) {
                console.info(`[MagicSentenceService] Reward skipped: Already claimed or failed.`);
            } else {
                console.info(`[MagicSentenceService] Magic sentence recorded. XP Earned: ${rewardResult.xp_earned}`);
            }

            // E. Hydrate URLs
            return this.hydrateAssets({
                id: sentenceId,
                sentence,
                words,
                audio_path: `${storagePrefix}/audio.mp3`,
                image_path: generateImage ? `${storagePrefix}/image.png` : null,
                timingMarkers, // Already have it from memory
                created_at: inserted?.created_at || new Date().toISOString()
            });

        } catch (error) {
            if (!generationSuccessful) {
                await reserveCredits(identity, usageRequests.map(r => ({ 
                    ...r, 
                    increment: -r.increment,
                    metadata: { ...r.metadata, is_refund: true }
                }))).catch(e => console.error("[MagicSentenceService] Refund failed:", e));
            }
            throw error;
        }
    }

    async getHistory(activeChildId: string, limit: number = 20): Promise<MagicSentenceResult[]> {
        const isOwner = await this.verifyChildOwnership(activeChildId);
        if (!isOwner) {
            throw new Error("FORBIDDEN: Access denied to child history");
        }

        const { data, error } = await this.adminSupabase
            .from('child_magic_sentences')
            .select('*')
            .eq('child_id', activeChildId)
            .order('created_at', { ascending: false })
            .limit(limit);
        
        if (error) throw error;
        if (!data) return [];

        return Promise.all(data.map(item => this.hydrateAssets(item)));
    }

    async getSentenceById(sentenceId: string): Promise<MagicSentenceResult> {
        const { data, error } = await this.adminSupabase
            .from('child_magic_sentences')
            .select('*')
            .eq('id', sentenceId)
            .single();
        
        if (error || !data) throw new Error("NOT_FOUND: Sentence not found");

        const isOwner = await this.verifyChildOwnership(data.child_id);
        if (!isOwner) {
            throw new Error("FORBIDDEN: Access denied to sentence");
        }

        return this.hydrateAssets(data);
    }

    private async hydrateAssets(item: any): Promise<MagicSentenceResult> {
        const paths = [item.audio_path];
        if (item.image_path) paths.push(item.image_path);

        const { data: signedUrls } = await this.adminSupabase.storage
            .from(BUCKET)
            .createSignedUrls(paths, 3600);

        const audioUrl = signedUrls?.find(s => s.path === item.audio_path)?.signedUrl;
        const imageUrl = signedUrls?.find(s => s.path === item.image_path)?.signedUrl;

        // Fetch timing if not provided (e.g. during history fetch)
        let timingMarkers = item.timingMarkers;
        if (!timingMarkers && item.timing_path) {
            const { data: timingSigned } = await this.adminSupabase.storage
                .from(BUCKET)
                .createSignedUrl(item.timing_path, 60);
            
            if (timingSigned?.signedUrl) {
                try {
                    const res = await fetch(timingSigned.signedUrl);
                    if (res.ok) {
                        timingMarkers = await res.json();
                    } else {
                        console.error("[MagicSentenceService] Failed to fetch timing file. Status:", res.status, "for", item.id);
                    }
                } catch (e) {
                    console.error("[MagicSentenceService] Error fetching timing for", item.id, e);
                }
            }
        }

        return {
            id: item.id,
            sentence: item.sentence,
            words: item.words,
            audioUrl,
            imageUrl,
            timingMarkers: timingMarkers || [],
            tokens: Tokenizer.tokenize(item.sentence),
            created_at: item.created_at
        };
    }
}
