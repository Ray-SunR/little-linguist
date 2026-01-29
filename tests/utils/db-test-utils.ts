import { createAdminClient } from '@/lib/supabase/server';
import crypto from 'node:crypto';

const FULL_TRUNCATE_TABLES = [
    "audit_logs",
    "point_transactions",
    "learning_sessions",
    "stories",
    "child_vocab",
    "child_books",
    "child_magic_sentences",
    "child_badges",
    "feedbacks",
    "children",
    "profiles",
    "book_audios",
    "book_media",
    "book_contents",
    "feature_usage",
    "books",
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

/**
 * @deprecated Avoid using this in tests as it causes cross-test interference on shared DBs (Beta).
 * Use createTestUser() and cleanupTestData(userId) instead for better isolation.
 */
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
        if (error) {
            // Handle case where 'id' column doesn't exist (e.g. child_books)
            if (error.message.includes('column "id" does not exist') || error.code === '42703') {
                // Try deleting with alternative filters
                const { error: retryError } = await supabase.from(table).delete().neq('child_id', '00000000-0000-0000-0000-000000000000' as any);
                
                if (retryError && (retryError.message.includes('column "child_id" does not exist') || retryError.code === '42703')) {
                    const { error: finalRetryError } = await supabase.from(table).delete().not('created_at', 'is', null);
                    if (finalRetryError) throw finalRetryError;
                } else if (retryError) {
                    throw retryError;
                }
            } else {
                throw error;
            }
        }
    }
}

export async function createTestUser(email?: string) {
    assertSafeForTests();
    const supabase = createAdminClient();

    const finalEmail = email || `test-${crypto.randomUUID()}@example.com`;

    // List users specifically searching for this email if possible, or list enough to find it.
    try {
        let page = 1;
        let found = false;
        while (!found) {
            const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
                page,
                perPage: 100
            });
            if (listError || !users || users.length === 0) break;

            const existing = users.find(u => u.email === finalEmail);
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
        email: finalEmail,
        password: 'password123',
        email_confirm: true
    });

    if (createError) {
        // If it still says email exists, it means we missed it in the list or a race condition occurred.
        if ((createError as any).code === 'email_exists' || (createError as any).status === 422) {
            const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
            const fallbackUser = users.find(u => u.email === finalEmail);
            if (fallbackUser) return fallbackUser;
        }
        throw createError;
    }

    if (!user) throw new Error(`Could not create test user: ${finalEmail}`);

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

export async function cleanupTestData(userId: string) {
    assertSafeForTests();
    const supabase = createAdminClient();

    const { data: children } = await supabase.from('children').select('id').eq('owner_user_id', userId);
    if (children && children.length > 0) {
        const childIds = children.map(c => c.id);
        await supabase.from('child_vocab').delete().in('child_id', childIds);
        await supabase.from('child_books').delete().in('child_id', childIds);
        await supabase.from('child_magic_sentences').delete().in('child_id', childIds);
        await supabase.from('child_badges').delete().in('child_id', childIds);
        await supabase.from('learning_sessions').delete().in('child_id', childIds);
    }

    await supabase.from('stories').delete().eq('owner_user_id', userId);
    await supabase.from('audit_logs').delete().eq('owner_user_id', userId);
    await supabase.from('point_transactions').delete().eq('owner_user_id', userId);
    await supabase.from('feature_usage').delete().eq('owner_user_id', userId);
    await supabase.from('feedbacks').delete().eq('user_id', userId);

    await supabase.from('books').delete().eq('owner_user_id', userId);
    await supabase.from('children').delete().eq('owner_user_id', userId);
    await supabase.from('profiles').delete().eq('id', userId);

    await supabase.auth.admin.deleteUser(userId);
}
