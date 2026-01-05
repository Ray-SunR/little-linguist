import { Token } from '@/lib/core/books/tokenizer';

/**
 * WordToken format used by BookText and BookLayout components.
 * This is the legacy format from local tokenization.
 */
export interface WordToken {
    text: string;
    wordIndex: number;
    punctuation?: string;
    start: number; // For compatibility
    end: number;   // For compatibility
}

/**
 * Converts Supabase Token format to WordToken format for BookText compatibility.
 * 
 * Supabase stores tokens as: { t: string, type: 'w'|'s'|'p', i?: number }
 * BookText expects: { text: string, wordIndex: number, punctuation?: string }
 * 
 * This function:
 * 1. Filters to only word tokens (type === 'w')
 * 2. Attaches following punctuation to each word
 * 3. Returns in the WordToken format
 */
export function tokensToWordTokens(tokens: Token[]): WordToken[] {
    const result: WordToken[] = [];

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        if (token.type === 'w' && token.i !== undefined) {
            // Collect all punctuation tokens that follow this word (before next word or end)
            let punctuation = '';
            let j = i + 1;

            while (j < tokens.length) {
                const nextToken = tokens[j];
                if (nextToken.type === 'w') break; // Stop at next word
                if (nextToken.type === 'p') {
                    punctuation += nextToken.t;
                }
                // Skip spaces (type === 's')
                j++;
            }

            result.push({
                text: token.t,
                wordIndex: token.i,
                punctuation: punctuation || undefined,
                start: 0,
                end: 0
            });
        }
    }

    return result;
}

/**
 * Gets all word tokens from a Token array.
 * Simpler version that just extracts words without punctuation handling.
 */
