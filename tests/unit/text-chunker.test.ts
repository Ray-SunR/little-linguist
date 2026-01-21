import { describe, it, expect } from 'vitest';
import { TextChunker } from '../../lib/core/books/text-chunker';

const mockText = `Ginger the giraffe lived in Kenya. She had a long neck. She was very tall and could reach the tops of trees. Ginger loved the leaves. One day, Mickey the monkey arrived. He looked very tired. Mickey was hungry.`;

describe('TextChunker', () => {
    it('should chunk text and verify word counts', () => {
        const chunks = TextChunker.chunk(mockText);

        expect(chunks.length).toBeGreaterThan(0);

        chunks.forEach((chunk) => {
            const wordCount = chunk.text.split(/\s+/).length;
            const expectedCount = chunk.endWordIndex - chunk.startWordIndex + 1;

            expect(wordCount).toBe(expectedCount);
        });
    });
});
