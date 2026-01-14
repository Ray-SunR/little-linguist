import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { PollyNarrationService } from "@/lib/features/narration/polly-service.server";
import { normalizeWord } from "@/lib/core";
import { getWordAnalysisProvider } from "@/lib/features/word-insight/server/factory";
import { createClient as createAuthClient } from "@/lib/supabase/server";
import { getOrCreateIdentity, checkUsageLimit, tryIncrementUsage } from "@/lib/features/usage/usage-service.server";
import { AuditService, AuditAction, EntityType } from "@/lib/features/audit/audit-service.server";

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

        const { word: rawWord } = await req.json();
        if (typeof rawWord !== 'string') {
            return NextResponse.json({ error: "Word must be a string" }, { status: 400 });
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

            const [audioUrl, wordAudioUrl, exampleAudioUrl] = await Promise.all([
                sign(cached.audio_path),
                sign(`${word}/word.mp3`),
                sign(`${word}/example_0.mp3`)
            ]);

            const response = NextResponse.json({
                word: cached.word,
                definition: cached.definition,
                pronunciation: cached.pronunciation,
                examples: cached.examples,
                audioUrl,
                wordAudioUrl,
                exampleAudioUrls: exampleAudioUrl ? [exampleAudioUrl] : [],
                audioPath: cached.audio_path,
                wordAudioPath: `${word}/word.mp3`,
                exampleAudioPaths: [`${word}/example_0.mp3`],
                wordTimings: cached.timing_markers,
                exampleTimings: [],
            });

            // Audit: Word Insight Viewed (Cache Hit)
            const activeChildId = cookies().get('activeChildId')?.value;
            await AuditService.log({
                action: AuditAction.WORD_INSIGHT_VIEWED,
                entityType: EntityType.WORD,
                entityId: word,
                userId: user?.id,
                childId: activeChildId,
                details: { cached: true }
            });

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

            const [wordAudio, defAudio, exAudio] = await Promise.all([
                synthesizeAndUpload(word, `${word}/word.mp3`),
                synthesizeAndUpload(insight.definition, `${word}/definition.mp3`),
                insight.examples?.[0] ? synthesizeAndUpload(insight.examples[0], `${word}/example_0.mp3`) : Promise.resolve(null)
            ]);

            // 5. Persistence
            await adminSupabase.from("word_insights").upsert({
                word: word,
                definition: insight.definition,
                pronunciation: insight.pronunciation,
                examples: insight.examples,
                audio_path: defAudio?.path || "",
                timing_markers: defAudio?.timings || [],
            }, { onConflict: "word" });

            generationSuccessful = true;

            const response = NextResponse.json({
                ...insight,
                wordAudioUrl: wordAudio?.url || "",
                audioUrl: defAudio?.url || "",
                exampleAudioUrls: exAudio ? [exAudio.url] : [],
                audioPath: defAudio?.path || "",
                wordAudioPath: wordAudio?.path || "",
                exampleAudioPaths: exAudio ? [exAudio.path] : [],
                wordTimings: defAudio?.timings || [],
                exampleTimings: exAudio ? [exAudio.timings] : [],
            });

            // Audit: Word Insight Generated (Cache Miss)
            await AuditService.log({
                action: AuditAction.WORD_INSIGHT_GENERATED,
                entityType: EntityType.WORD,
                entityId: word,
                userId: user?.id,
                identityKey: identity.identity_key,
                childId: activeChildId,
                details: { cached: false }
            });

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
