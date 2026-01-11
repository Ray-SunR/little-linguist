import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, key);

async function debugUsage() {
    const identity_key = "debug-test-user-" + Date.now();
    const feature = "word_insight";
    const limit = 5;

    console.log(`Testing usage increment for ${identity_key}...`);

    const { data, error } = await supabase.rpc("increment_feature_usage", {
        p_identity_key: identity_key,
        p_feature_name: feature,
        p_max_limit: limit,
        p_increment: 1
    });

    if (error) {
        console.error("RPC Error:", error);
        return;
    }

    console.log("RPC Response:", data);

    const { data: usage } = await supabase
        .from("feature_usage")
        .select("*")
        .eq("identity_key", identity_key)
        .eq("feature_name", feature);

    console.log("Database state:", usage);
}

debugUsage();
