import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.development.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const childId = 'c367f3fc-8544-4917-9bc5-6db9f41397b3';
    console.log(`Checking interests for child: ${childId}`);

    const { data: child, error } = await supabase
        .from('children')
        .select('id, interests, first_name, owner_user_id')
        .eq('id', childId)
        .maybeSingle();

    if (error) {
        console.error("Error:", error);
    } else if (!child) {
        console.log("Child not found.");
    } else {
        console.log(`Child: ${child.first_name}`);
        console.log(`Interests:`, child.interests);
        console.log(`Owner User ID: ${child.owner_user_id}`);
    }
}

check().catch(console.error);
