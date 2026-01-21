import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.development.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    console.log("Checking unique constraints on point_transactions...");
    const { data, error } = await supabase.rpc('execute_sql', {
        query: `
            SELECT conname, pg_get_constraintdef(oid) 
            FROM pg_constraint 
            WHERE conrelid = 'public.point_transactions'::regclass;
        `
    });

    if (error) {
        // Fallback if execute_sql RPC is not exposed to service_role directly
        console.log("Could not use execute_sql RPC, trying direct query if possible via CLI...");
    } else {
        console.table(data);
    }
}
check().catch(console.error);
