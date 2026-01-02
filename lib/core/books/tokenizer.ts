/**
 * Structure of a single token in the canonical token stream.
 */
export interface Token {
    /** The actual text content (word, space, or punctuation) */
    t: string;
    /** The type of token: 'w' (word), 's' (space), 'p' (punctuation) */
    type: 'w' | 's' | 'p';
    /** 
     * Absolute Word Index. 
     * Only assigned to tokens of type 'w'.
     * This is the definitive index used for audio-word synchronization.
     */
    i?: number;
}

/**
 * Shared utility for consistent text tokenization across backend and frontend.
 * Ensures that indices remain stable and predictable.
 */
export class Tokenizer {
    /**
     * Splits text into a sequence of words, spaces, and punctuation.
     * Assigns incrementing indices to 'word' tokens.
     */
    static tokenize(text: string): Token[] {
        if (!text) return [];

        // This regex captures:
        // 1. Words (including contractions like "don't" or "mother-in-law")
        // 2. Multi-character whitespace
        // 3. Individual punctuation marks
        const regex = /([a-zA-Z0-9]+(?:['\u2019-][a-zA-Z0-9]+)*)|(\s+)|([^\w\s])/g;

        const tokens: Token[] = [];
        let wordIndex = 0;
        let match;

        while ((match = regex.exec(text)) !== null) {
            const [full, word, space, punct] = match;

            if (word) {
                tokens.push({ t: word, type: 'w', i: wordIndex++ });
            } else if (space) {
                tokens.push({ t: space, type: 's' });
            } else if (punct) {
                tokens.push({ t: punct, type: 'p' });
            }
        }

        return tokens;
    }

    /**
     * Gets only the word-type tokens from a full token stream.
     */
    static getWords(tokens: Token[]): Token[] {
        return tokens.filter(t => t.type === 'w');
    }

    /**
     * Reconstructs a string from a subset of tokens.
     */
    static join(tokens: Token[]): string {
        return tokens.map(t => t.t).join('');
    }
}
