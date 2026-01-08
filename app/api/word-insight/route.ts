import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { createClient } from "@supabase/supabase-js";
import { PollyNarrationService } from "@/lib/features/narration/polly-service.server";
import { normalizeWord } from "@/lib/core";
import { getWordAnalysisProvider } from "@/lib/features/word-insight/server/factory";
import { createClient as createAuthClient } from "@/lib/supabase/server";

const getSupabase = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        throw new Error("Missing Supabase environment variables");
    }
    return createClient(url, key);
};

export async function POST(req: Request) {
    try {
        // 0. Auth check
        const authClient = createAuthClient();
        const { data: { user } } = await authClient.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const rawWord = body?.word;

        if (typeof rawWord !== 'string') {
            return NextResponse.json({ error: "Word must be a string" }, { status: 400 });
        }

        // Strict sanitization: only allow lowercase letters and hyphens for storage paths
        const word = normalizeWord(rawWord).replace(/[^a-z0-9-]/g, "");

        if (!word || word.length > 50) {
            return NextResponse.json({ error: "Invalid word" }, { status: 400 });
        }

        // Instantiate Supabase client (service-role needed for storage and upserts)
        const supabase = getSupabase();

// 1. Check Cache
        const { data: cached, error: dbError } = await supabase
            .from("word_insights")
            .select("*")
            .eq("word", word)
            .maybeSingle();

        if (dbError) {
            console.error("Database fetch error:", dbError);
        }

        if (cached && cached.definition) {
            const bucket = "word-insights-audio";
            const sign = async (path: string) => {
                if (!path) return "";
                const { data, error: signError } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
                return data?.signedUrl || "";
            };

            const [audioUrl, wordAudioUrl, exampleAudioUrl] = await Promise.all([
                sign(cached.audio_path),
                sign(`${word}/word.mp3`),
                sign(`${word}/example_0.mp3`)
            ]);

            return NextResponse.json({
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
        }

        // 2. Generate Insight with Provider
        const provider = getWordAnalysisProvider();
        const insight = await provider.analyzeWord(word);

        // 3. Generate Multiple Audios with Polly
        const polly = new PollyNarrationService();
        const bucket = "word-insights-audio";

        const synthesizeAndUpload = async (text: string, path: string) => {
            try {
                const { audioBuffer, speechMarks } = await polly.synthesize(text);
                const { error: uploadError } = await supabase.storage.from(bucket).upload(path, audioBuffer, {
                    contentType: "audio/mpeg",
                    upsert: true
                });

                if (uploadError) throw uploadError;

                const timings = speechMarks.map((mark, idx) => ({
                    wordIndex: idx,
                    startMs: mark.time,
                    endMs: speechMarks[idx + 1] ? speechMarks[idx + 1].time : mark.time + 500
                }));

                const { data: signData } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);

                return { path, url: signData?.signedUrl || "", timings };
            } catch (err) {
                console.error(`Synthesis failed for "${text}":`, err);
                return null;
            }
        };

        const [wordAudio, defAudio, exAudio] = await Promise.all([
            synthesizeAndUpload(word, `${word}/word.mp3`),
            synthesizeAndUpload(insight.definition, `${word}/definition.mp3`),
            insight.examples?.[0] ? synthesizeAndUpload(insight.examples[0], `${word}/example_0.mp3`) : Promise.resolve(null)
        ]);

        // 4. Save to Database

        const { error: upsertError } = await supabase.from("word_insights").upsert({
            word: word,
            definition: insight.definition,
            pronunciation: insight.pronunciation,
            examples: insight.examples,
            audio_path: defAudio?.path || "", // Only supported audio column
             // Audio paths are generated on-demand, not stored in word_insights
            timing_markers: defAudio?.timings || [],
        }, { onConflict: "word" });

        if (upsertError) {
            console.error("Database upsert error:", upsertError);
        }

        return NextResponse.json({
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

    } catch (error: any) {
        console.error("Word insight error:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch word insight" }, { status: 500 });
    }
}
