import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PollyNarrationService } from "@/lib/features/narration/polly-service.server";
import { normalizeWord } from "@/lib/core";
import { getWordAnalysisProvider } from "@/lib/features/word-insight/server/factory";

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
        const supabase = getSupabase();
        const { word: rawWord } = await req.json();

        // Strict sanitization: only allow lowercase letters and hyphens for storage paths
        const word = normalizeWord(rawWord).replace(/[^a-z0-9-]/g, "");

        if (!word || word.length > 50) {
            return NextResponse.json({ error: "Invalid word" }, { status: 400 });
        }

        // 1. Check Cache
        const { data: cached, error: dbError } = await supabase
            .from("word_insights")
            .select("*")
            .eq("word", word)
            .maybeSingle();

        if (dbError) {
            console.error("Database fetch error:", dbError);
            // Non-fatal, proceed to generation
        }

        if (cached) {
            const bucket = "word-insights-audio";

            // Check if this is an "old" entry that needs migration/update
            // If audio_path exists but word_audio_path doesn't, it might be a partial entry
            const needsUpdate = !cached.word_audio_path || !cached.example_audio_paths?.length;

            if (!needsUpdate) {
                const sign = async (path: string) => {
                    if (!path) return "";
                    const { data, error: signError } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
                    if (signError) {
                        console.warn(`Failed to sign URL for ${path}:`, signError);
                        return "";
                    }
                    return data?.signedUrl || "";
                };

                const [audioUrl, wordAudioUrl, exampleAudioUrl] = await Promise.all([
                    sign(cached.audio_path),
                    sign(cached.word_audio_path),
                    cached.example_audio_paths?.[0] ? sign(cached.example_audio_paths[0]) : Promise.resolve("")
                ]);

                return NextResponse.json({
                    word: cached.word,
                    definition: cached.definition,
                    pronunciation: cached.pronunciation,
                    examples: cached.examples,
                    audioUrl, // Definition
                    wordAudioUrl,
                    exampleAudioUrls: exampleAudioUrl ? [exampleAudioUrl] : [],
                    audioPath: cached.audio_path,
                    wordAudioPath: cached.word_audio_path,
                    exampleAudioPaths: cached.example_audio_paths || [],
                    wordTimings: cached.timing_markers, // Definition timings
                    exampleTimings: cached.example_timing_markers || [],
                });
            }
            // Fall through to regeneration if needsUpdate is true
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

                if (uploadError) {
                    throw uploadError;
                }

                const timings = speechMarks.map((mark, idx) => ({
                    wordIndex: idx,
                    startMs: mark.time,
                    endMs: speechMarks[idx + 1] ? speechMarks[idx + 1].time : mark.time + 500
                }));

                const { data: signData, error: signError } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
                if (signError) {
                    throw signError;
                }

                return {
                    path,
                    url: signData?.signedUrl || "",
                    timings
                };
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
            word,
            definition: insight.definition,
            pronunciation: insight.pronunciation,
            examples: insight.examples,
            audio_path: defAudio?.path || "",
            word_audio_path: wordAudio?.path || "",
            example_audio_paths: exAudio ? [exAudio.path] : [],
            timing_markers: defAudio?.timings || [], // Primary markers are for definition
            example_timing_markers: exAudio ? [exAudio.timings] : [],
        }, { onConflict: "word" });

        if (upsertError) {
            console.error("Database upsert error:", upsertError);
            // Continue to return the freshly generated data even if save failed
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
