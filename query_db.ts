import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.development.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
    const { data, error } = await supabase
        .from('books')
        .select('title, level, min_grade')
        .limit(10);
    
    if (error) {
        console.error(error);
        process.exit(1);
    }
    console.log(JSON.stringify(data, null, 2));
}
run();
