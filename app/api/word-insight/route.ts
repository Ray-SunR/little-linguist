import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PollyNarrationService } from "@/lib/features/narration/polly-service.server";
import { normalizeWord } from "@/lib/core";
import { getWordAnalysisProvider } from "@/lib/features/word-insight/server/factory";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    try {
        const { word: rawWord } = await req.json();
        const word = normalizeWord(rawWord);

        if (!word) {
            return NextResponse.json({ error: "Invalid word" }, { status: 400 });
        }

        // 1. Check Cache
        const { data: cached, error: dbError } = await supabase
            .from("word_insights")
            .select("*")
            .eq("word", word)
            .maybeSingle();

        if (cached) {
            // Resolve signed URL for audio if exists
            let audioUrl = "";
            if (cached.audio_path) {
                const { data: signData } = await supabase.storage
                    .from("word-insights-audio")
                    .createSignedUrl(cached.audio_path, 3600);
                audioUrl = signData?.signedUrl || "";
            }

            return NextResponse.json({
                word: cached.word,
                definition: cached.definition,
                pronunciation: cached.pronunciation,
                examples: cached.examples,
                audioUrl,
                wordTimings: cached.timing_markers,
            });
        }

        // 2. Generate Insight with Provider
        const provider = getWordAnalysisProvider();
        const insight = await provider.analyzeWord(word);

        // 3. Generate Audio for Definition with Polly
        let audioPath = "";
        let wordTimings: any[] = [];
        let signedAudioUrl = "";

        try {
            const polly = new PollyNarrationService();
            const { audioBuffer, speechMarks } = await polly.synthesize(insight.definition);

            audioPath = `${word}/definition.mp3`;
            const { error: uploadError } = await supabase.storage
                .from("word-insights-audio")
                .upload(audioPath, audioBuffer, {
                    contentType: "audio/mpeg",
                    upsert: true
                });

            if (uploadError) throw uploadError;

            // Map speech marks to WordTimings
            // Polly marks: { time: ms, type: "word", value: "word" }
            wordTimings = speechMarks.map((mark, idx) => ({
                wordIndex: idx,
                startMs: mark.time,
                endMs: speechMarks[idx + 1] ? speechMarks[idx + 1].time : mark.time + 500 // estimate end
            }));

            const { data: signData } = await supabase.storage
                .from("word-insights-audio")
                .createSignedUrl(audioPath, 3600);
            signedAudioUrl = signData?.signedUrl || "";

        } catch (ttsError) {
            console.error("TTS generation failed for word insight:", ttsError);
            // Non-fatal, return insight without audio
        }

        // 4. Save to Database
        await supabase.from("word_insights").upsert({
            word,
            definition: insight.definition,
            pronunciation: insight.pronunciation,
            examples: insight.examples,
            audio_path: audioPath,
            timing_markers: wordTimings,
        }, { onConflict: "word" });

        return NextResponse.json({
            ...insight,
            audioUrl: signedAudioUrl,
            wordTimings,
        });

    } catch (error: any) {
        console.error("Word insight error:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch word insight" }, { status: 500 });
    }
}
