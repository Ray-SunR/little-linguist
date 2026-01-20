
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function diagnostic() {
    console.log("🔍 Deep Audit: Checking for silent migration failures...");

    const { data: books, error: bErr } = await supabase
        .from("books")
        .select("id, title, metadata, voice_id");

    if (bErr) {
        console.error("Failed to fetch books:", bErr);
        return;
    }

    interface BookError {
        id: string;
        title: string;
        voice?: string | null;
        expected?: number;
        actual?: number;
    }

    const report: {
        healthy: number;
        silentFailure: BookError[];
        incomplete: BookError[];
        legacyCleanupPending: any[];
        noMetadata: any[];
    } = {
        healthy: 0,
        silentFailure: [],
        incomplete: [],
        legacyCleanupPending: [],
        noMetadata: []
    };

    for (const book of books) {
        const metadata = book.metadata || {};
        const audioConfig = metadata.audio || {};
        const engine = audioConfig.engine;
        const expectedShards = audioConfig.shards?.length || 0;
        const currentVoice = book.voice_id;

        const { data: audios } = await supabase
            .from("book_audios")
            .select("voice_id, chunk_index")
            .eq("book_id", book.id);

        const activeAudios = audios?.filter(a => a.voice_id === currentVoice) || [];
        const otherAudios = audios?.filter(a => a.voice_id !== currentVoice) || [];

        if (engine === "generative") {
            if (activeAudios.length === 0) {
                report.silentFailure.push({ id: book.id, title: book.title, voice: currentVoice });
            } else if (activeAudios.length !== expectedShards) {
                report.incomplete.push({ id: book.id, title: book.title, expected: expectedShards, actual: activeAudios.length });
            } else {
                report.healthy++;
            }
        }

        if (otherAudios.length > 0) {
            report.legacyCleanupPending.push({ id: book.id, title: book.title, extraVoices: [...new Set(otherAudios.map(a => a.voice_id))] });
        }
    }

    console.log("\n--- Audit Results ---");
    console.log(`✅ Healthy books: ${report.healthy}`);

    if (report.silentFailure.length > 0) {
        console.log(`\n🚨 SILENT FAILURES (${report.silentFailure.length}): Books with NO audio in DB!`);
        console.table(report.silentFailure);
    }

    if (report.incomplete.length > 0) {
        console.log(`\n⚠️ INCOMPLETE (${report.incomplete.length}): Shard count mismatch!`);
        console.table(report.incomplete);
    }

    if (report.legacyCleanupPending.length > 0) {
        console.log(`\n🧹 LEGACY DATA (${report.legacyCleanupPending.length}): Cleanup-kevin-voice required.`);
        // console.table(report.legacyCleanupPending.slice(0, 10)); // Limit display
    }

    const allBrokenIds = [...new Set([
        ...report.silentFailure.map(b => b.id),
        ...report.incomplete.map(b => b.id)
    ])];

    if (allBrokenIds.length > 0) {
        console.log("\nIDs to RE-PROCESS:");
        console.log(JSON.stringify(allBrokenIds));
    }
}

diagnostic().catch(console.error);
