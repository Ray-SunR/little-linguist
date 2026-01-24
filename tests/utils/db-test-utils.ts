import { createAdminClient } from '@/lib/supabase/server';

const OWNED_TABLES = [
    "audit_logs",
    "feature_usage",
    "point_transactions",
    "feedbacks",
    "book_media",
    "book_audios",
    "stories",
    "children",
    "books",
];

const FULL_TRUNCATE_TABLES = [
    "learning_sessions",
    "child_vocab",
    "child_books",
    "child_magic_sentences",
    "child_badges",
    "profiles",
];


export async function ensureBucketExists(bucketName: string) {
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
    const supabase = createAdminClient();

    // Ensure assets bucket exists
    await ensureBucketExists('user-assets');
    await ensureBucketExists('book-assets');

    for (const table of OWNED_TABLES) {
        const { error } = await supabase
            .from(table)
            .delete()
            .not('owner_user_id', 'is', null);
        if (error && error.code !== 'PGRST116') {
        }
    }

    for (const table of FULL_TRUNCATE_TABLES) {
        const { error } = await supabase
            .from(table)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000' as any);
        if (error && error.code !== 'PGRST116') {
        }
    }

}

export async function createTestUser(email: string = 'test@example.com') {
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
