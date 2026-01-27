
import { NovaStoryService } from "../lib/features/nova/nova-service.server";
import { StabilityStoryService } from "../lib/features/stability/stability-service.server";
import { ClaudeStoryService } from "../lib/features/bedrock/claude-service.server";
import { PollyNarrationService } from "../lib/features/narration/polly-service.server";
import { NarrativeDirector } from "../lib/features/narration/narrative-director.server";
import { Tokenizer } from "../lib/core/books/tokenizer";
import { TextChunker } from "../lib/core/books/text-chunker";
import { alignSpeechMarksToTokens, getWordTokensForChunk } from "../lib/core/books/speech-mark-aligner";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import sharp from "sharp";
import { execSync } from "child_process";

dotenv.config({ path: ".env.local" });

function log(message: string) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
}

class ProgressTracker {
    constructor(private totalBooks: number, private currentBookIndex: number) {}

    update(bookId: string, phase: number, task: string, subProgress?: { current: number, total: number }) {
        const bookStatus = `[Book ${this.currentBookIndex}/${this.totalBooks}]`;
        const phaseStatus = `[Phase ${phase}/5]`;
        let subTask = task;
        if (subProgress) {
            const pct = Math.round((subProgress.current / subProgress.total) * 100);
            const barSize = 10;
            const filled = Math.round((subProgress.current / subProgress.total) * barSize);
            const bar = '▓'.repeat(filled) + '░'.repeat(barSize - filled);
            subTask = `${task} ${subProgress.current}/${subProgress.total} [${bar}] ${pct}%`;
        }
        log(`${bookStatus} ${phaseStatus} ${bookId.padEnd(20)} | ${subTask}`);
    }
}

async function waitForFile(filePath: string, timeoutMs = 10000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        if (fs.existsSync(filePath)) return true;
        await new Promise(r => setTimeout(r, 1000));
    }
    return false;
}

async function runAlignmentWithRetry(bookDir: string, tracker: ProgressTracker, bookId: string, retries = 3): Promise<boolean> {
    const metadataPath = path.join(bookDir, 'metadata.json');
    if (!(await waitForFile(metadataPath))) {
        log(`    ❌ Alignment aborted: metadata.json missing for ${bookId}`);
        return false;
    }
    for (let i = 0; i < retries; i++) {
        try {
            tracker.update(bookId, 4, `Aligning (Attempt ${i + 1}/${retries})`);
            execSync(`python3 scripts/narration/align.py "${bookDir}"`, { stdio: 'pipe' });
            return true;
        } catch (e) {
            log(`    ⚠️ Alignment failed for ${bookId}. ${i < retries - 1 ? 'Retrying in 5s...' : 'Final failure.'}`);
            if (i < retries - 1) await new Promise(r => setTimeout(r, 5000));
        }
    }
    return false;
}

const MANIFESTO_PATH = process.env.MANIFESTO_PATH || path.join(process.cwd(), 'data/review-manifesto.json');
const OUTPUT_DIR = process.env.RAIDEN_BOOKS_PATH || '/Users/renchen/Work/github/raiden_books';
const STATE_FILE = path.join(OUTPUT_DIR, 'state.json');

const SUN_WUKONG_ANCHOR = `Sun Wukong (Monkey King): Spunky anthropomorphic male golden macaque, confident mischievous boyish grin, masculine jawline, bright golden fur, fiery-gold eyes. Strong muscular build, broad shoulders. Wearing golden chainmail armor over red tunic, tiger-skin kilt, black trousers, black combat boots. Golden fillet headband with two extremely long red pheasant feathers curving back. Holding red-and-gold iron staff. Style: Premium 3D animation, Pixar-style character design, vibrant colors, expressive studio lighting, 8k resolution.`;

const SUN_WUKONG_NEGATIVE = `feminine features, long eyelashes, makeup, girl, woman, lipstick, jewelry, rounded soft face, thin frame, fragile build, 2D, sketch, flat colors, watercolor, paper texture. No human, no gorilla, no chimp, no robotic parts, no modern street clothing.`;

const SUN_WUKONG_STYLE = `Premium 3D animation, Pixar-style character design, vibrant colors, expressive studio lighting, 8k resolution, cinematic render, Octane render, highly detailed textures.`;

