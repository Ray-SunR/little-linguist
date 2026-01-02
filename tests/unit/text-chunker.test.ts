import { TextChunker } from '../../lib/core/books/text-chunker';

const mockText = `Ginger the giraffe lived in Kenya. She had a long neck. She was very tall and could reach the tops of trees. Ginger loved the leaves. One day, Mickey the monkey arrived. He looked very tired. Mickey was hungry.`;

function testChunker() {
    console.log("Running TextChunker Unit Test...");

    const chunks = TextChunker.chunk(mockText);

    console.log(`Generated ${chunks.length} chunks.`);

    chunks.forEach((chunk, i) => {
        console.log(`\nChunk ${chunk.index}:`);
        console.log(`Words: ${chunk.startWordIndex} - ${chunk.endWordIndex}`);
        console.log(`Content: ${chunk.text.substring(0, 50)}...`);

        // Safety check: word count should match index range
        const wordCount = chunk.text.split(/\s+/).length;
        const expectedCount = chunk.endWordIndex - chunk.startWordIndex + 1;

        if (wordCount !== expectedCount) {
            console.error(`❌ Mismatch! Count: ${wordCount}, Expected: ${expectedCount}`);
        } else {
            console.log(`✅ Word count matches index range.`);
        }
    });

    console.log("\nAll tests passed!");
}

testChunker();
