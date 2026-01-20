import { PollyNarrationService } from "../../lib/features/narration/polly-service.server";
import { NarrativeDirector } from "../../lib/features/narration/narrative-director.server";
import { TextChunker } from "../../lib/core/books/text-chunker";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config({ path: ".env.local" });

async function reNarrate(bookIdOrPath: string) {
    console.log(`🚀 Starting Re-narration for ${bookIdOrPath}...`);

    const polly = new PollyNarrationService();
    const director = new NarrativeDirector();

    // Resolve path (assuming it's in sunwukong for now or absolute)
    let bookDir = bookIdOrPath;
    if (!fs.existsSync(bookDir)) {
        // Try discovery in common locations
        const baseDir = path.join(process.cwd(), "output/expanded-library");
        // Deep search for metadata.json containing the id
        const findBookDir = (dir: string): string | null => {
            const items = fs.readdirSync(dir);
            if (items.includes("metadata.json")) {
                const meta = JSON.parse(fs.readFileSync(path.join(dir, "metadata.json"), "utf8"));
                if (meta.id === bookIdOrPath) return dir;
            }
            for (const item of items) {
                const fullPath = path.join(dir, item);
                if (fs.statSync(fullPath).isDirectory()) {
                    const result = findBookDir(fullPath);
                    if (result) return result;
                }
            }
            return null;
        };
        const found = findBookDir(baseDir);
        if (!found) {
            throw new Error(`Could not find book directory for ID ${bookIdOrPath}`);
        }
        bookDir = found;
    }

    console.log(`📂 Found book directory: ${bookDir}`);
    const metadataPath = path.join(bookDir, "metadata.json");
    const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
    const scenes = metadata.scenes || metadata.sections || [];
    let fullText = "";
    if (scenes.length > 0) {
        fullText = scenes.map((s: any) => s.text).join("\n\n");
    } else if (metadata.tokens && metadata.tokens.length > 0) {
        console.log("📝 No scenes found, reconstructing text from tokens...");
        fullText = metadata.tokens.map((t: any) => t.t).join("");
    } else {
        throw new Error("No source text found (scenes or tokens are missing)");
    }

    metadata.scenes = scenes;
    const textChunks = TextChunker.chunk(fullText);
    const audioDir = path.join(bookDir, "audio");
    if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

    const newAudioShards: any[] = [];
    const allSsml: string[] = new Array(textChunks.length);

    // Limit concurrency to avoid hitting rate limits too hard
    const MAX_SHARD_CONCURRENCY = 3;

    for (let i = 0; i < textChunks.length; i += MAX_SHARD_CONCURRENCY) {
        const chunkBatch = textChunks.slice(i, i + MAX_SHARD_CONCURRENCY);

        await Promise.all(chunkBatch.map(async (chunk) => {
            const idx = chunk.index;
            console.log(`🎭 Scene ${idx + 1}/${textChunks.length}: Annotating & Synthesizing (Generative)...`);

            const annotation = await director.annotate(chunk.text, metadata.level);
            allSsml[idx] = `<!-- Scene ${idx} -->\n${annotation.ssml}`;

            const { audioBuffer } = await polly.synthesize(annotation.ssml, {
                textType: "ssml",
                voiceId: annotation.metadata.suggestedVoice || "Ruth",
                engine: "generative"
            });

            const audioFilename = `${idx}.mp3`;
            fs.writeFileSync(path.join(audioDir, audioFilename), audioBuffer);

            newAudioShards[idx] = {
                index: idx,
                path: `audio/${audioFilename}`,
                start_word_index: chunk.startWordIndex,
                end_word_index: chunk.endWordIndex,
                timings: [], // NO timings for generative
                metadata: {
                    mood: annotation.metadata.mood,
                    suggestedVoice: annotation.metadata.suggestedVoice
                }
            };
        }));
    }

    // Update metadata
    metadata.audio = {
        voice_id: newAudioShards[0]?.metadata?.suggestedVoice || "Ruth",
        engine: "generative",
        shards: newAudioShards
    };

    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    // Save SSML to file
    const ssmlPath = path.join(bookDir, "content_ssml.txt");
    fs.writeFileSync(ssmlPath, allSsml.join("\n\n"));

    console.log(`\n✅ Re-narration complete for ${metadata.title}!`);
    console.log(`📝 Metadata updated at: ${metadataPath}`);
    console.log(`📜 SSML saved at: ${ssmlPath}`);
}

const target = process.argv[2] || "95ef1003-b1fc-466b-a85a-f7c5cb1b3989";
reNarrate(target).catch(console.error);
