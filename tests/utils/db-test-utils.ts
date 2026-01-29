import { createAdminClient } from '@/lib/supabase/server';

const FULL_TRUNCATE_TABLES = [
    "learning_sessions",
    "child_vocab",
    "child_books",
    "child_magic_sentences",
    "child_badges",
    "audit_logs",
    "point_transactions",
    "feedbacks",
    "children",
    "profiles",
    "book_audios",
    "book_media",
    "stories",
    "books",
    "feature_usage",
];

/**
 * Ensures that the current Supabase URL is pointing to a safe instance (Local or Beta).
 * Throws an error if it detects a production or unauthorized remote URL.
 */
export function assertSafeForTests() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const isWhitelisted = 
        url.includes('localhost') || 
        url.includes('127.0.0.1') || 
        url.includes('0.0.0.0') || 
        url.includes('xrertidmfkamnksotadp.supabase.co');
    
    const isProd = url.includes('tawhvgzctlfavucdxwbt.supabase.co');
    
    if (!isWhitelisted || isProd) {
        throw new Error(
            `❌ PRODUCTION GUARD TRIGGERED: Attempted destructive operation on unsafe database: ${url}. ` +
            `Destructive operations (truncation, user deletion) are ONLY allowed on Local or Beta instances.`
        );
    }
}


export async function ensureBucketExists(bucketName: string) {
    assertSafeForTests();
    const supabase = createAdminClient();
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some(b => b.name === bucketName);

    if (!exists) {
        const { error } = await supabase.storage.createBucket(bucketName, {
            public: true,
            fileSizeLimit: 5242880 // 5MB
        });
        if (error) console.error(`Error creating bucket ${bucketName}:`, error);
    }
}

export async function truncateAllTables() {
    assertSafeForTests();
    const supabase = createAdminClient();

    // Ensure assets bucket exists
    await ensureBucketExists('user-assets');
    await ensureBucketExists('book-assets');

        // Truncate all tables in reverse dependency order
        for (const table of FULL_TRUNCATE_TABLES) {
            let query = supabase.from(table).delete();
            
            // In test environment, we want a clean slate.
            // We only preserve the system user (if any)
            query = query.neq('id', '00000000-0000-0000-0000-000000000000' as any);

            const { error } = await query;
        if (error && error.code !== 'PGRST116' && error.code !== '42703') {
             // Handle case where 'id' column doesn't exist (e.g. child_books)
             if (error.message.includes('column "id" does not exist')) {
                 await supabase.from(table).delete().not('created_at', 'is', null);
             }
        }
    }
}

export async function createTestUser(email: string = 'test@example.com') {
    assertSafeForTests();
    const supabase = createAdminClient();

    // List users specifically searching for this email if possible, or list enough to find it.
    // listUsers doesn't support email filtering directly in most versions of supabase-js, 
    // so we list and find. We'll use a loop to ensure we find it if there are many.
    try {
        let page = 1;
        let found = false;
        while (!found) {
            const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
                page,
                perPage: 100
            });
            if (listError || !users || users.length === 0) break;

            const existing = users.find(u => u.email === email);
            if (existing) {
                await supabase.auth.admin.deleteUser(existing.id);
                found = true;
            } else {
                page++;
                if (page > 10) break; // Safety limit
            }
        }
    } catch (e) {
        // Ignore errors during cleanup
    }

    const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
        email,
        password: 'password123',
        email_confirm: true
    });

    if (createError) {
        // If it still says email exists, it means we missed it in the list or a race condition occurred.
        if ((createError as any).code === 'email_exists' || (createError as any).status === 422) {
            const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
            const fallbackUser = users.find(u => u.email === email);
            if (fallbackUser) return fallbackUser;
        }
        throw createError;
    }

    if (!user) throw new Error(`Could not create test user: ${email}`);

    const { error: upsertError } = await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email
    });

    if (upsertError) {
        console.error('Upsert profile error:', upsertError);
        throw upsertError;
    }

    return user;
}
