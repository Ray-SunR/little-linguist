import { NovaStoryService } from "../lib/features/nova/nova-service.server";
import { ClaudeStoryService } from "../lib/features/bedrock/claude-service.server";
import { PollyNarrationService } from "../lib/features/narration/polly-service.server";
import { Tokenizer } from "../lib/core/books/tokenizer";
import { TextChunker } from "../lib/core/books/text-chunker";
import { alignSpeechMarksToTokens, getWordTokensForChunk } from "../lib/core/books/speech-mark-aligner";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const MANIFESTO_PATH = path.join(process.cwd(), 'data/seed-manifesto.json');
const OUTPUT_DIR = path.join(process.cwd(), 'output/seed-library');
const STATE_FILE = path.join(OUTPUT_DIR, 'state.json');

function sanitizeTheme(theme: string | null): string {
    if (!theme) return "";
    return theme
        .replace(/Justice League/gi, "a legendary team of heroes")
        .replace(/Avengers/gi, "a team of mighty superheroes")
        .replace(/Spidey/gi, "a friendly spider hero")
        .replace(/Disney Princess/gi, "a magical princess in a fairy tale kingdom")
        .replace(/Star Wars/gi, "a galactic space adventure")
        .replace(/Harry Potter/gi, "a young wizard in a magical school")
        .replace(/Minecraft/gi, "a world of blocks and building");
}

const LEVEL_SPECS: Record<string, { minWords: number, targetWords: number, sceneCount: number, sentencesPerScene: number, complexity: string }> = {
    "PreK": { minWords: 25, targetWords: 50, sceneCount: 2, sentencesPerScene: 2, complexity: "very simple, rhythmic, toddler-friendly" },
    "K": { minWords: 60, targetWords: 100, sceneCount: 3, sentencesPerScene: 4, complexity: "simple sentences, clear narrative" },
    "G1-2": { minWords: 150, targetWords: 250, sceneCount: 5, sentencesPerScene: 6, complexity: "short paragraphs, descriptive" },
    "G3-5": { minWords: 350, targetWords: 500, sceneCount: 8, sentencesPerScene: 10, complexity: "detailed narrative, advanced vocabulary, long paragraphs" }
};

function getSeed(id: string): number {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        const char = id.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash) % 858993459; // Nova Canvas seed limit
}

