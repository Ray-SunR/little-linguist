
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { ClaudeStoryService } from '../lib/features/bedrock/claude-service.server';

dotenv.config({ path: '.env.local' });

const CATEGORIES = ['sunwukong', 'chinese_history', 'avengers', 'disney_princess', 'dinosaurs', 'hotwheels'] as const;
type Category = typeof CATEGORIES[number];

const LEVELS = ['PreK', 'K', 'G1-2', 'G3-5'] as const;
type Level = typeof LEVELS[number];

interface ManifestoEntry {
    id: string;
    title: string;
    concept_prompt: string;
    category: Category;
    level: Level;
    is_nonfiction: boolean;
}

const claude = new ClaudeStoryService();

async function generateBatch(category: Category, level: Level, count: number, existingTitles: string[]): Promise<ManifestoEntry[]> {
    console.log(`Generating ${count} books for ${category} at ${level}...`);
    
    const isNonFiction = category === 'chinese_history' || category === 'dinosaurs';
    
    const prompt = `Generate ${count} unique children's book concepts for the category "${category}" at grade level "${level}".
    ${isNonFiction ? "These MUST be educational non-fiction concepts focusing on real facts, history, or science." : "These should be engaging fictional stories."}
    
    For each book, provide:
    1. A catchy "title".
    2. A "concept_prompt": a 1-2 sentence description of the book's core plot or educational focus.
    
    CRITICAL: 
    - Ensure the concepts are highly unique, creative, and distinct from each other.
    - For G3-5, make the plots more sophisticated, perhaps with conflict, mystery, or deeper educational themes.
    - Avoid repeating these existing titles: ${existingTitles.slice(-30).join(', ')}.
    - Your output MUST be a JSON array of objects with "title" and "concept_prompt" keys.
    - NO intro, NO outro, NO backticks. START with [ and END with ].
    
    Format:
    [
      {
        "title": "Exciting Title Here",
        "concept_prompt": "A detailed 1-2 sentence description of the book."
      }
    ]`;

    try {
        // We use generateStory because it has the robust JSON extraction/parsing logic
        const response = await (claude as any).generateStory(prompt); 
        
        if (!Array.isArray(response)) {
            throw new Error(`Expected array but got ${typeof response}`);
        }

        return response.slice(0, count).map((item: any, index: number) => ({
            id: `${category}-${level.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}-${index}`,
            title: item.title || item.text || 'Untitled',
            concept_prompt: item.concept_prompt || item.imagePrompt || 'No concept',
            category,
            level,
            is_nonfiction: isNonFiction
        }));
    } catch (error) {
        console.error(`Error generating batch for ${category} ${level}:`, error);
        // Retry once after a short delay
        console.log("Retrying in 5 seconds...");
        await new Promise(resolve => setTimeout(resolve, 5000));
        try {
            const response = await (claude as any).generateStory(prompt);
            return response.slice(0, count).map((item: any, index: number) => ({
                id: `${category}-${level.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}-${index}`,
                title: item.title || item.text || 'Untitled',
                concept_prompt: item.concept_prompt || item.imagePrompt || 'No concept',
                category,
                level,
                is_nonfiction: isNonFiction
            }));
        } catch (retryError) {
            console.error(`Retry failed for ${category} ${level}:`, retryError);
            return [];
        }
    }
}

async function main() {
    const manifesto: ManifestoEntry[] = [];
    const titles: string[] = [];

    // G3-5: 300 books (50 per category)
    for (const cat of CATEGORIES) {
        // Use smaller batches of 25 to avoid token limits
        for (let i = 0; i < 2; i++) {
            const batch = await generateBatch(cat, 'G3-5', 25, titles);
            manifesto.push(...batch);
            titles.push(...batch.map(b => b.title));
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    // Others: 100 books distributed across PreK, K, G1-2
    const otherLevels: Level[] = ['PreK', 'K', 'G1-2'];
    
    // We need 100 total. 100 / 6 categories = 16.66 per category.
    // 16.66 / 3 levels = 5.55 per level per category.
    // Let's do 5, 5, 6 per category (16 total). 6 * 16 = 96.
    // Plus 4 more to make it 100.
    
    for (const cat of CATEGORIES) {
        for (const level of otherLevels) {
            let count = 5;
            if (level === 'G1-2') {
                count = 6;
                // Add the 4 extra books to G1-2 of first 4 categories
                if (['sunwukong', 'chinese_history', 'avengers', 'disney_princess'].includes(cat)) {
                    count = 7;
                }
            }
            
            const batch = await generateBatch(cat, level, count, titles);
            manifesto.push(...batch);
            titles.push(...batch.map(b => b.title));
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    console.log(`\nFinal tally: ${manifesto.length} books.`);
    
    // Final verification of count
    if (manifesto.length < 400) {
        console.warn(`Warning: Only generated ${manifesto.length} books instead of 400.`);
    }

    const outputPath = path.join(process.cwd(), 'data/full-library-manifesto.json');
    fs.writeFileSync(outputPath, JSON.stringify(manifesto, null, 2));
    console.log(`Manifesto saved to ${outputPath}`);
}

main().catch(console.error);
