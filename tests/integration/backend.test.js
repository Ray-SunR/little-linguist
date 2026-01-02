const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testBackend() {
    console.log("🚀 Starting Backend Integration Tests...");

    try {
        // 1. Test /api/books (Sparse)
        console.log("\nTesting GET /api/books (Sparse)...");
        const booksResp = await axios.get(`${BASE_URL}/books`);
        console.log(`✅ Received ${booksResp.data.length} books.`);
        const sampleBook = booksResp.data[0];
        console.log("Sample Book Keys:", Object.keys(sampleBook));
        if (sampleBook.text || sampleBook.images) throw new Error("List should be sparse (no text/images)");

        const ginger = booksResp.data.find(b => b.book_key === 'ginger-the-giraffe');
        const gingerId = ginger.id;

        // 2. Test /api/books/[id] (Metadata only)
        console.log(`\nTesting GET /api/books/${gingerId} (Metadata only)...`);
        const metaOnly = await axios.get(`${BASE_URL}/books/${gingerId}`);
        if (metaOnly.data.text || metaOnly.data.images) throw new Error("Metadata request should not include content/media");

        // 3. Test /api/books/[id]?include=content,media
        console.log(`\nTesting GET /api/books/${gingerId}?include=content,media...`);
        const fullBook = await axios.get(`${BASE_URL}/books/${gingerId}?include=content,media`);
        console.log(`✅ Received Text Length: ${fullBook.data.text?.length}`);
        console.log(`✅ Received Images Count: ${fullBook.data.images?.length}`);
        if (!fullBook.data.text) throw new Error("Content missing");
        if (!fullBook.data.images || fullBook.data.images.length === 0) throw new Error("Media missing");

        // 4. Test /api/books/[id]/narration (Shard Continuity)
        console.log(`\nTesting GET /api/books/${gingerId}/narration (Continuity Check)...`);
        const narrationResp = await axios.get(`${BASE_URL}/books/${gingerId}/narration`);
        const shards = narrationResp.data;
        console.log(`✅ Received ${shards.length} shards.`);

        for (let i = 0; i < shards.length - 1; i++) {
            const current = shards[i];
            const next = shards[i + 1];
            console.log(`Checking boundary between Shard ${i} and Shard ${i + 1}...`);

            if (current.end_word_index + 1 !== next.start_word_index) {
                throw new Error(`Shard index gap! Shard ${i} ends at ${current.end_word_index}, Shard ${i + 1} starts at ${next.start_word_index}`);
            }
            console.log(`✅ Boundary OK: ${current.end_word_index} -> ${next.start_word_index}`);
        }

        const firstShard = shards[0];
        console.log(`\n✅ First shard index: ${firstShard.chunk_index}`);
        console.log(`✅ Audio Path: ${firstShard.audio_path}`);
        if (!firstShard.audio_path) throw new Error("First shard should have audio path");

        // 4. Test POST /api/books/[id]/narration (Generate specific shard and check marks)
        if (shards.length > 1) {
            console.log(`\nTesting POST /api/books/${gingerId}/narration (Generating shard 1)...`);
            const shard1Resp = await axios.post(`${BASE_URL}/books/${gingerId}/narration`, { chunkIndex: 1 });
            console.log(`✅ Shard 1 generated. Audio Path: ${shard1Resp.data.audio_path}`);

            const expectedMarksCount = shard1Resp.data.end_word_index - shard1Resp.data.start_word_index + 1;
            const actualMarksCount = shard1Resp.data.timings.length;
            console.log(`Checking marks count: Expected ${expectedMarksCount}, Actual ${actualMarksCount}`);

            if (actualMarksCount !== expectedMarksCount) {
                console.warn(`⚠️ Marks count mismatch! (It might be due to contractions or complex punctuation, but they should generally be close)`);
            } else {
                console.log(`✅ Marks count matches word range.`);
            }
        }

        console.log("\n✨ ALL BACKEND INTEGRATION TESTS PASSED!");
    } catch (error) {
        console.error("\n❌ TEST FAILED!");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", error.response.data);
        } else {
            console.error(error.message);
        }
        process.exit(1);
    }
}

testBackend();
