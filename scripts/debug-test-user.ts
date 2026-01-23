import { createAdminClient } from '../lib/supabase/server';
import { createTestUser } from '../tests/utils/db-test-utils';
import * as dotenv from 'dotenv';
import path from 'path';

async function debug() {
    dotenv.config({ path: path.resolve(process.cwd(), '.env.development.local') });

    console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

    const email = 'test@example.com';
    const supabase = createAdminClient();

    console.log('Listing users...');
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
        console.error('List users error:', listError);
        return;
    }

    console.log('Total users:', users.length);
    console.log('All emails:', users.map(u => u.email));

    const existing = users.find(u => u.email === email);
    if (existing) {
        console.log('Found existing user:', existing.id);
        console.log('Deleting user...');
        const { error: delError } = await supabase.auth.admin.deleteUser(existing.id);
        if (delError) {
            console.error('Delete error:', delError);
        } else {
            console.log('Delete successful');
        }
    } else {
        console.log('User not found in list');
    }

    console.log('Creating test user...');
    try {
        const user = await createTestUser(email);
        console.log('Success! User ID:', user.id);
    } catch (err) {
        console.error('Failed to create test user:', err);
    }
}

debug();
