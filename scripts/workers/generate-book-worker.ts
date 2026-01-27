/**
 * Worker Process for Book Generation
 * 
 * This script generates a single book and reports progress via IPC to the master process.
 * Can also run standalone for debugging.
 * 
 * Usage:
 *   Standalone: npx tsx scripts/generate-book-worker.ts --book='{"id":"...","title":"...","category":"...","level":"..."}'
 *   Via Manager: Spawned by library-manager.ts
 */

import { StabilityStoryService } from "../../lib/features/stability/stability-service.server";
import { NovaStoryService } from "../../lib/features/nova/nova-service.server";
import { ClaudeStoryService } from "../../lib/features/bedrock/claude-service.server";
import { PollyNarrationService } from "../../lib/features/narration/polly-service.server";
import { NarrativeDirector } from "../../lib/features/narration/narrative-director.server";
import { Tokenizer } from "../../lib/core/books/tokenizer";
import { TextChunker } from "../../lib/core/books/text-chunker";
import { alignSpeechMarksToTokens, getWordTokensForChunk } from "../../lib/core/books/speech-mark-aligner";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import sharp from "sharp";
import { execSync } from "child_process";

dotenv.config({ path: ".env.local" });

const OUTPUT_DIR = process.env.RAIDEN_BOOKS_PATH || '/Users/renchen/Work/github/raiden_books';

interface ProgressMessage {
    type: 'PROGRESS' | 'COMPLETE' | 'ERROR';
    bookId: string;
    phase: number;
    task: string;
    percent?: number;
    error?: string;
    wordCount?: number;
}

function sendProgress(msg: ProgressMessage) {
    if (process.send) {
        process.send(msg);
    } else {
        console.log(`[Worker] ${msg.bookId} | Phase ${msg.phase}/5 | ${msg.task} ${msg.percent ? `(${msg.percent}%)` : ''}`);
    }
}

const LEVEL_SPECS: Record<string, { minWords: number, targetWords: number, sceneCount: number, complexity: string }> = {
    "PreK": { minWords: 250, targetWords: 300, sceneCount: 5, complexity: "simple, repetitive, high rhythm" },
    "K": { minWords: 500, targetWords: 600, sceneCount: 8, complexity: "basic narrative, sight words" },
    "G1-2": { minWords: 800, targetWords: 900, sceneCount: 10, complexity: "developing plot, descriptive" },
    "G3-5": { minWords: 1400, targetWords: 1500, sceneCount: 15, complexity: "complex narrative, advanced vocabulary, subplots" }
};

const SUN_WUKONG_ANCHOR = `Sun Wukong (Monkey King): Spunky anthropomorphic male golden macaque, confident mischievous boyish grin, masculine jawline, bright golden fur, fiery-gold eyes. Strong muscular build, broad shoulders. Wearing golden chainmail armor over red tunic, tiger-skin kilt, black trousers, black combat boots. Golden fillet headband with two extremely long red pheasant feathers curving back. Holding red-and-gold iron staff. Style: Premium 3D animation, Pixar-style character design, vibrant colors, expressive studio lighting, 8k resolution.`;
const SUN_WUKONG_NEGATIVE = `feminine features, long eyelashes, makeup, girl, woman, lipstick, jewelry, rounded soft face, thin frame, fragile build, 2D, sketch, flat colors, watercolor, paper texture. No human, no gorilla, no chimp, no robotic parts, no modern street clothing.`;
const SUN_WUKONG_STYLE = `Premium 3D animation, Pixar-style character design, vibrant colors, expressive studio lighting, 8k resolution, cinematic render, Octane render, highly detailed textures.`;

function getSeed(id: string): number {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        const char = id.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash) % 4294967295;
}

async function saveOptimizedImage(base64Data: string, outputPath: string) {
    const buffer = Buffer.from(base64Data, 'base64');
    await sharp(buffer).webp({ quality: 85 }).toFile(outputPath);
}

