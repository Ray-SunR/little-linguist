import { tokenizeText } from "../utils/tokenization";

export interface NarrationChunk {
    index: number;
    text: string;
    startWordIndex: number;
    endWordIndex: number;
}

/**
 * TextChunker splits a long text into smaller segments for narration.
 * It ensures that segments do not break in the middle of a sentence
 * and tracks the word indices to sync with the frontend tokenizer.
 */
export class TextChunker {
    private static readonly MAX_CHARS = 1500;
    private static readonly SENTENCE_ENDERS = /[.!?](\s+|$)/;

    static chunk(rawText: string): NarrationChunk[] {
        const tokens = tokenizeText(rawText);
        const chunks: NarrationChunk[] = [];

        let currentChunkWords: string[] = [];
        let currentChunkStartWordIndex = 0;
        let currentCharsCount = 0;
        let chunkIndex = 0;

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            const wordWithPunct = token.text + (token.punctuation || "");

            currentChunkWords.push(wordWithPunct);
            currentCharsCount += wordWithPunct.length + 1; // +1 for space

            const isSentenceEnd = this.SENTENCE_ENDERS.test(wordWithPunct);
            const isOverLimit = currentCharsCount >= this.MAX_CHARS;

            // If we are over the limit and at a sentence boundary, or at the end of text
            if ((isOverLimit && isSentenceEnd) || i === tokens.length - 1) {
                chunks.push({
                    index: chunkIndex++,
                    text: currentChunkWords.join(" "),
                    startWordIndex: currentChunkStartWordIndex,
                    endWordIndex: i,
                });

                currentChunkWords = [];
                currentChunkStartWordIndex = i + 1;
                currentCharsCount = 0;
            }
        }

        return chunks;
    }
}
