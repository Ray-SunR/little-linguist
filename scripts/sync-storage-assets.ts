import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";

async function main() {
    console.log("🚀 Initializing Storage Sync...");

    const prodEnvPath = path.resolve(process.cwd(), ".env.local");
    const localEnvPath = path.resolve(process.cwd(), ".env.development.local");

    if (!fs.existsSync(prodEnvPath)) {
        console.error(`❌ Missing ${prodEnvPath}. Please ensure it exists with PROD credentials.`);
        process.exit(1);
    }

    if (!fs.existsSync(localEnvPath)) {
        console.error(`❌ Missing ${localEnvPath}. Please ensure it exists with LOCAL credentials.`);
        process.exit(1);
    }

    const prodEnv = dotenv.parse(fs.readFileSync(prodEnvPath));
    const localEnv = dotenv.parse(fs.readFileSync(localEnvPath));

    const PROD_URL = prodEnv.SUPABASE_URL || prodEnv.NEXT_PUBLIC_SUPABASE_URL;
    const PROD_KEY = prodEnv.SUPABASE_SERVICE_ROLE_KEY;

    const LOCAL_URL = localEnv.NEXT_PUBLIC_SUPABASE_URL || localEnv.SUPABASE_URL;
    const LOCAL_KEY = localEnv.SUPABASE_SERVICE_ROLE_KEY;

    if (!PROD_URL || !PROD_KEY) {
        console.error("❌ Missing PROD Supabase credentials in .env.local.");
        process.exit(1);
    }

    if (!LOCAL_URL || !LOCAL_KEY) {
        console.error("❌ Missing LOCAL Supabase credentials in .env.development.local.");
        process.exit(1);
    }

    const prodClient = createClient(PROD_URL, PROD_KEY);
    const localClient = createClient(LOCAL_URL, LOCAL_KEY);

    const BUCKET_NAME = "book-assets";

    console.log(`🔗 Connected to PROD: ${PROD_URL}`);
    console.log(`🏠 Connected to LOCAL: ${LOCAL_URL}`);

    console.log("🔍 Querying local database for asset paths...");

    const { data: books, error: booksError } = await localClient.from("books").select("cover_image_path");
    if (booksError) {
        console.error("❌ Error fetching books from local DB:", booksError.message);
        process.exit(1);
    }

    const { data: media, error: mediaError } = await localClient.from("book_media").select("path");
    if (mediaError) {
        console.error("❌ Error fetching book_media from local DB:", mediaError.message);
        process.exit(1);
    }

    const { data: audios, error: audiosError } = await localClient.from("book_audios").select("audio_path");
    if (audiosError) {
        console.error("❌ Error fetching book_audios from local DB:", audiosError.message);
        process.exit(1);
    }

    const assetPaths = new Set<string>();
    books?.forEach(b => b.cover_image_path && assetPaths.add(b.cover_image_path));
    media?.forEach(m => m.path && assetPaths.add(m.path));
    audios?.forEach(a => a.audio_path && assetPaths.add(a.audio_path));

    console.log(`📦 Found ${assetPaths.size} unique asset paths to verify.`);

    let syncedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const assetPath of assetPaths) {
        try {
            const dir = path.dirname(assetPath);
            const fileName = path.basename(assetPath);
            
            const { data: existingFiles, error: listError } = await localClient.storage
                .from(BUCKET_NAME)
                .list(dir === "." ? "" : dir, {
                    search: fileName,
                });

            if (listError) {
                console.warn(`⚠️ Error checking existence of ${assetPath} locally:`, listError.message);
            }

            const existsLocally = existingFiles?.some(f => f.name === fileName);

            if (existsLocally) {
                console.log(`⏭️  Skipping (exists): ${assetPath}`);
                skippedCount++;
                continue;
            }

            console.log(`⬇️  Downloading from PROD: ${assetPath}`);
            const { data: blob, error: downloadError } = await prodClient.storage
                .from(BUCKET_NAME)
                .download(assetPath);

            if (downloadError) {
                if (downloadError.message.includes("Object not found")) {
                    console.warn(`⚠️  404: Asset not found in PROD: ${assetPath}`);
                } else {
                    console.error(`❌ Download failed for ${assetPath}:`, downloadError.message);
                }
                errorCount++;
                continue;
            }

            if (!blob) {
                console.warn(`⚠️  Received empty blob for ${assetPath}`);
                errorCount++;
                continue;
            }

            console.log(`⬆️  Uploading to LOCAL: ${assetPath}`);
            const { error: uploadError } = await localClient.storage
                .from(BUCKET_NAME)
                .upload(assetPath, blob, {
                    upsert: true,
                    contentType: getContentType(assetPath)
                });

            if (uploadError) {
                console.error(`❌ Upload failed for ${assetPath}:`, uploadError.message);
                errorCount++;
            } else {
                console.log(`✅ Successfully synced: ${assetPath}`);
                syncedCount++;
            }
        } catch (err) {
            console.error(`💥 Unexpected error syncing ${assetPath}:`, err);
            errorCount++;
        }
    }

    console.log("\n--- Sync Summary ---");
    console.log(`✅ Synced:  ${syncedCount}`);
    console.log(`⏭️  Skipped: ${skippedCount}`);
    console.log(`❌ Errors:  ${errorCount}`);
    console.log("--------------------\n");
}

function getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case ".jpg":
        case ".jpeg": return "image/jpeg";
        case ".png": return "image/png";
        case ".webp": return "image/webp";
        case ".mp3": return "audio/mpeg";
        case ".m4a": return "audio/mp4";
        case ".wav": return "audio/wav";
        case ".json": return "application/json";
        default: return "application/octet-stream";
    }
}

main().catch(error => {
    console.error("💥 Fatal error during sync:", error);
    process.exit(1);
});
