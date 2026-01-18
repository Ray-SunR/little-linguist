import { PollyNarrationService } from "../lib/features/narration/polly-service.server";
import { NarrativeDirector } from "../lib/features/narration/narrative-director.server";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config({ path: ".env.local" });

async function verify() {
    console.log("🚀 Starting TTS Verification...");

    const polly = new PollyNarrationService();
    const director = new NarrativeDirector();

    const testText = "The little monkey looked up at the high mountain. 'I can do it!' he shouted with a big smile. He took a deep breath and started to climb.";
    const level = "G1-2";

    console.log(`\n📝 Original Text: "${testText}"`);
    console.log(`📊 Level: ${level}`);

    try {
        console.log("\n🎭 Requesting Narrative Annotation...");
        const annotation = await director.annotate(testText, level);
        console.log("✅ Annotation Received:");
        console.log(JSON.stringify(annotation, null, 2));

        console.log("\n🎙️ Requesting Polly Generative Synthesis...");
        const { audioBuffer, speechMarks } = await polly.synthesize(annotation.ssml, {
            textType: "ssml",
            voiceId: annotation.metadata.suggestedVoice || "Ruth",
            engine: "generative"
        });

        console.log(`✅ Audio Generated: ${audioBuffer.length} bytes`);
        console.log(`✅ Speech Marks Received: ${speechMarks.length} marks`);

        const outputDir = path.join(process.cwd(), "output/debug-tts");
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        const audioPath = path.join(outputDir, "verify-ruth.mp3");
        fs.writeFileSync(audioPath, audioBuffer);

        const marksPath = path.join(outputDir, "verify-ruth.json");
        fs.writeFileSync(marksPath, JSON.stringify(speechMarks, null, 2));

        console.log(`\n🎉 Verification files saved to: ${outputDir}`);
        console.log("Please listen to the audio file to confirm the quality.");

    } catch (err) {
        console.error("❌ Verification failed:", err);
        process.exit(1);
    }
}

verify();
