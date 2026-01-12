
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const serviceClient = createClient(supabaseUrl, serviceRoleKey);
const anonClient = createClient(supabaseUrl, anonKey);

async function runTest() {
    console.log("Starting Audit Log Verification...");

    const testId = `test-${Date.now()}`;

    // 1. Verify Service Role Insert (Should Succeed)
    console.log("\n1. Testing Service Role Insert...");
    const { data: insertData, error: insertError } = await serviceClient
        .from('audit_logs')
        .insert({
            identity_key: 'test-identity',
            action_type: 'user.login', // Valid Enum
            entity_type: 'user', // Valid Enum
            details: { testId, note: 'Service Role Insert' },
            ip_address: '127.0.0.1'
        })
        .select()
        .single();

    if (insertError) {
        console.error("❌ Service Role Insert Failed:", insertError);
    } else {
        console.log("✅ Service Role Insert Succeeded:", insertData.id);
    }

    // 2. Verify Enum Validation (Should Fail)
    console.log("\n2. Testing Invalid Enum...");
    const { error: enumError } = await serviceClient
        .from('audit_logs')
        .insert({
            identity_key: 'test-identity',
            action_type: 'INVALID_ACTION', // Invalid
            entity_type: 'user'
        });

    if (enumError && enumError.message.includes('invalid input value for enum')) {
        console.log("✅ Invalid Enum Rejected (Expected):", enumError.message);
    } else {
        console.error("❌ Invalid Enum NOT Rejected significantly:", enumError);
    }

    // 3. Verify Anon Insert (Should Fail due to RLS)
    console.log("\n3. Testing Anon Insert (RLS)...");
    const { error: anonInsertError } = await anonClient
        .from('audit_logs')
        .insert({
            identity_key: 'anon-identity',
            action_type: 'story.started',
            entity_type: 'story'
        });

    if (anonInsertError) {
        console.log("✅ Anon Insert Failed (Expected RLS):", anonInsertError.message); // Likely "new row violates row-level security policy"
    } else {
        console.error("❌ Anon Insert Succeeded (RLS RISK!)");
    }

    // 4. Verify Anon Select (Should return nothing or Fail)
    console.log("\n4. Testing Anon Select (RLS)...");
    const { data: anonSelectData, error: anonSelectError } = await anonClient
        .from('audit_logs')
        .select('*')
        .limit(1);

    if (anonSelectData && anonSelectData.length === 0) {
        console.log("✅ Anon Select Returned Empty (Expected RLS)");
    } else if (anonSelectError) {
        console.log("✅ Anon Select Failed (Expected):", anonSelectError.message);
    } else {
        console.error("❌ Anon Select Returned Data (RLS RISK!):", anonSelectData);
    }

    // 5. Cleanup
    if (insertData?.id) {
        console.log("\n5. Cleaning up test log...");
        await serviceClient.from('audit_logs').delete().eq('id', insertData.id);
        console.log("✅ Cleanup Complete");
    }
}

runTest();