async function main() {
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const manifesto = JSON.parse(fs.readFileSync(MANIFESTO_PATH, 'utf8'));
    let state = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : { completed: [] };

    const nova = new NovaStoryService();
    const claude = new ClaudeStoryService();
    const polly = new PollyNarrationService();

    // --- Critical Repair & Quality Check ---
    console.log(`\n🔍 Checking for books needing repair (short length or bad styles)...`);
    for (const entryId of state.completed) {
        const entry = manifesto.find((e: any) => e.id === entryId);
        if (!entry) continue;

        const bookDir = path.join(OUTPUT_DIR, entry.category, entry.id);
        const metaPath = path.join(bookDir, 'metadata.json');

        if (fs.existsSync(metaPath)) {
            const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
            const specs = LEVEL_SPECS[entry.level];
            const currentWordCount = meta.stats?.word_count || 0;

            // Mark for re-generation if way too short or missing cover prompt
            if (currentWordCount < specs.minWords || !meta.cover_prompt) {
                console.log(`  ⚠️ Book ${entry.id} needs repair (Words: ${currentWordCount}/${specs.minWords})`);
                state.completed = state.completed.filter((id: string) => id !== entry.id);
                // We'll let the main loop pick it up again
            }
        }
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

    console.log(`\n🚀 Starting generation for remaining ${manifesto.length - state.completed.length} books...`);

    for (const entry of manifesto) {
        if (state.completed.includes(entry.id)) {
            console.log(`⏩ Skipping ${entry.id} (already generated)`);
            continue;
        }

        console.log(`\n📚 Generating: [${entry.category}] ${entry.title} (${entry.level})`);

        const bookSeed = getSeed(entry.id);

        try {
            const specs = LEVEL_SPECS[entry.level];
            let pages: any[] = [];
            let fullText = "";
            let wordCount = 0;
            let attempts = 0;
            const maxAttempts = 3;

            // 1. Generate Story with Word Count Validation
            while (attempts < maxAttempts) {
                attempts++;
                console.log(`  📝 Story Attempt ${attempts}/${maxAttempts}...`);

                const themeText = attempts === maxAttempts ?
                    `a very safe and general story about ${entry.category}` :
                    sanitizeTheme(entry.brand_theme || entry.title);

                const prompt = `Write a ${entry.is_nonfiction ? 'non-fiction' : 'fiction'} story for a child at ${entry.level} reading level about ${entry.category}.
                Theme Focus: ${themeText}.
                Target total word count: ${specs.targetWords} words.
                Complexity: ${specs.complexity}.
                Structure: Split into EXACTLY ${specs.sceneCount} scenes.
                Requirement: Each scene MUST contain at least ${specs.sentencesPerScene} descriptive sentences.
                Format as JSON array: [{ "text": "...", "imagePrompt": "..." }]
                IMPORTANT: For G3-5, each scene must be a substantial paragraph. Use engaging and age-appropriate storytelling.`;

                try {
                    pages = await claude.generateStory(prompt);
                    fullText = pages.map(p => p.text).join('\n\n');
                    wordCount = Tokenizer.getWords(Tokenizer.tokenize(fullText)).length;

                    if (wordCount >= specs.minWords) {
                        console.log(`  ✅ Story generated successfully (${wordCount} words)`);
                        break;
                    } else {
                        console.warn(`  ⚠️ Story too short (${wordCount}/${specs.minWords} words). Retrying...`);
                    }
                } catch (storyErr: any) {
                    if (storyErr.name === 'ValidationException' || storyErr.message?.includes('content filters')) {
                        console.error(`  ❌ Story blocked by content filter. Retrying with generic prompt...`);
                    } else {
                        throw storyErr;
                    }
                }
            }

            if (wordCount < specs.minWords) {
                throw new Error(`Failed to generate story of sufficient length for ${entry.id} after ${maxAttempts} attempts.`);
            }

            const tokens = Tokenizer.tokenize(fullText);
            const charCount = fullText.length;

            const bookDir = path.join(OUTPUT_DIR, entry.category, entry.id);
            if (fs.existsSync(bookDir)) {
                fs.rmSync(bookDir, { recursive: true, force: true });
            }
            fs.mkdirSync(bookDir, { recursive: true });
            fs.mkdirSync(path.join(bookDir, 'scenes'), { recursive: true });
            fs.mkdirSync(path.join(bookDir, 'audio'), { recursive: true });

            // --- Generate Assets ---
            console.log(`  🖼️ Generating Smart Cover...`);
            const smartCoverPrompt = await claude.generateCoverPrompt(fullText);
            let base64Cover = "";
            try {
                base64Cover = await nova.generateImage(smartCoverPrompt, bookSeed);
            } catch (coverErr: any) {
                if (coverErr.name === 'ValidationException' || coverErr.message?.includes('content filters')) {
                    console.warn(`  ⚠️ Cover image blocked. Falling back to generic...`);
                    base64Cover = await nova.generateImage(`A beautiful children's book cover for a story titled "${entry.title}" about ${entry.category}`, bookSeed);
                } else {
                    throw coverErr;
                }
            }
            fs.writeFileSync(path.join(bookDir, 'cover.png'), Buffer.from(base64Cover, 'base64'));

            let currentWordIndex = 0;
            const scenes = [];

            for (let i = 0; i < pages.length; i++) {
                console.log(`  🎨 Scene ${i + 1}/${pages.length}...`);
                let base64Image = "";
                try {
                    base64Image = await nova.generateImage(pages[i].imagePrompt, bookSeed);
                } catch (imgErr: any) {
                    if (imgErr.name === 'ValidationException' || imgErr.message?.includes('content filters')) {
                        console.warn(`  ⚠️ Scene image blocked. Falling back to generic...`);
                        base64Image = await nova.generateImage(`A children's book illustration of ${entry.category}`, bookSeed);
                    } else {
                        throw imgErr;
                    }
                }
                const imageFilename = `scene_${i}.png`;
                fs.writeFileSync(path.join(bookDir, 'scenes', imageFilename), Buffer.from(base64Image, 'base64'));

                const sceneTokens = Tokenizer.tokenize(pages[i].text);
                const sceneWordCount = Tokenizer.getWords(sceneTokens).length;
                const afterIndex = currentWordIndex + sceneWordCount - 1;

                scenes.push({
                    index: i,
                    text: pages[i].text,
                    imagePrompt: pages[i].imagePrompt,
                    image_path: `scenes/${imageFilename}`,
                    after_word_index: afterIndex
                });

                currentWordIndex += sceneWordCount;
            }

            console.log(`  🎙️ Narration...`);
            const voiceId = process.env.POLLY_VOICE_ID || 'Kevin';
            const textChunks = TextChunker.chunk(fullText);
            const audioShards = [];

            for (const chunk of textChunks) {
                const { audioBuffer, speechMarks } = await polly.synthesize(chunk.text);
                const audioFilename = `${chunk.index}.mp3`;
                fs.writeFileSync(path.join(bookDir, 'audio', audioFilename), audioBuffer);

                const wordTokensForChunk = getWordTokensForChunk(tokens, chunk.startWordIndex, chunk.endWordIndex);
                const alignedTimings = alignSpeechMarksToTokens(speechMarks, wordTokensForChunk);

                audioShards.push({
                    index: chunk.index,
                    path: `audio/${audioFilename}`,
                    start_word_index: chunk.startWordIndex,
                    end_word_index: chunk.endWordIndex,
                    timings: alignedTimings
                });
            }

            // Save Metadata
            const metadata = {
                id: entry.id,
                title: entry.title,
                category: entry.category,
                level: entry.level,
                is_nonfiction: entry.is_nonfiction,
                brand_theme: entry.brand_theme,
                series_id: entry.series_id,
                cover_image_path: 'cover.png',
                cover_prompt: smartCoverPrompt,
                stats: {
                    word_count: wordCount,
                    char_count: charCount,
                    scene_count: pages.length,
                    reading_time_seconds: Math.ceil(wordCount / 2.5),
                    length_category: wordCount < 100 ? "Short" : wordCount < 300 ? "Medium" : "Long"
                },
                scenes: scenes,
                audio: {
                    voice_id: voiceId,
                    shards: audioShards
                },
                tokens: tokens
            };

            fs.writeFileSync(path.join(bookDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
            fs.writeFileSync(path.join(bookDir, 'content.txt'), fullText);

            state.completed.push(entry.id);
            fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
            console.log(`✅ Completed ${entry.id} (${wordCount} words)`);

        } catch (err) {
            console.error(`❌ Failed ${entry.id}:`, err);
        }
    }
}

main().catch(console.error);
