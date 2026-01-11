
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function inspectBook() {
    const bookId = "d781741f-7d95-4180-b509-dae75874827a";
    console.log(`Inspecting book: ${bookId}`);

    const { data: book, error } = await supabase
        .from("books")
        .select("id, title, metadata")
        .eq("id", bookId)
        .single();

    if (error) {
        console.error("Error fetching book:", error);
        return;
    }

    console.log("Book Title:", book.title);
    console.log("Images Field:", JSON.stringify(book.images, null, 2));
    console.log("Metadata Field:", JSON.stringify(book.metadata, null, 2));
}

inspectBook();
