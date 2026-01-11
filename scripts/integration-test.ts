import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const API_URL = 'http://localhost:3000/api/story';
const USER_ID = 'c59ae1c6-3056-4380-b7d0-37714a1cca51';
// If the user's provided ID is actually a profile ID, we'll try to find a child ID below
const PROVIDED_CHILD_ID = 'c59ae1c6-3056-4380-b7d0-37714a1cca51';

async function runTest() {
    console.log("Starting Integration Tests...");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify Child ID existence and ownership
    let actualChildId = PROVIDED_CHILD_ID;
    const { data: child, error: childError } = await supabase
        .from('children')
        .select('id, first_name')
        .eq('id', actualChildId)
        .single();

    if (childError || !child) {
        console.warn(`Child ${actualChildId} not found in DB. Searching for children owned by ${USER_ID}...`);
        const { data: children } = await supabase
            .from('children')
            .select('id, first_name')
            .eq('owner_user_id', USER_ID)
            .limit(1);

        if (children && children.length > 0) {
            actualChildId = children[0].id;
            console.log(`Using existing child ID: ${actualChildId} (${children[0].first_name})`);
        } else {
            console.error("No children found for this user. Cannot proceed.");
            process.exit(1);
        }
    }

    const testCases = [
        { name: "0 Images", length: 5, images: 0, words: ["cat", "dog", "ball"] },
        { name: "1 Image", length: 5, images: 1, words: ["forest", "magic", "sword"] }
    ];

    const results = [];

    for (const tc of testCases) {
        console.log(`\nRunning ${tc.name}: ${tc.length}min story, ${tc.images} images...`);

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-test-user-id': USER_ID
                },
                body: JSON.stringify({
                    childId: actualChildId,
                    words: tc.words,
                    storyLengthMinutes: tc.length,
                    imageSceneCount: tc.images
                })
            });

            if (!response.ok) {
                const error = await response.json();
                console.error(`${tc.name} failed:`, error);
                continue;
            }

            const data = await response.json();
            const bookId = data.book_id;
            console.log(`${tc.name} success! Book ID: ${bookId}`);
            console.log(` - Tracing: ${data.rawPrompt ? 'Prompt Captured' : 'MISSING PROMPT'}, ${data.rawResponse ? 'Response Captured' : 'MISSING RESPONSE'}`);

            // Wait for background tasks (narration, images)
            const waitTime = tc.images === 0 ? 30 : Math.max(45, tc.images * 25);
            console.log(` - Waiting ${waitTime}s for background tasks...`);
            await new Promise(r => setTimeout(r, waitTime * 1000));

            // Fetch final book data to verify
            const bookResponse = await fetch(`http://localhost:3000/api/books/${bookId}?include=content,media`, {
                headers: {
                    'x-test-user-id': USER_ID
                }
            });
            const bookData = await bookResponse.json();

            // Verification
            const charCount = (bookData.text || '').length;
            const images = bookData.images?.filter((img: any) => !img.isPlaceholder) || [];
            const sectionsWithPrompts = bookData.metadata?.sections?.filter((s: any) => s.image_prompt) || [];

            console.log(` - Chars: ${charCount}`);
            console.log(` - Images (Actual): ${images.length}`);
            if (images.length > 0) {
                console.log(" - Image Storage Paths:");
                images.forEach((img: any, i: number) => {
                    console.log(`   [${i}] ${img.storagePath || img.src}`);
                });
            }
            console.log(` - Sections with Image Prompts: ${sectionsWithPrompts.length}`);

            const resultPath = `/tmp/integ-test/case_${tc.length}min_${bookId}.json`;
            fs.mkdirSync(path.dirname(resultPath), { recursive: true });
            fs.writeFileSync(resultPath, JSON.stringify(bookData, null, 2));
            console.log(` - Saved to ${resultPath}`);

            results.push({
                testCase: tc.name,
                bookId,
                length: tc.length,
                expectedImages: tc.images,
                actualImages: images.length,
                storagePaths: images.map((img: any) => img.storagePath || img.src).join(', '),
                chars: charCount,
                filePath: resultPath
            });

        } catch (err) {
            console.error(`Error in ${tc.name}:`, err);
        }
    }

    console.log("\n--- TEST SUMMARY ---");
    console.table(results);
}

runTest();
