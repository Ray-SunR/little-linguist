import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { ClaudeStoryService } from '../lib/features/bedrock/claude-service.server';

dotenv.config({ path: '.env.local' });

const OUTPUT_DIR = 'output/seed-library';

async function backfillMetadata() {
    const claude = new ClaudeStoryService();
    const categories = fs.readdirSync(OUTPUT_DIR).filter(f => 
        fs.statSync(path.join(OUTPUT_DIR, f)).isDirectory()
    );

    console.log(`Found ${categories.length} categories.`);

    for (const category of categories) {
        const categoryPath = path.join(OUTPUT_DIR, category);
        const books = fs.readdirSync(categoryPath).filter(f => 
            fs.statSync(path.join(categoryPath, f)).isDirectory()
        );

        console.log(`Processing category: ${category} (${books.length} books)`);

        for (const bookDir of books) {
            const bookPath = path.join(categoryPath, bookDir);
            const metadataPath = path.join(bookPath, 'metadata.json');
            
            if (!fs.existsSync(metadataPath)) {
                console.warn(`  ⚠️ Skipping ${bookDir}: No metadata.json found.`);
                continue;
            }

            try {
                const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                
                // If keywords and description are already valid (single word keywords), we can skip if we want, 
                // but user asked to generate them for "all previously generated books".
                // Let's check if they look like the "new" format already.
                const hasNewKeywords = metadata.keywords && Array.isArray(metadata.keywords) && 
                                     metadata.keywords.length > 0 && 
                                     metadata.keywords.every((k: string) => !k.includes(' '));

                if (hasNewKeywords && metadata.description) {
                    // console.log(`  ⏩ Skipping ${bookDir}: Already has metadata.`);
                    // continue;
                }

                console.log(`  📝 Generating metadata for ${bookDir}...`);

                // Collect full text from scenes
                const fullText = metadata.scenes.map((s: any) => s.text).join('\n\n');

                const { keywords, description } = await claude.generateKeywordsAndDescription(
                    fullText,
                    metadata.category,
                    metadata.brand_theme || metadata.title
                );

                metadata.keywords = keywords;
                metadata.description = description;

                fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
                console.log(`  ✅ Updated ${bookDir}`);
                
            } catch (error) {
                console.error(`  ❌ Error processing ${bookDir}:`, error);
            }
        }
    }

    console.log('🎉 Backfill complete!');
}

backfillMetadata().catch(console.error);
