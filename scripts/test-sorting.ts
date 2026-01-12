
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
    console.log("Starting Specific Sorting Test...");

    // 1. Specific IDs
    const childId = 'c7bf5520-50ed-4692-b832-a8e5cd44e954';
    const targetBookId = 'ccc532f1-5911-423b-8257-dd2661fe0cba';

    // Get Owner
    const { data: child } = await supabase.from('children').select('owner_user_id').eq('id', childId).single();
    if (!child) { console.error("Child not found"); return; }
    const userId = child.owner_user_id;
    console.log(`Child: ${childId}, Owner: ${userId}`);

    // Verify Target Book status
    const { data: bookProgress } = await supabase
        .from('child_books')
        .select('last_read_at')
        .match({ child_id: childId, book_id: targetBookId })
        .single();
    console.log("Target Book Progress:", bookProgress);

    // 2. Query Reproduction
    // onlyPersonal=true logic
    // Repository Logic:
    // query = query.eq('owner_user_id', userId).or(`child_id.is.null,child_id.eq.${childId}`);
    // query = query.or(`child_id.eq.${childId},child_id.is.null`, { foreignTable: 'child_books' });
    // sort = last_opened desc

    console.log("\n--- Executing Query ---");
    let query = supabase
        .from('books')
        .select('id, title, child_books!left(last_read_at)');

    // Filter: Personal Books
    query = query.eq('owner_user_id', userId)
        .or(`child_id.is.null,child_id.eq.${childId}`);

    // Filter: Child Books Join (crucial for logic)
    query = query.or(`child_id.eq.${childId},child_id.is.null`, { foreignTable: 'child_books' });

    // Sort: Last Opened DESC
    // Current Logic:
    query = query.order('last_read_at', { foreignTable: 'child_books', ascending: false, nullsFirst: false });

    // Deterministic tie-breaker
    query = query.order('title', { ascending: true });

    query = query.range(0, 19);

    const { data, error } = await query;

    if (error) {
        console.error("Error:", error);
    } else {
        console.log(`Result Count: ${data?.length}`);
        data?.forEach((b: any, i) => {
            const cb = b.child_books?.[0]; // Access first element if array
            const ts = cb?.last_read_at;
            const isTarget = b.id === targetBookId;
            const marker = isTarget ? " <--- TARGET" : "";

            console.log(`${(i + 1).toString().padStart(2)}. [${ts || "NULL"}] ${b.title.substring(0, 30)} ${marker}`);
        });
    }

    // 3. RPC Verification (Simulated Call)
    console.log("\n--- Testing RPC (Simulated) ---");
    console.log("NOTE: This logic requires the 'get_library_books' RPC to be applied.");

    const { data: rpcData, error: rpcError } = await supabase.rpc('get_library_books', {
        p_child_id: childId,
        p_filter_owner_id: userId,
        p_limit: 20,
        p_offset: 0,
        p_sort_by: 'last_opened',
        p_sort_asc: false,
        p_only_personal: true
    });

    if (rpcError) {
        console.error("RPC Error:", rpcError.message);
    } else {
        console.log(`RPC Result Count: ${rpcData?.length}`);
        rpcData?.forEach((b: any, i: number) => {
            // Note: RPC returns 'progress_last_read_at' (flat), not 'child_books' (nested)
            const ts = b.progress_last_read_at;
            const isTarget = b.id === targetBookId;
            const marker = isTarget ? " <--- TARGET" : "";

            console.log(`${(i + 1).toString().padStart(2)}. [${ts || "NULL"}] ${b.title.substring(0, 30)} ${marker}`);
        });
    }
}

runTest();