async function generateBook(entry: any) {
    const stability = new StabilityStoryService();
    const nova = new NovaStoryService();
    const claude = new ClaudeStoryService();
    const polly = new PollyNarrationService();
    const director = new NarrativeDirector();

    const bookId = entry.id;
    const specs = LEVEL_SPECS[entry.level] || LEVEL_SPECS["G3-5"];
    const bookDir = path.join(OUTPUT_DIR, entry.category, bookId);

    const isOlder = ["G3-5", "G1-2"].includes(entry.level);
    let artStyle = entry.style || (isOlder
        ? "Cinematic digital concept art, realistic textures, dramatic lighting, detailed background, anime-influenced but semi-realistic, 8k resolution"
        : undefined);

    if (entry.category === 'sunwukong') {
        artStyle = SUN_WUKONG_STYLE;
    }
    const negativePrompt = entry.category === 'sunwukong' ? SUN_WUKONG_NEGATIVE : undefined;
    const bookSeed = getSeed(bookId);
    const WORKER_STATE_FILE = path.join(bookDir, 'worker-state.json');

    // Ensure directories exist
    fs.mkdirSync(path.join(bookDir, 'scenes'), { recursive: true });
    fs.mkdirSync(path.join(bookDir, 'audio'), { recursive: true });

    let bState: any = { completedScenes: [], completedAudio: [] };

    // Load existing state if available to resume
    if (fs.existsSync(WORKER_STATE_FILE)) {
        try {
            bState = JSON.parse(fs.readFileSync(WORKER_STATE_FILE, 'utf8'));
            if (!bState.completedScenes) bState.completedScenes = [];
            if (!bState.completedAudio) bState.completedAudio = [];
        } catch (e) {
            // Ignore corrupted state file
        }
    }

    const saveWorkerState = () => {
        fs.writeFileSync(WORKER_STATE_FILE, JSON.stringify(bState, null, 2));
    };

    try {
        // --- Phase 1: Story ---
        if (!bState.pages) {
            sendProgress({ type: 'PROGRESS', bookId, phase: 1, task: 'Generating Story' });

            if (entry.category === 'sunwukong') {
                bState.characterAnchor = SUN_WUKONG_ANCHOR;
            } else {
                bState.characterAnchor = await claude.generateCharacterAnchor(entry.concept_prompt || entry.title, entry.level);
            }

            const themeText = entry.category;
            const conceptContext = entry.concept_prompt ? `Specific Story Concept: ${entry.concept_prompt}` : "";

            if (["G3-5", "G1-2"].includes(entry.level)) {
                const halfScenes = Math.floor(specs.sceneCount / 2);
                const prompt1 = `Write PART 1 of a ${entry.is_nonfiction ? 'non-fiction' : 'fiction'} story for a child at ${entry.level} reading level about ${entry.category}.
                Theme Focus: ${themeText}. ${conceptContext}
                Character Anchor: ${bState.characterAnchor}.
                Target word count for this part: ${Math.floor(specs.targetWords / 2)} words.
                Complexity: ${specs.complexity}.
                Structure: Provide EXACTLY ${halfScenes} scenes.
                Format as JSON array: [{ "text": "...", "imagePrompt": "..." }]
                IMPORTANT: Return ONLY raw JSON array.`;

                const part1 = await claude.generateStory(prompt1);

                const prompt2 = `Write PART 2 (Conclusion) of the story. Part 1 Summary: ${part1.map(p => p.text.substring(0, 80)).join("... ")}
                Target word count for this part: ${specs.targetWords - Math.floor(specs.targetWords / 2)} words.
                Structure: Provide EXACTLY ${specs.sceneCount - halfScenes} scenes.
                Format as JSON array: [{ "text": "...", "imagePrompt": "..." }]
                Character Anchor to maintain: ${bState.characterAnchor}
                IMPORTANT: Return ONLY raw JSON array.`;

                const part2 = await claude.generateStory(prompt2);
                bState.pages = [...part1, ...part2];
            } else {
                const prompt = `Write a ${entry.is_nonfiction ? 'non-fiction' : 'fiction'} story for a child at ${entry.level} reading level about ${entry.category}.
                Theme Focus: ${themeText}. ${conceptContext}
                Character Anchor: ${bState.characterAnchor}.
                Target word count: ${specs.targetWords} words.
                Complexity: ${specs.complexity}.
                Structure: Split into EXACTLY ${specs.sceneCount} scenes.
                Format as JSON array: [{ "text": "...", "imagePrompt": "..." }]
                IMPORTANT: Return ONLY raw JSON array.`;

                bState.pages = await claude.generateStory(prompt);
            }

            bState.fullText = bState.pages.map((p: any) => p.text).join('\n\n');
            bState.wordCount = Tokenizer.getWords(Tokenizer.tokenize(bState.fullText)).length;
            bState.tokens = Tokenizer.tokenize(bState.fullText);
            bState.aiTitle = await claude.generateBookTitle(bState.fullText);
            const metaData = await claude.generateKeywordsAndDescription(bState.fullText, entry.category, entry.title);
            bState.keywords = metaData.keywords;
            bState.description = metaData.description;
            bState.smartCoverPrompt = await claude.generateCoverPrompt(bState.fullText, bState.characterAnchor);
            
            saveWorkerState();
        } else {
            sendProgress({ type: 'PROGRESS', bookId, phase: 1, task: 'Story Loaded', percent: 100 });
        }

        // --- Phase 2: Images ---
        if (!bState.hasCover) {
            sendProgress({ type: 'PROGRESS', bookId, phase: 2, task: 'Generating Cover' });

            let base64Cover = "";
            try {
                base64Cover = await stability.generateImage(bState.smartCoverPrompt, bookSeed, artStyle, negativePrompt);
            } catch {
                base64Cover = await nova.generateImage(bState.smartCoverPrompt, bookSeed, artStyle, negativePrompt);
            }
            await saveOptimizedImage(base64Cover, path.join(bookDir, 'cover.webp'));
            bState.hasCover = true;
            saveWorkerState();
        }

        const sceneData: any[] = bState.sceneData || [];
        let currentWordIndex = 0;
        for (let i = 0; i < bState.pages.length; i++) {
            const sceneWordCount = Tokenizer.getWords(Tokenizer.tokenize(bState.pages[i].text)).length;
            const afterIndex = currentWordIndex + sceneWordCount - 1;

            if (!bState.completedScenes.includes(i)) {
                sendProgress({ type: 'PROGRESS', bookId, phase: 2, task: 'Illustrating', percent: Math.round(((i + 1) / bState.pages.length) * 100) });

                let base64Image = "";
                try {
                    base64Image = await stability.generateImage(bState.pages[i].imagePrompt, bookSeed, artStyle, negativePrompt);
                } catch {
                    base64Image = await nova.generateImage(bState.pages[i].imagePrompt, bookSeed, artStyle, negativePrompt);
                }
                const imageFilename = `scene_${i}.webp`;
                await saveOptimizedImage(base64Image, path.join(bookDir, 'scenes', imageFilename));

                sceneData[i] = { index: i, text: bState.pages[i].text, image_path: `scenes/${imageFilename}`, after_word_index: afterIndex };
                bState.completedScenes.push(i);
                bState.sceneData = sceneData;
                saveWorkerState();
                await new Promise(r => setTimeout(r, 500)); // Small delay between images
            }
            currentWordIndex += sceneWordCount;
        }
        bState.sceneData = sceneData;

        // --- Phase 3: Narration ---
        if (!bState.narrationComplete) {
            sendProgress({ type: 'PROGRESS', bookId, phase: 3, task: 'Generating Narration' });

            const textChunks = TextChunker.chunk(bState.fullText);
            const audioShards: any[] = bState.audioShards || [];

            for (let i = 0; i < textChunks.length; i++) {
                if (bState.completedAudio.includes(i)) continue;

                sendProgress({ type: 'PROGRESS', bookId, phase: 3, task: 'Synthesizing', percent: Math.round(((i + 1) / textChunks.length) * 100) });

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
                saveWorkerState();
            }
            bState.audioShards = audioShards;
            bState.voiceId = "Ruth";
            bState.engine = "generative";
            bState.narrationComplete = true;
            saveWorkerState();
        }

        // Write metadata before alignment
        const finalMetadata = {
            id: entry.id, title: bState.aiTitle, original_concept_title: entry.title, category: entry.category, level: entry.level, is_nonfiction: entry.is_nonfiction, description: bState.description, keywords: bState.keywords,
            cover_image_path: 'cover.webp', cover_prompt: bState.smartCoverPrompt,
            stats: { word_count: bState.wordCount, char_count: bState.fullText.length, scene_count: bState.pages.length, reading_time_seconds: Math.ceil(bState.wordCount / 2.5), length_category: bState.wordCount < 300 ? "Medium" : "Long" },
            scenes: bState.sceneData, audio: { voice_id: bState.voiceId, engine: bState.engine, shards: bState.audioShards },
            tokens: bState.tokens, character_anchor: bState.characterAnchor
        };
        fs.writeFileSync(path.join(bookDir, 'metadata.json'), JSON.stringify(finalMetadata, null, 2));
        fs.writeFileSync(path.join(bookDir, 'content.txt'), bState.fullText);

        // --- Phase 4: Ready for Alignment ---
        // We stop here and let the alignment worker handle the rest
        sendProgress({ type: 'COMPLETE', bookId, phase: 4, task: 'Ready for Align', wordCount: bState.wordCount });

    } catch (err: any) {
        sendProgress({ type: 'ERROR', bookId, phase: 0, task: 'Failed', error: err.message });
    }
}

// Entry point: Parse CLI args or IPC message
const bookArg = process.argv.find(a => a.startsWith('--book='));
if (bookArg) {
    const bookJson = bookArg.split('=').slice(1).join('=');
    const entry = JSON.parse(bookJson);
    generateBook(entry);
} else if (process.send) {
    // Listen for IPC messages from master
    process.on('message', (msg: any) => {
        if (msg.type === 'GENERATE') {
            generateBook(msg.book);
        }
    });
} else {
    console.error("Usage: npx tsx scripts/generate-book-worker.ts --book='{...}'");
    process.exit(1);
}
