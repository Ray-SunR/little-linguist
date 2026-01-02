const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
    const books = JSON.parse(fs.readFileSync('./data/books.json', 'utf8'));

    for (const book of books) {
        console.log(`Seeding ${book.title}...`);
        const { error } = await supabase
            .from('books')
            .upsert({
                id: book.uuid,
                book_key: book.id,
                title: book.title,
                text: book.text,
                images: book.images,
                origin: 'system'
            }, { onConflict: 'id' });

        if (error) {
            console.error(`Error seeding ${book.title}:`, error);
        } else {
            console.log(`Successfully seeded ${book.title}`);
        }
    }
}

seed().catch(console.error);
