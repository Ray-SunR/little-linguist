import { createAdminClient } from '@/lib/supabase/server';

export const TEST_TABLES = [
    "audit_logs",
    "feature_usage",
    "point_transactions",
    "learning_sessions",
    "child_vocab",
    "child_books",
    "child_magic_sentences",
    "child_badges",
    "badges",
    "feedbacks",
    "word_insights",
    "book_media",
    "book_audios",
    "book_contents",
    "stories",
    "children",
    "books",
    "profiles",
    "subscription_plans",
];

export async function truncateAllTables() {
    const supabase = createAdminClient();
    
    for (const table of [...TEST_TABLES]) {
        const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000' as any);
        if (error && error.code !== 'PGRST116') {
        }
    }
}

export async function createTestUser(email: string = 'test@example.com') {
    const supabase = createAdminClient();
    
    const { data: { user }, error } = await supabase.auth.admin.createUser({
        email,
        password: 'password123',
        email_confirm: true
    });

    let targetUser = user;
    if (error && (error.message === 'User already exists' || error.message === 'A user with this email address has already been registered')) {
        const { data: { users } } = await supabase.auth.admin.listUsers();
        targetUser = users.find(u => u.email === email) || null;
    } else if (error) {
        throw error;
    }

    if (!targetUser) throw new Error("Could not create or find test user");

    await supabase.from('profiles').upsert({
        id: targetUser.id,
        email: targetUser.email
    });

    return targetUser;
}
