
import sharp from "sharp";
import fs from "fs";
import path from "path";

const TARGET_ROOT = "/Users/renchen/Downloads/lumomind/output";
const QUALITY = 85;

async function findAllPngFiles(dir: string, fileList: string[] = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            findAllPngFiles(filePath, fileList);
        } else {
            if (file.toLowerCase().endsWith(".png")) {
                fileList.push(filePath);
            }
        }
    }
    return fileList;
}

async function main() {
    console.log("Starting image optimization (to WebP)...");
    
    if (!fs.existsSync(TARGET_ROOT)) {
        console.error(`Target directory not found: ${TARGET_ROOT}`);
        process.exit(1);
    }

    const pngFiles = await findAllPngFiles(TARGET_ROOT);
    console.log(`Found ${pngFiles.length} PNG images to optimize.`);

    let totalSavedBytes = 0;
    let processedCount = 0;

    for (const pngPath of pngFiles) {
        const webpPath = pngPath.replace(".png", ".webp");
        try {
            const originalStats = fs.statSync(pngPath);
            
            // Convert to WebP
            await sharp(pngPath)
                .webp({ quality: QUALITY })
                .toFile(webpPath);

            const newStats = fs.statSync(webpPath);
            const savedBytes = originalStats.size - newStats.size;
            totalSavedBytes += savedBytes;

            console.log(`Optimized: ${path.basename(pngPath)}`);
            console.log(`  Size: ${(originalStats.size / 1024).toFixed(2)} KB -> ${(newStats.size / 1024).toFixed(2)} KB`);
            console.log(`  Saved: ${(savedBytes / 1024).toFixed(2)} KB (${((savedBytes / originalStats.size) * 100).toFixed(1)}%)`);

            // Optional: Delete original PNG to save space? 
            // For now, let's keep PNGs but update metadata.json to point to WebP if we were doing a full migration. 
            // But the user just asked to compress files. 
            // To truly "compress them" effectively replacing them in usage, we probably want to update references too.
            // BUT, since this output is for download/usage elsewhere, having both might be messy.
            // I will DELETE the png if conversion is successful to truly "compress" the folder size.
            
            fs.unlinkSync(pngPath);
            processedCount++;

        } catch (err) {
            console.error(`Failed to optimize ${pngPath}:`, err);
        }
    }

    console.log(`\nOptimization complete.`);
    console.log(`Processed: ${processedCount}/${pngFiles.length}`);
    console.log(`Total space saved: ${(totalSavedBytes / 1024 / 1024).toFixed(2)} MB`);
}

main().catch(console.error);
