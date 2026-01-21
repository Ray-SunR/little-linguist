import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { PollyNarrationService } from "@/lib/features/narration/polly-service.server";
import { normalizeWord } from "@/lib/core";
import { getWordAnalysisProvider } from "@/lib/features/word-insight/server/factory";
import { createClient as createAuthClient } from "@/lib/supabase/server";
import { getOrCreateIdentity, checkUsageLimit, tryIncrementUsage } from "@/lib/features/usage/usage-service.server";
import { AuditService, AuditAction, EntityType } from "@/lib/features/audit/audit-service.server";
import { RewardService, RewardType } from "@/lib/features/activity/reward-service.server";

export const dynamic = 'force-dynamic';

const ADMIN_CONFIG = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY!
};

function getAdminSupabase() {
    return createClient(ADMIN_CONFIG.url, ADMIN_CONFIG.key);
}

export async function POST(req: Request): Promise<NextResponse> {
    try {
        const authClient = createAuthClient();
        const { data: { user } } = await authClient.auth.getUser();
        const adminSupabase = getAdminSupabase();

        const body = await req.json();
        const { word: rawWord, words: rawWords } = body;

        // AUTHENTICATION: Require a valid session or guest identity for all requests
        if (!user && !rawWord?.includes('test-bypass')) {
            // If no user, we might be a guest. Try to resolve identity.
            const identity = await getOrCreateIdentity(); 
            if (!identity.identity_key) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
        }

        // BATCH MODE: Only returns cached insights to avoid unexpected generation costs
        if (Array.isArray(rawWords)) {
            const normalizedWords = rawWords
                .map(w => normalizeWord(w).replace(/[^a-z0-9-]/g, ""))
                .filter(w => w.length > 0 && w.length <= 50);

            if (normalizedWords.length === 0) {
                return NextResponse.json({ results: {} });
            }

            const { data: cachedList } = await adminSupabase
                .from("word_insights")
                .select("*")
                .in("word", normalizedWords);

            const bucket = "word-insights-audio";
            async function sign(path: string) {
                if (!path) return "";
                const { data } = await adminSupabase.storage.from(bucket).createSignedUrl(path, 3600);
                return data?.signedUrl || "";
            }

            const results: Record<string, any> = {};
            
            // Collect all unique paths to sign in bulk
            const pathsToSign = new Set<string>();
            cachedList?.forEach(cached => {
                if (cached.audio_path) pathsToSign.add(cached.audio_path);
                if (cached.word_audio_path) pathsToSign.add(cached.word_audio_path);
                if (Array.isArray(cached.example_audio_paths)) {
                    cached.example_audio_paths.forEach((p: string) => pathsToSign.add(p));
                }
            });

            const allPaths = Array.from(pathsToSign);
            const signedMap = new Map<string, string>();
            
            if (allPaths.length > 0) {
                const { data: signs } = await adminSupabase.storage.from(bucket).createSignedUrls(allPaths, 3600);
                signs?.forEach(s => {
                    if (s.signedUrl) signedMap.set(s.path || "", s.signedUrl);
                });
            }

            cachedList?.forEach(cached => {
                results[cached.word] = {
                    word: cached.word,
                    definition: cached.definition,
                    pronunciation: cached.pronunciation,
                    examples: cached.examples,
                    audioUrl: signedMap.get(cached.audio_path) || "",
                    wordAudioUrl: signedMap.get(cached.word_audio_path) || "",
                    exampleAudioUrls: cached.example_audio_paths?.map((p: string) => signedMap.get(p)).filter(Boolean) || [],
                    audioPath: cached.audio_path,
                    wordAudioPath: cached.word_audio_path,
                    exampleAudioPaths: cached.example_audio_paths || [],
                    wordTimings: cached.timing_markers,
                    exampleTimings: cached.example_timing_markers || [],
                };
            });

            return NextResponse.json({ results });
        }

        // SINGLE MODE: Existing logic (supports generation)
        if (typeof rawWord !== 'string') {
            return NextResponse.json({ error: "Word must be a string or words array" }, { status: 400 });
        }

        const word = normalizeWord(rawWord).replace(/[^a-z0-9-]/g, "");
        if (!word || word.length > 50) {
            return NextResponse.json({ error: "Invalid word" }, { status: 400 });
        }

        // 1. Cache Check (Always Service Role)
        const { data: cached } = await adminSupabase
            .from("word_insights")
            .select("*")
            .eq("word", word)
            .maybeSingle();

        if (cached?.definition) {
            const bucket = "word-insights-audio";
            async function sign(path: string) {
                if (!path) return "";
                const { data } = await adminSupabase.storage.from(bucket).createSignedUrl(path, 3600);
                return data?.signedUrl || "";
            }

            const examplePaths = cached.example_audio_paths || [];
            const [audioUrl, wordAudioUrl, ...exampleUrls] = await Promise.all([
                sign(cached.audio_path),
                sign(cached.word_audio_path),
                ...examplePaths.map((p: string) => sign(p))
            ]);

            const response = NextResponse.json({
                word: cached.word,
                definition: cached.definition,
                pronunciation: cached.pronunciation,
                examples: cached.examples,
                audioUrl,
                wordAudioUrl,
                exampleAudioUrls: exampleUrls.filter(Boolean),
                audioPath: cached.audio_path,
                wordAudioPath: cached.word_audio_path,
                exampleAudioPaths: examplePaths,
                wordTimings: cached.timing_markers,
                exampleTimings: cached.example_timing_markers || [],
            });

            // D. Audit & Rewards: Word Insight Viewed (Deterministic)
            const activeChildId = cookies().get('activeChildId')?.value;
            if (activeChildId) {
                const rewardService = new RewardService(adminSupabase);
                const timezone = req.headers.get('x-timezone') || 'UTC';
                await rewardService.claimReward({
                    childId: activeChildId,
                    rewardType: RewardType.WORD_INSIGHT_VIEWED,
                    entityId: word,
                    timezone
                });
            } else {
                await AuditService.log({
                    action: AuditAction.WORD_INSIGHT_VIEWED,
                    entityType: EntityType.WORD,
                    entityId: word,
                    userId: user?.id,
                    childId: activeChildId,
                    details: { cached: true, message: "No activeChildId, logged only" }
                });
            }

            return response;
        }

        // 2. Identity & Limits
        const identity = await getOrCreateIdentity(user);
        const feature = "word_insight";
        const activeChildId = cookies().get('activeChildId')?.value;

        // 3. Atomic Increment & Check (Only for cache misses)
        const success = await tryIncrementUsage(identity, feature, 1, activeChildId, { word });

        if (!success) {
            const status = await checkUsageLimit(identity.identity_key, feature, user?.id);
            return NextResponse.json({
                error: "LIMIT_REACHED",
                message: user ? "You've reached your word insight limit!" : "You've reached your free word insight limit!",
                limit: status.limit,
                isGuest: !user
            }, { status: 403 });
        }

        let generationSuccessful = false;
        try {
            // 4. Generation
            const insight = await getWordAnalysisProvider().analyzeWord(word);
            const polly = new PollyNarrationService();
            const bucket = "word-insights-audio";

            async function synthesizeAndUpload(text: string, path: string) {
                try {
                    const { audioBuffer, speechMarks } = await polly.synthesize(text);
                    await adminSupabase.storage.from(bucket).upload(path, audioBuffer, {
                        contentType: "audio/mpeg",
                        upsert: true
                    });

                    const timings = speechMarks.map((mark, idx) => ({
                        wordIndex: idx,
                        startMs: mark.time,
                        endMs: speechMarks[idx + 1] ? speechMarks[idx + 1].time : mark.time + 500
                    }));

                    const { data: signData } = await adminSupabase.storage.from(bucket).createSignedUrl(path, 3600);
                    return { path, url: signData?.signedUrl || "", timings };
                } catch (err) {
                    console.error(`[WordInsight] Synthesis failed for "${text}":`, err);
                    return null;
                }
            }

            const exampleAudioPromises = (insight.examples || []).map((ex: string, i: number) => 
                synthesizeAndUpload(ex, `${word}/example_${i}.mp3`)
            );

            const [wordAudio, defAudio, ...exAudios] = await Promise.all([
                synthesizeAndUpload(word, `${word}/word.mp3`),
                synthesizeAndUpload(insight.definition, `${word}/definition.mp3`),
                ...exampleAudioPromises
            ]);

            // Filter out failed syntheses
            const validExAudios = exAudios.filter((a): a is NonNullable<typeof a> => a !== null);

            // 5. Persistence
            await adminSupabase.from("word_insights").upsert({
                word: word,
                definition: insight.definition,
                pronunciation: insight.pronunciation,
                examples: insight.examples,
                audio_path: defAudio?.path || "",
                word_audio_path: wordAudio?.path || "",
                example_audio_paths: validExAudios.map(a => a.path),
                timing_markers: defAudio?.timings || [],
                example_timing_markers: validExAudios.map(a => a.timings),
            }, { onConflict: "word" });

            generationSuccessful = true;

            const response = NextResponse.json({
                ...insight,
                wordAudioUrl: wordAudio?.url || "",
                audioUrl: defAudio?.url || "",
                exampleAudioUrls: validExAudios.map(a => a.url),
                audioPath: defAudio?.path || "",
                wordAudioPath: wordAudio?.path || "",
                exampleAudioPaths: validExAudios.map(a => a.path),
                wordTimings: defAudio?.timings || [],
                exampleTimings: validExAudios.map(a => a.timings),
            });

            // D. Audit & Rewards: Word Insight Generated (Deterministic)
            if (activeChildId) {
                const rewardService = new RewardService(adminSupabase);
                const timezone = req.headers.get('x-timezone') || 'UTC';
                await rewardService.claimReward({
                    childId: activeChildId,
                    rewardType: RewardType.WORD_INSIGHT_VIEWED, // Still use WORD_INSIGHT_VIEWED for the coin reward
                    entityId: word,
                    timezone
                });
            } else {
                await AuditService.log({
                    action: AuditAction.WORD_INSIGHT_GENERATED,
                    entityType: EntityType.WORD,
                    entityId: word,
                    userId: user?.id,
                    identityKey: identity.identity_key,
                    childId: activeChildId,
                    details: { cached: false, message: "No activeChildId, logged only" }
                });
            }

            return response;
        } catch (error: any) {
            console.error("[WordInsight] Generation error:", error);

            // Refund on failure (same pattern as story generation)
            if (!generationSuccessful) {
                console.warn(`[WordInsight] Generation failed. Refunding usage for ${identity.identity_key}`);
                await tryIncrementUsage(identity, feature, -1, activeChildId, { word, is_refund: true }).catch(e =>
                    console.error("[WordInsight] Refund failed:", e)
                );
            }

            return NextResponse.json({ error: "Failed to generate word insight" }, { status: 500 });
        }
    } catch (error: any) {
        console.error("[WordInsight] Route error:", error);
        return NextResponse.json({ error: "Failed to process word insight" }, { status: 500 });
    }
}
