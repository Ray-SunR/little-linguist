
import { NovaStoryService } from "../lib/features/nova/nova-service.server";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load env vars
dotenv.config({ path: ".env.local" });

const TARGET_ROOT = "/Users/renchen/Downloads/lumomind/output";

async function findAllMetadataFiles(dir: string, fileList: string[] = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            findAllMetadataFiles(filePath, fileList);
        } else {
            if (file === "metadata.json") {
                fileList.push(filePath);
            }
        }
    }
    return fileList;
}

async function main() {
    console.log("Starting batch image regeneration...");
    
    if (!fs.existsSync(TARGET_ROOT)) {
        console.error(`Target directory not found: ${TARGET_ROOT}`);
        process.exit(1);
    }

    const service = new NovaStoryService();
    // service is already configured for 1024x1024 in nova-service.server.ts

    const metadataFiles = await findAllMetadataFiles(TARGET_ROOT);
    console.log(`Found ${metadataFiles.length} books to regenerate.`);

    for (const metadataPath of metadataFiles) {
        const bookDir = path.dirname(metadataPath);
        console.log(`\nProcessing book: ${bookDir}`);
        
        let metadata: any;
        try {
            const content = fs.readFileSync(metadataPath, "utf-8");
            metadata = JSON.parse(content);
        } catch (e) {
            console.error(`Failed to parse ${metadataPath}:`, e);
            continue;
        }

        // Regenerate Cover
        if (metadata.cover_prompt && metadata.cover_image_path) {
            const coverPath = path.join(bookDir, metadata.cover_image_path);
            console.log(`  Regenerating Cover: ${metadata.cover_prompt.substring(0, 50)}...`);
            try {
                const coverBase64 = await service.generateImage(metadata.cover_prompt);
                fs.writeFileSync(coverPath, Buffer.from(coverBase64, "base64"));
                console.log(`  ✓ Saved cover to ${coverPath}`);
            } catch (err) {
                console.error(`  ✗ Failed to regenerate cover:`, err);
            }
        }

        // Regenerate Scenes
        if (Array.isArray(metadata.scenes)) {
            for (const scene of metadata.scenes) {
                if (scene.imagePrompt && scene.image_path) {
                    const scenePath = path.join(bookDir, scene.image_path);
                    console.log(`  Regenerating Scene ${scene.index}: ${scene.imagePrompt.substring(0, 30)}...`);
                    try {
                        const sceneBase64 = await service.generateImage(scene.imagePrompt);
                        // Ensure directory exists (e.g. scenes/)
                        const sceneDir = path.dirname(scenePath);
                        if (!fs.existsSync(sceneDir)) fs.mkdirSync(sceneDir, { recursive: true });
                        
                        fs.writeFileSync(scenePath, Buffer.from(sceneBase64, "base64"));
                        console.log(`  ✓ Saved scene to ${scenePath}`);
                    } catch (err) {
                        console.error(`  ✗ Failed to regenerate scene ${scene.index}:`, err);
                    }
                    
                    // Small delay to be polite to the API
                    await new Promise(resolve => setTimeout(resolve, 500)); 
                }
            }
        }
    }
    
    console.log("\nBatch regeneration complete.");
}

main().catch(console.error);
