import { describe, it, expect } from 'vitest';
import { Tokenizer } from '../../lib/core/books/tokenizer';

describe('Tokenizer', () => {
    it('should tokenize basic sentences correctly', () => {
        const text = "Hello world.";
        const expected = ["Hello", "world"];
        const tokens = Tokenizer.tokenize(text);
        const words = Tokenizer.getWords(tokens).map(t => t.t);
        expect(words).toEqual(expected);
    });

    it('should handle contractions', () => {
        const text = "It's a beautiful day, isn't it?";
        const expected = ["It's", "a", "beautiful", "day", "isn't", "it"];
        const tokens = Tokenizer.tokenize(text);
        const words = Tokenizer.getWords(tokens).map(t => t.t);
        expect(words).toEqual(expected);
    });

    it('should handle hyphenated words', () => {
        const text = "The mother-in-law is here.";
        const expected = ["The", "mother-in-law", "is", "here"];
        const tokens = Tokenizer.tokenize(text);
        const words = Tokenizer.getWords(tokens).map(t => t.t);
        expect(words).toEqual(expected);
    });

    it('should handle punctuation and spaces', () => {
        const text = "Hello...   world!!!";
        const expected = ["Hello", "world"];
        const tokens = Tokenizer.tokenize(text);
        const words = Tokenizer.getWords(tokens).map(t => t.t);
        expect(words).toEqual(expected);
    });

    it('should handle smart quotes', () => {
        const text = "She said, \u201cHello!\u201d";
        const expected = ["She", "said", "Hello"];
        const tokens = Tokenizer.tokenize(text);
        const words = Tokenizer.getWords(tokens).map(t => t.t);
        expect(words).toEqual(expected);
    });

    it('should reconstruct text exactly', () => {
        const originalText = "Hello world! How are you?";
        const reconstruction = Tokenizer.join(Tokenizer.tokenize(originalText));
        expect(reconstruction).toBe(originalText);
    });
});
