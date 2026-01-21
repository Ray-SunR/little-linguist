import { describe, it, expect } from 'vitest';
import { tokenizeText } from '../tokenization';

describe('tokenizeText', () => {
    it('should correctly tokenize a simple sentence', () => {
        const text = "Hello world.";
        const tokens = tokenizeText(text);
        expect(tokens).toHaveLength(2);
        expect(tokens[0].text).toBe('Hello');
        expect(tokens[1].text).toBe('world');
        expect(tokens[1].punctuation).toBe('.');
    });

    it('should handle multiple spaces', () => {
        const text = "Hello   world";
        const tokens = tokenizeText(text);
        expect(tokens).toHaveLength(2);
        expect(tokens[1].start).toBe(8); // "Hello" (5) + "   " (3)
    });
});
