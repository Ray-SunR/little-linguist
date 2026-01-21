import { describe, it, expect } from 'vitest';
import { tokenizeText } from '../tokenization';

describe('tokenizeText', () => {
    it('tokenizes a simple sentence correctly', () => {
        const text = "Hello world.";
        const tokens = tokenizeText(text);
        expect(tokens).toHaveLength(2);
        
        expect(tokens[0].text).toBe('Hello');
        expect(tokens[0].punctuation).toBeNull();
        
        expect(tokens[1].text).toBe('world');
        expect(tokens[1].punctuation).toBe('.');
    });

    it('handles multiple spaces between words correctly', () => {
        const text = "Hello   world";
        const tokens = tokenizeText(text);
        expect(tokens).toHaveLength(2);
        expect(tokens[1].start).toBe(8); // "Hello" (5) + "   " (3)
    });

    it('returns an empty array for an empty string', () => {
        const tokens = tokenizeText("");
        expect(tokens).toHaveLength(0);
    });

    it('returns an empty array for a string with only whitespace', () => {
        const tokens = tokenizeText("   \t\n  ");
        expect(tokens).toHaveLength(0);
    });

    it('correctly splits punctuation from words in complex sentences', () => {
        const text = "Hello, world! How are you?";
        const tokens = tokenizeText(text);

        expect(tokens).toHaveLength(5);

        // "Hello,"
        expect(tokens[0].text).toBe('Hello');
        expect(tokens[0].punctuation).toBe(',');

        // "world!"
        expect(tokens[1].text).toBe('world');
        expect(tokens[1].punctuation).toBe('!');

        // "How"
        expect(tokens[2].text).toBe('How');
        expect(tokens[2].punctuation).toBeNull();
        
        // "are"
        expect(tokens[3].text).toBe('are');
        expect(tokens[3].punctuation).toBeNull();
        
        // "you?"
        expect(tokens[4].text).toBe('you');
        expect(tokens[4].punctuation).toBe('?');
    });
});