function sanitizeTheme(theme: string | null): string {
    if (!theme) return "";
    return theme
        .replace(/Justice League/gi, "a legendary team of heroes")
        .replace(/Avengers/gi, "a team of mighty superheroes")
        .replace(/Iron Man/gi, "a futuristic hero in red and gold high-tech armor")
        .replace(/Hulk/gi, "a strong and friendly big green giant")
        .replace(/Captain America/gi, "a heroic leader with a star-spangled shield")
        .replace(/Thor/gi, "a mighty warrior with a red cape and a magical hammer")
        .replace(/Black Widow/gi, "a skilled and brave spy in a sleek black suit")
        .replace(/Hawkeye/gi, "a brave hero with a powerful bow and arrows")
        .replace(/Spider-Man/gi, "a friendly neighborhood hero in red and blue")
        .replace(/Superman/gi, "a superhero with a blue suit, red cape, and an S-shield")
        .replace(/Batman/gi, "a hero in a black bat-suit with pointed ears in a dark city")
        .replace(/Batwheels/gi, "heroic talking vehicles with glowing logos")
        .replace(/Hotwheels/gi, "fast and colorful racing toy cars on a looping orange track")
        .replace(/^Cars$/gi, "talking racing cars in a colorful world")
        .replace(/Lightning McQueen/gi, "a red racing car with a lightning bolt sticker")
        .replace(/Dog Man/gi, "a hero with the head of a dog and the body of a police officer in a comic book style")
        .replace(/Plants? vs\.? Zombies/gi, "brave garden plants defending a home against comical cartoon zombies")
        .replace(/Paw Patrol/gi, "a team of heroic rescue puppies with special gadgets and vehicles")
        .replace(/Spidey/gi, "a friendly spider hero in red and blue")
        .replace(/Disney Tales/gi, "magical fairy tales in an enchanted kingdom")
        .replace(/Disney Princess/gi, "a magical princess in a fairy tale kingdom")
        .replace(/Star Wars/gi, "a galactic space adventure")
        .replace(/Harry Potter/gi, "a young wizard in a magical school")
        .replace(/Minecraft/gi, "a world of blocks and building")
        .replace(/Daemon Hunter/gi, "a brave warrior with a magic sword fighting shadow monsters")
        .replace(/Sun Wukong/gi, "Sun Wukong (The Monkey King), a heroic anthropomorphic monkey warrior with golden-orange fur and myth armor. Kid-friendly, vibrant 3D animation style.");
}

