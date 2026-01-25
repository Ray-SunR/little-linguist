import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { BedrockEmbeddingService } from "../../lib/features/bedrock/bedrock-embedding.server";

// Load environment variables from .env.local
const envFile = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envFile)) {
    console.log(`📡 Using environment: ${envFile}`);
    dotenv.config({ path: envFile });
} else {
    console.warn(`⚠ .env.local not found, falling back to process.env`);
}

// Check for AWS credentials
if (!process.env.POLLY_ACCESS_KEY_ID || !process.env.POLLY_SECRET_ACCESS_KEY) {
    console.error("❌ Missing AWS credentials (POLLY_ACCESS_KEY_ID, POLLY_SECRET_ACCESS_KEY). Check your .env.local file.");
    process.exit(1);
}

const embeddingService = new BedrockEmbeddingService();
const FIXTURES_DIR = path.join(process.cwd(), "tests/fixtures/library");

function findAllMetadata(dir: string): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (fs.existsSync(path.join(fullPath, "metadata.json"))) {
                results.push(path.join(fullPath, "metadata.json"));
            } else {
                results.push(...findAllMetadata(fullPath));
            }
        }
    }
    return results;
}

async function run() {
    console.log(`🚀 Generating embeddings for fixtures in: ${FIXTURES_DIR}`);

    const metadataFiles = findAllMetadata(FIXTURES_DIR);
    console.log(`📚 Found ${metadataFiles.length} metadata files.`);

    for (const metadataPath of metadataFiles) {
        const fixtureDir = path.dirname(metadataPath);
        const embeddingsPath = path.join(fixtureDir, "embeddings.json");

        try {
            const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
            const { title, description, keywords } = metadata;

            if (!title) {
                console.warn(`  ⚠ Missing title in ${metadataPath}, skipping.`);
                continue;
            }

            const keywordsStr = Array.isArray(keywords) ? keywords.join(', ') : (keywords || "");
            const embeddingText = `Title: ${title}. Description: ${description || ""}. Keywords: ${keywordsStr}.`;

            console.log(`  Processing: "${title}"...`);
            const embedding = await embeddingService.generateEmbedding(embeddingText);

            fs.writeFileSync(embeddingsPath, JSON.stringify(embedding, null, 2));
            console.log(`  ✓ Saved to ${embeddingsPath}`);
        } catch (err: any) {
            console.error(`  ❌ Error processing ${metadataPath}:`, err.message);
        }
    }

    console.log("\n✨ Embedding generation finished.");
}

run().catch(console.error);
