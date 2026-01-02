import { Token } from './tokenizer';

/**
 * Polly speech mark structure (as returned by the Polly API).
 */
export interface PollyMark {
    time: number;
    type: 'word';
    start: number;
    end: number;
    value: string;
}

/**
 * Aligned speech mark with the correct absolute word index.
 */
export interface AlignedMark extends PollyMark {
    absIndex: number;
}

/**
 * Normalizes a word for comparison (lowercase, trim).
 */
function normalizeWord(word: string): string {
    return word.toLowerCase().trim();
}

/**
 * Checks if a hyphenated token contains a Polly word as one of its parts.
 * E.g., tokenWord="B-U-R-P" contains pollyWord="B", "U", "R", "P"
 */
function isPartOfHyphenatedWord(tokenWord: string, pollyWord: string): boolean {
    const parts = tokenWord.split('-').map(p => p.toLowerCase());
    return parts.includes(pollyWord.toLowerCase());
}

/**
 * Aligns Polly speech marks to the canonical token indices by matching word values.
 * 
 * This solves the problem where Polly may parse text differently than our tokenizer,
 * resulting in offset `absIndex` values if we use naive sequential mapping.
 * 
 * Algorithm:
 * 1. For each Polly speech mark, find the corresponding token by matching the word value.
 * 2. Use a greedy forward-scanning cursor to efficiently handle sequential words.
 * 3. If exact match fails, attempt fuzzy matching (prefix/suffix).
 * 
 * @param speechMarks - Raw Polly speech marks
 * @param wordTokens - Subset of master tokens (words only) for this chunk
 * @returns Array of speech marks with correct `absIndex` values
 */
export function alignSpeechMarksToTokens(
    speechMarks: PollyMark[],
    wordTokens: Token[]
): AlignedMark[] {
    const result: AlignedMark[] = [];
    let tokenCursor = 0;
    const MAX_LOOKAHEAD = 10; // Don't scan too far ahead to prevent getting stuck

    for (const mark of speechMarks) {
        const pollyWord = normalizeWord(mark.value);
        let matched = false;

        // Scan forward to find matching token (limited window)
        const scanLimit = Math.min(tokenCursor + MAX_LOOKAHEAD, wordTokens.length);

        for (let i = tokenCursor; i < scanLimit; i++) {
            const tokenWord = normalizeWord(wordTokens[i].t);

            // Exact match
            if (tokenWord === pollyWord) {
                result.push({
                    ...mark,
                    absIndex: wordTokens[i].i!
                });
                tokenCursor = i + 1;
                matched = true;
                break;
            }

            // Fuzzy match: prefix (e.g., "kid's" vs "kids")
            if (tokenWord.startsWith(pollyWord) || pollyWord.startsWith(tokenWord)) {
                result.push({
                    ...mark,
                    absIndex: wordTokens[i].i!
                });
                tokenCursor = i + 1;
                matched = true;
                break;
            }

            // Hyphenated word match: "B-U-R-P" contains "B", "U", "R", "P"
            // Assign all letters of the spelled-out word to the same token index
            if (tokenWord.includes('-') && isPartOfHyphenatedWord(tokenWord, pollyWord)) {
                result.push({
                    ...mark,
                    absIndex: wordTokens[i].i!
                });
                // Don't advance cursor - next letters should also map to this token
                matched = true;
                break;
            }
        }

        if (!matched) {
            // Skip this Polly word - continue scanning from current position
            if (process.env.NODE_ENV === 'development') {
                console.warn(`[SpeechMarkAligner] Skipping unmatched: "${mark.value}" (cursor at ${tokenCursor})`);
            }
        }
    }

    return result;
}

/**
 * Extracts word tokens for a specific chunk from the master token stream.
 * 
 * @param allTokens - All tokens from the book
 * @param startWordIndex - Start word index of the chunk
 * @param endWordIndex - End word index of the chunk
 */
export function getWordTokensForChunk(
    allTokens: Token[],
    startWordIndex: number,
    endWordIndex: number
): Token[] {
    return allTokens.filter(
        t => t.type === 'w' && t.i !== undefined && t.i >= startWordIndex && t.i <= endWordIndex
    );
}