const LEVEL_SPECS: Record<string, { minWords: number, targetWords: number, sceneCount: number, sentencesPerScene: number, complexity: string }> = {
    "PreK": { minWords: 250, targetWords: 300, sceneCount: 5, sentencesPerScene: 4, complexity: "simple, repetitive, high rhythm" },
    "K": { minWords: 500, targetWords: 600, sceneCount: 8, sentencesPerScene: 5, complexity: "basic narrative, sight words" },
    "G1-2": { minWords: 800, targetWords: 900, sceneCount: 10, sentencesPerScene: 6, complexity: "developing plot, descriptive" },
    "G3-5": { minWords: 1400, targetWords: 1500, sceneCount: 15, sentencesPerScene: 8, complexity: "complex narrative, advanced vocabulary, subplots" }
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

async function saveOptimizedImage(base64Data: string, outputPath: string) {
    const buffer = Buffer.from(base64Data, 'base64');
    await sharp(buffer)
        .webp({ quality: 85 })
        .toFile(outputPath);
}

async function main() {
    const args = process.argv.slice(2);
    const categoryArg = args.find(a => a.startsWith('--category='))?.split('=')[1];
    const idArg = args.find(a => a.startsWith('--id='))?.split('=')[1];
    const limitArg = args.find(a => a.startsWith('--limit='))?.split('=')[1];
    const limit = limitArg ? parseInt(limitArg, 10) : null;

    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const manifesto = JSON.parse(fs.readFileSync(MANIFESTO_PATH, 'utf8'));
    let state = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : { completed: [], inProgress: {}, failed: [] };
    if (!state.inProgress) state.inProgress = {};
    if (!state.failed) state.failed = [];

    const saveState = () => {
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    };

    const nova = new NovaStoryService();
    const stability = new StabilityStoryService();
    const claude = new ClaudeStoryService();
    const polly = new PollyNarrationService();
    const director = new NarrativeDirector();

    const currentManifestoIds = manifesto.map((e: any) => e.id);
    const relevantCompleted = state.completed.filter((id: string) => currentManifestoIds.includes(id));

    let queue = manifesto;
    if (idArg) {
        queue = manifesto.filter((entry: any) => entry.id === idArg);
    } else if (categoryArg) {
        queue = manifesto.filter((entry: any) => entry.category === categoryArg);
    } else {
        queue = manifesto;
    }

    // Filter out completed books unless explicitly requested by ID
    if (!idArg) {
        queue = queue.filter((entry: any) => !state.completed.includes(entry.id));
    }

    if (limit) {
        queue = queue.slice(0, limit);
    }

    log(`🚀 Starting generation for ${queue.length} books...`);

    const totalBooks = queue.length + relevantCompleted.length;
    let currentIndex = relevantCompleted.length + 1;

    for (const entry of queue) {
        const tracker = new ProgressTracker(totalBooks, currentIndex++);
        log(`\n📚 [${entry.category}] ${entry.title} (${entry.level}) - ID: ${entry.id}`);
        
        // Skip if already in completed (unless it's a forced re-run by ID)
        if (!idArg && state.completed.includes(entry.id)) {
            log(`✅ Already completed.`);
            continue;
        }

        const bookSeed = getSeed(entry.id);
        const specs = LEVEL_SPECS[entry.level] || LEVEL_SPECS["G3-5"];
        const bookDir = path.join(OUTPUT_DIR, entry.category, entry.id);

        const isOlder = ["G3-5", "G1-2"].includes(entry.level);
        let artStyle = entry.style || (isOlder
            ? "Cinematic digital concept art, realistic textures, dramatic lighting, detailed background, anime-influenced but semi-realistic, 8k resolution"
            : undefined);

        if (entry.category === 'sunwukong') {
            artStyle = SUN_WUKONG_STYLE;
        }

        let bState = state.inProgress[entry.id];
        if (!bState) {
            bState = {
                id: entry.id,
                status: 'starting',
                completedScenes: [],
                completedAudio: [],
                hasCover: false
            };
            state.inProgress[entry.id] = bState;
            saveState();
        }

        try {
            // --- Phase 1: Story & Metadata ---
            if (!bState.pages) {
                tracker.update(entry.id, 1, 'Generating story and character anchor');

                if (entry.category === 'sunwukong') {
                    bState.characterAnchor = SUN_WUKONG_ANCHOR;
                } else {
                    bState.characterAnchor = await claude.generateCharacterAnchor(entry.concept_prompt || entry.brand_theme || entry.title, entry.level);
                }

                const journeyToWestInstruction = entry.category === 'sunwukong'
                    ? "CRITICAL: The story MUST be based on actual mythical episodes, lore, or characters from the classical novel 'Journey to the West' (西游记). Maintain cultural and narrative authenticity while adapting for the target reading level."
                    : "";

                const themeText = sanitizeTheme(entry.brand_theme || entry.category);
                const conceptContext = entry.concept_prompt ? `Specific Story Concept: ${entry.concept_prompt}` : "";

                if (["G3-5", "G1-2"].includes(entry.level)) {
                    tracker.update(entry.id, 1, 'Two-pass story generation');
                    const halfScenes = Math.floor(specs.sceneCount / 2);
                    const prompt1 = `Write PART 1 of a ${entry.is_nonfiction ? 'non-fiction' : 'fiction'} story for a child at ${entry.level} reading level about ${entry.category}.
                    Theme Focus: ${themeText}.
                    ${conceptContext}
                    ${journeyToWestInstruction}
                    Character Anchor: ${bState.characterAnchor}.
                    Target total word count for this part: ${Math.floor(specs.targetWords / 2)} words.
                    Complexity: ${specs.complexity}.
                    Structure: Provide EXACTLY ${halfScenes} scenes for the BEGINNING and MIDDLE of the story.
                    Format as JSON array: [{ "text": "...", "imagePrompt": "..." }]
                    IMPORTANT: Return ONLY raw JSON array.`;

                    const part1 = await claude.generateStory(prompt1);
                    
                    const prompt2 = `Write PART 2 (The Conclusion) of the story started below.
                    Story Part 1 Summary: ${part1.map(p => p.text.substring(0, 100)).join("... ")}
                    Target total word count for this part: ${specs.targetWords - Math.floor(specs.targetWords / 2)} words.
                    Structure: Provide EXACTLY ${specs.sceneCount - halfScenes} scenes.
                    Format as JSON array: [{ "text": "...", "imagePrompt": "..." }]
                    Character Anchor to maintain: ${bState.characterAnchor}
                    IMPORTANT: Return ONLY raw JSON array.`;

                    const part2 = await claude.generateStory(prompt2);
                    bState.pages = [...part1, ...part2];
                } else {
                    const prompt = `Write a ${entry.is_nonfiction ? 'non-fiction' : 'fiction'} story for a child at ${entry.level} reading level about ${entry.category}.
                    Theme Focus: ${themeText}.
                    ${conceptContext}
                    ${journeyToWestInstruction}
                    Character Anchor (Visual Identity): ${bState.characterAnchor}.
                    Target total word count: ${specs.targetWords} words.
                    Complexity: ${specs.complexity}.
                    Structure: Split into EXACTLY ${specs.sceneCount} scenes.
                    Format as JSON array: [{ "text": "...", "imagePrompt": "..." }]
                    IMPORTANT: Return ONLY raw JSON array.`;

                    bState.pages = await claude.generateStory(prompt);
                }

                bState.fullText = bState.pages.map((p: any) => p.text).join('\n\n');
                bState.wordCount = Tokenizer.getWords(Tokenizer.tokenize(bState.fullText)).length;
                bState.tokens = Tokenizer.tokenize(bState.fullText);

                if (bState.wordCount < specs.minWords) {
                    const lengthPrompt = entry.level === "G3-5" ? "\n\nCRITICAL: EACH SCENE MUST BE AT LEAST 100 WORDS." : "\n\nCRITICAL: YOU MUST PROVIDE AT LEAST " + specs.minWords + " WORDS.";
                    bState.pages = await claude.generateStory((entry.level === "G3-5" ? "REWRITE TO BE LONGER: " : "") + bState.fullText + lengthPrompt);
                    bState.fullText = bState.pages.map((p: any) => p.text).join('\n\n');
                    bState.wordCount = Tokenizer.getWords(Tokenizer.tokenize(bState.fullText)).length;
                }

                bState.aiTitle = await claude.generateBookTitle(bState.fullText);
                const metaData = await claude.generateKeywordsAndDescription(bState.fullText, entry.category, entry.brand_theme || entry.title);
                bState.keywords = metaData.keywords;
                bState.description = metaData.description;
                bState.smartCoverPrompt = await claude.generateCoverPrompt(bState.fullText, bState.characterAnchor);
                bState.status = 'story_done';
                saveState();
            }

            // --- Phase 2: Assets ---
            if (!fs.existsSync(bookDir)) fs.mkdirSync(bookDir, { recursive: true });
            if (!fs.existsSync(path.join(bookDir, 'scenes'))) fs.mkdirSync(path.join(bookDir, 'scenes'), { recursive: true });
            if (!fs.existsSync(path.join(bookDir, 'audio'))) fs.mkdirSync(path.join(bookDir, 'audio'), { recursive: true });

            const negativePrompt = entry.category === 'sunwukong' ? SUN_WUKONG_NEGATIVE : undefined;

            if (!bState.hasCover) {
                tracker.update(entry.id, 2, 'Generating Cover');
                let base64Cover = "";
                try {
                    base64Cover = await stability.generateImage(bState.smartCoverPrompt, bookSeed, artStyle, negativePrompt);
                } catch (e) {
                    try {
                        base64Cover = await stability.generateImage(`${bState.characterAnchor}. Story about ${entry.category}`, bookSeed, artStyle, negativePrompt);
                    } catch (novaErr) {
                        log(`    ⚠️ Stability failed for cover. Falling back to Nova...`);
                        base64Cover = await nova.generateImage(bState.smartCoverPrompt, bookSeed, artStyle, negativePrompt);
                    }
                }
                await saveOptimizedImage(base64Cover, path.join(bookDir, 'cover.webp'));
                bState.hasCover = true;
                saveState();
            }

            const sceneData: any[] = bState.sceneData || [];
            let currentWordIndex = 0;
            for (let i = 0; i < bState.pages.length; i++) {
                const sceneWordCount = Tokenizer.getWords(Tokenizer.tokenize(bState.pages[i].text)).length;
                const afterIndex = currentWordIndex + sceneWordCount - 1;

                if (!bState.completedScenes.includes(i)) {
                    tracker.update(entry.id, 2, 'Illustrating Scenes', { current: i + 1, total: bState.pages.length });
                    let base64Image = "";
                    try {
                        base64Image = await stability.generateImage(bState.pages[i].imagePrompt, bookSeed, artStyle, negativePrompt);
                    } catch (err: any) {
                        try {
                            log(`    ⚠️ Stability Scene ${i+1} failed. Retrying with safe prompt...`);
                            const safePrompt = `${bState.characterAnchor}. Children's book illustration for: ${entry.category}. Action: ${bState.pages[i].text.substring(0, 50)}...`;
                            base64Image = await stability.generateImage(safePrompt, bookSeed, artStyle, negativePrompt);
                        } catch (novaErr) {
                            log(`    ⚠️ Stability failed again. Falling back to Nova...`);
                            base64Image = await nova.generateImage(bState.pages[i].imagePrompt, bookSeed, artStyle, negativePrompt);
                        }
                    }
                    const imageFilename = `scene_${i}.webp`;
                    await saveOptimizedImage(base64Image, path.join(bookDir, 'scenes', imageFilename));

                    sceneData[i] = { index: i, text: bState.pages[i].text, image_path: `scenes/${imageFilename}`, after_word_index: afterIndex };
                    bState.completedScenes.push(i);
                    bState.sceneData = sceneData;
                    saveState();
                    // Small delay to avoid hammering API
                    await new Promise(r => setTimeout(r, 1000));
                }
                currentWordIndex += sceneWordCount;
            }

            // --- Phase 3: Narration ---
            if (bState.completedAudio.length === 0) {
                tracker.update(entry.id, 3, 'Generating Narration');
                const textChunks = TextChunker.chunk(bState.fullText);
                const audioShards = bState.audioShards || [];

                for (let i = 0; i < textChunks.length; i++) {
                    if (bState.completedAudio.includes(i)) continue;
                    tracker.update(entry.id, 3, 'Synthesizing Audio', { current: i + 1, total: textChunks.length });
                    const annotation = await director.annotate(textChunks[i].text, entry.level);
                    const { audioBuffer, speechMarks } = await polly.synthesize(annotation.ssml, {
                        textType: "ssml", voiceId: annotation.metadata.suggestedVoice || "Ruth", engine: "generative"
                    });
                    const audioFilename = `${textChunks[i].index}.mp3`;
                    fs.writeFileSync(path.join(bookDir, 'audio', audioFilename), audioBuffer);
                    const alignedTimings = alignSpeechMarksToTokens(speechMarks, getWordTokensForChunk(bState.tokens, textChunks[i].startWordIndex, textChunks[i].endWordIndex));

                    audioShards[i] = { index: textChunks[i].index, path: `audio/${audioFilename}`, start_word_index: textChunks[i].startWordIndex, end_word_index: textChunks[i].endWordIndex, timings: alignedTimings };
                    bState.completedAudio.push(i);
                    bState.audioShards = audioShards;
                    saveState();
                }
                bState.voiceId = "Ruth";
                bState.engine = "generative";
                saveState();
            }

            // Finalize metadata before alignment
            const finalMetadata = {
                id: entry.id, title: bState.aiTitle, original_concept_title: entry.title, category: entry.category, level: entry.level, is_nonfiction: entry.is_nonfiction, description: bState.description, keywords: bState.keywords, brand_theme: entry.brand_theme, series_id: entry.series_id, cover_image_path: 'cover.webp', cover_prompt: bState.smartCoverPrompt,
                stats: { word_count: bState.wordCount, char_count: bState.fullText.length, scene_count: bState.pages.length, reading_time_seconds: Math.ceil(bState.wordCount / 2.5), length_category: bState.wordCount < 300 ? "Medium" : "Long" },
                scenes: bState.sceneData, audio: { voice_id: bState.voiceId, engine: bState.engine, shards: bState.audioShards },
                tokens: bState.tokens, character_anchor: bState.characterAnchor
            };
            fs.writeFileSync(path.join(bookDir, 'metadata.json'), JSON.stringify(finalMetadata, null, 2));
            fs.writeFileSync(path.join(bookDir, 'content.txt'), bState.fullText);

            // --- Phase 4: Alignment ---
            if (process.argv.includes('--align')) {
                await runAlignmentWithRetry(bookDir, tracker, entry.id);
            }

            state.completed.push(entry.id);
            delete state.inProgress[entry.id];
            saveState();
            tracker.update(entry.id, 5, 'Done');

        } catch (err: any) {
            log(`❌ Failed: ${entry.id} - ${err.message}`);
            state.failed.push({ id: entry.id, error: err.message, timestamp: new Date().toISOString() });
            saveState();
        }
    }
    console.log(`\n🎉 All books processed!`);
}

main().catch(console.error);
