import { describe, it, expect } from 'vitest';
import { tokensToWordTokens } from '@/lib/core/books/token-adapter';
import { Token } from '@/lib/core/books/tokenizer';

describe('Token Adapter', () => {
    it('should convert tokens to word tokens with punctuation', () => {
        const tokens: Token[] = [
            { t: 'Hello', type: 'w', i: 0 },
            { t: ' ', type: 's' },
            { t: 'world', type: 'w', i: 1 },
            { t: '!', type: 'p' },
            { t: '?', type: 'p' }
        ];

        const wordTokens = tokensToWordTokens(tokens);
        expect(wordTokens.length).toBe(2);
        
        expect(wordTokens[0].text).toBe('Hello');
        expect(wordTokens[0].wordIndex).toBe(0);
        expect(wordTokens[0].punctuation).toBeUndefined();

        expect(wordTokens[1].text).toBe('world');
        expect(wordTokens[1].wordIndex).toBe(1);
        expect(wordTokens[1].punctuation).toBe('!?');
    });
});
