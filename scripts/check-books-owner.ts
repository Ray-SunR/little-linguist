import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.development.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data: books, error } = await supabase
        .from('books')
        .select('id, title, owner_user_id, embedding')
        .limit(5);

    if (error) {
        console.error("Error:", error);
    } else {
        console.table(books.map(b => ({
            id: b.id,
            title: b.title,
            owner_user_id: b.owner_user_id,
            has_embedding: !!b.embedding
        })));
    }
}

check().catch(console.error);
