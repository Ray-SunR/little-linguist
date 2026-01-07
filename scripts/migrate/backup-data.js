const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const tables = [
    'profiles',
    'children',
    'media_assets',
    'books',
    'word_insights',
    'user_words',
    'child_library',
    'child_book_favorites',
    'child_book_progress',
    'learning_sessions',
    'session_events',
    'vocab_terms',
    'child_vocab',
    'point_transactions',
    'story_generation_jobs',
    'content_moderation_results',
    'word_import_jobs',
    'daily_learning_plans',
    'subscription_plans',
    'subscriptions',
    'usage_meter'
];

async function backup() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const backupDir = './supabase-backup-data';

    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const supabase = createClient(supabaseUrl, supabaseKey);

    for (const table of tables) {
        console.log(`Backing up table: ${table}...`);
        const { data, error } = await supabase.from(table).select('*');

        if (error) {
            console.error(`Error backing up ${table}:`, error.message);
            continue;
        }

        fs.writeFileSync(
            path.join(backupDir, `${table}.json`),
            JSON.stringify(data, null, 2)
        );
        console.log(`Saved ${data.length} rows to ${table}.json`);
    }
}

backup().catch(console.error);
