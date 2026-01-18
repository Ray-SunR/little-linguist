
import { StabilityStoryService } from "../lib/features/stability/stability-service.server";
import { ClaudeStoryService } from "../lib/features/bedrock/claude-service.server";
import { PollyNarrationService } from "../lib/features/narration/polly-service.server";
import { Tokenizer } from "../lib/core/books/tokenizer";
import { TextChunker } from "../lib/core/books/text-chunker";
import { alignSpeechMarksToTokens, getWordTokensForChunk } from "../lib/core/books/speech-mark-aligner";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import sharp from "sharp";

dotenv.config({ path: ".env.local" });

const MANIFESTO_PATH = path.join(process.cwd(), 'data/expanded-manifesto.json');
const OUTPUT_DIR = path.join(process.cwd(), 'output/expanded-library');
const STATE_FILE = path.join(OUTPUT_DIR, 'state.json');

function sanitizeTheme(theme: string | null): string {
    if (!theme) return "";
    return theme
        .replace(/Justice League/gi, "a legendary team of heroes")
        .replace(/Avengers/gi, "a team of mighty superheroes")
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
        .replace(/Sun Wukong/gi, "Sun Wukong the Monkey King, a cute but heroic anthropomorphic golden monkey with a heart-shaped face and mischievous expression, golden chainmail armor, tiger-skin skirt, red trousers, and a Phoenix-feather cap, rendered in a vibrant 3D animation style, cute character design, soft studio lighting, volumetric 3D render, Pixar style, high fidelity, 8k resolution.");
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

async function saveOptimizedImage(base64Data: string, outputPath: string) {
    const buffer = Buffer.from(base64Data, 'base64');
    await sharp(buffer)
        .webp({ quality: 85 })
        .toFile(outputPath);
}

async function main() {
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

    const nova = new StabilityStoryService();
    const claude = new ClaudeStoryService();
    const polly = new PollyNarrationService();

    console.log(`\n🚀 Starting concurrent generation (Concurrency: 3) for remaining ${manifesto.length - state.completed.length} books...`);

    const CONCURRENCY = 3;
    const queue = [...manifesto];

    async function processBook(entry: any) {
        if (state.completed.includes(entry.id)) {
            return;
        }

        console.log(`\n📚 [${entry.category}] ${entry.title} (${entry.level})`);
        const bookSeed = getSeed(entry.id);
        const specs = LEVEL_SPECS[entry.level] || LEVEL_SPECS["G3-5"];
        const bookDir = path.join(OUTPUT_DIR, entry.category, entry.id);

        // Style Selection based on Level
        const isOlder = ["G3-5", "G1-2"].includes(entry.level);
        const artStyle = isOlder
            ? "Cinematic digital concept art, realistic textures, dramatic lighting, detailed background, anime-influenced but semi-realistic, 8k resolution"
            : undefined; // undefined uses the default "vibrant watercolor" style from the service


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
                console.log(`  📝 Generating story and character anchor...`);

                if (entry.category === 'sunwukong') {
                    bState.characterAnchor = "Sun Wukong the Monkey King, a cute but heroic anthropomorphic golden monkey with a heart-shaped face and mischievous expression. He has bright golden fur and piercing fiery gold eyes. He is wearing his iconic golden chainmail armor breastplate, a tiger-skin loincloth skirt, red trousers, and black cloud-walking boots. On his head is a golden fillet headband and a Phoenix-feather cap with two very long red pheasant feathers curving high into the air. He is holding a magical red and gold iron staff, rendered in a vibrant 3D animation style, cute character design, soft studio lighting, volumetric 3D render, Pixar style, high fidelity, 8k resolution.";
                } else {
                    bState.characterAnchor = await claude.generateCharacterAnchor(entry.concept_prompt || entry.brand_theme || entry.title, entry.level);
                }

                const themeText = sanitizeTheme(entry.brand_theme || entry.category);
                const conceptContext = entry.concept_prompt ? `Specific Story Concept: ${entry.concept_prompt}` : "";

                const prompt = `Write a ${entry.is_nonfiction ? 'non-fiction' : 'fiction'} story for a child at ${entry.level} reading level about ${entry.category}.
                Theme Focus: ${themeText}.
                ${conceptContext}
                Character Anchor (Visual Identity): ${bState.characterAnchor}.
                Target total word count: ${specs.targetWords} words.
                Complexity: ${specs.complexity}.
                Structure: Split into EXACTLY ${specs.sceneCount} scenes.
                Requirement: Each scene MUST contain at least ${specs.sentencesPerScene} descriptive sentences.
                Format as JSON array: [{ "text": "...", "imagePrompt": "..." }]
                IMPORTANT: Return ONLY the raw JSON array. No markdown backticks, no introduction, no conversational filler.
                
                IMAGE PROMPT INSTRUCTIONS:
                Each "imagePrompt" MUST focus on the ACTION and SETTING first. 
                Structure it as: "[Detailed action and background description], featuring [Character Anchor markers]".
                Example: "A brave hero jumping over a crumbling stone wall in a ruined city, featuring a 10yo boy, blue suit, red cape, yellow belt".
                Do NOT just repeat the Character Anchor description alone. Ensure the background is vivid and changing in every scene.
                IMPORTANT: For G3-5, each scene must be a substantial paragraph. Use engaging and age-appropriate storytelling.`;

                bState.pages = await claude.generateStory(prompt);
                bState.fullText = bState.pages.map((p: any) => p.text).join('\n\n');
                bState.wordCount = Tokenizer.getWords(Tokenizer.tokenize(bState.fullText)).length;
                bState.tokens = Tokenizer.tokenize(bState.fullText);

                if (bState.wordCount < specs.minWords) {
                    console.warn(`  ⚠️ Generated story too short (${bState.wordCount} words). Re-attempting once...`);
                    bState.pages = await claude.generateStory(prompt + "\n\nCRITICAL: YOU MUST PROVIDE AT LEAST " + specs.minWords + " WORDS.");
                    bState.fullText = bState.pages.map((p: any) => p.text).join('\n\n');
                    bState.wordCount = Tokenizer.getWords(Tokenizer.tokenize(bState.fullText)).length;
                    bState.tokens = Tokenizer.tokenize(bState.fullText);
                }

                // If explicit title is simplistic "TBD" or just theme-based, let AI regenerate, otherwise use provided concept title if good?
                // Actually, the manifesto has specific titles like "Baby Avengers". We should probably trust the manifesto title 
                // BUT Claude might generate a better "Book Title". Let's stick to generating a title based on the *actual story content*
                // to match the story, and maybe preserve the concept as subtitle if needed.
                // Or just overwrite.
                bState.aiTitle = await claude.generateBookTitle(bState.fullText);

                // If the generated title is extremely different, maybe interesting, but let's stick to AI title as it reflects the text.

                const metaData = await claude.generateKeywordsAndDescription(bState.fullText, entry.category, entry.brand_theme || entry.title);
                bState.keywords = metaData.keywords;
                bState.description = metaData.description;
                bState.smartCoverPrompt = await claude.generateCoverPrompt(bState.fullText, bState.characterAnchor);

                bState.status = 'story_done';
                saveState();
            }

            // --- Phase 2: Assets Creation ---
            if (!fs.existsSync(bookDir)) fs.mkdirSync(bookDir, { recursive: true });
            if (!fs.existsSync(path.join(bookDir, 'scenes'))) fs.mkdirSync(path.join(bookDir, 'scenes'), { recursive: true });
            if (!fs.existsSync(path.join(bookDir, 'audio'))) fs.mkdirSync(path.join(bookDir, 'audio'), { recursive: true });

            if (!bState.hasCover) {
                console.log(`  🖼️ Generating Smart Cover...`);
                let base64Cover = "";
                try {
                    base64Cover = await nova.generateImage(bState.smartCoverPrompt, bookSeed, artStyle);
                } catch (coverErr: any) {
                    console.warn(`  ⚠️ Cover image blocked/failed. Attempting fallbacks...`);
                    try {
                        base64Cover = await nova.generateImage(`${bState.characterAnchor}. Children's book cover for a story about ${entry.category}`, bookSeed, artStyle);
                    } catch (fb1Err) {
                        console.warn(`  ⚠️ Fallback 1 blocked. Attempting Safe Fallback...`);
                        const safeDesc = sanitizeTheme(entry.brand_theme || entry.title) || `a story about ${entry.category}`;
                        base64Cover = await nova.generateImage(`Children's book cover illustration of ${safeDesc}. Colorful, distinct style.`, bookSeed, artStyle);
                    }
                }
                await saveOptimizedImage(base64Cover, path.join(bookDir, 'cover.webp'));
                bState.hasCover = true;
                saveState();
            }

            // --- Phase 3: Scenes ---
            const sceneData: any[] = bState.sceneData || [];
            let currentWordIndex = 0;
            for (let i = 0; i < bState.pages.length; i++) {
                const sceneWordCount = Tokenizer.getWords(Tokenizer.tokenize(bState.pages[i].text)).length;
                const afterIndex = currentWordIndex + sceneWordCount - 1;

                if (!bState.completedScenes.includes(i)) {
                    console.log(`  🎨 Scene ${i + 1}/${bState.pages.length}...`);
                    let base64Image = "";
                    try {
                        base64Image = await nova.generateImage(bState.pages[i].imagePrompt, bookSeed, artStyle);
                    } catch (imgErr: any) {
                        console.warn(`  ⚠️ Scene ${i} blocked/failed. Attempting fallbacks...`);
                        try {
                            base64Image = await nova.generateImage(`${bState.characterAnchor}. Children's book illustration for: ${bState.pages[i].text}`, bookSeed, artStyle);
                        } catch (fb1Err) {
                            console.warn(`  ⚠️ Scene ${i} Fallback 1 blocked. Attempting Safe Fallback...`);
                            const safeDesc = sanitizeTheme(entry.brand_theme || entry.title) || entry.category;
                            base64Image = await nova.generateImage(`Children's book illustration of ${safeDesc}. Action: ${bState.pages[i].text.substring(0, 50)}...`, bookSeed, artStyle);
                        }
                    }
                    const imageFilename = `scene_${i}.webp`;
                    await saveOptimizedImage(base64Image, path.join(bookDir, 'scenes', imageFilename));

                    sceneData[i] = {
                        index: i,
                        text: bState.pages[i].text,
                        imagePrompt: bState.pages[i].imagePrompt,
                        image_path: `scenes/${imageFilename}`,
                        after_word_index: afterIndex
                    };
                    bState.completedScenes.push(i);
                    bState.sceneData = sceneData;
                    saveState();
                }
                currentWordIndex += sceneWordCount;
            }

            // --- Phase 4: Narration ---
            if (bState.completedAudio.length === 0) {
                console.log(`  🎙️ Narration...`);
                const voiceId = process.env.POLLY_VOICE_ID || 'Kevin';
                const textChunks = TextChunker.chunk(bState.fullText);
                const audioShards = bState.audioShards || [];

                for (let i = 0; i < textChunks.length; i++) {
                    if (bState.completedAudio.includes(i)) continue;

                    const chunk = textChunks[i];
                    const { audioBuffer, speechMarks } = await polly.synthesize(chunk.text);
                    const audioFilename = `${chunk.index}.mp3`;
                    fs.writeFileSync(path.join(bookDir, 'audio', audioFilename), audioBuffer);

                    const wordTokensForChunk = getWordTokensForChunk(bState.tokens, chunk.startWordIndex, chunk.endWordIndex);
                    const alignedTimings = alignSpeechMarksToTokens(speechMarks, wordTokensForChunk);

                    audioShards[i] = {
                        index: chunk.index,
                        path: `audio/${audioFilename}`,
                        start_word_index: chunk.startWordIndex,
                        end_word_index: chunk.endWordIndex,
                        timings: alignedTimings
                    };
                    bState.completedAudio.push(i);
                    bState.audioShards = audioShards;
                    saveState();
                }
                bState.voiceId = voiceId;
            }

            // --- Finalize ---
            const finalMetadata = {
                id: entry.id,
                title: bState.aiTitle,
                original_concept_title: entry.title, // Keep original concept title just in case
                category: entry.category,
                level: entry.level,
                is_nonfiction: entry.is_nonfiction,
                description: bState.description,
                keywords: bState.keywords,
                brand_theme: entry.brand_theme,
                series_id: entry.series_id,
                cover_image_path: 'cover.webp',
                cover_prompt: bState.smartCoverPrompt,
                stats: {
                    word_count: bState.wordCount,
                    char_count: bState.fullText.length,
                    scene_count: bState.pages.length,
                    reading_time_seconds: Math.ceil(bState.wordCount / 2.5),
                    length_category: bState.wordCount < 100 ? "Short" : bState.wordCount < 300 ? "Medium" : "Long"
                },
                scenes: bState.sceneData,
                audio: {
                    voice_id: bState.voiceId,
                    shards: bState.audioShards
                },
                tokens: bState.tokens,
                character_anchor: bState.characterAnchor
            };

            fs.writeFileSync(path.join(bookDir, 'metadata.json'), JSON.stringify(finalMetadata, null, 2));
            fs.writeFileSync(path.join(bookDir, 'content.txt'), bState.fullText);

            state.completed.push(entry.id);
            delete state.inProgress[entry.id];
            saveState();
            console.log(`✅ Completed ${entry.id} (${bState.wordCount} words)`);

        } catch (err: any) {
            console.error(`❌ Failed ${entry.id}:`, err);
            state.failed.push({
                id: entry.id,
                error: err.message || JSON.stringify(err),
                timestamp: new Date().toISOString()
            });
            delete state.inProgress[entry.id];
            saveState();
        }
    }

    const workers = Array.from({ length: CONCURRENCY }, () => (async () => {
        while (queue.length > 0) {
            const entry = queue.shift();
            if (entry) await processBook(entry);
        }
    })());

    await Promise.all(workers);
    console.log(`\n🎉 All books in manifesto processed!`);
}

main().catch(console.error);
