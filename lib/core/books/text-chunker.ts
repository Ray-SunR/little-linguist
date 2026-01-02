import { Tokenizer, Token } from "./tokenizer";

export interface NarrationChunk {
    index: number;
    text: string;
    startWordIndex: number;
    endWordIndex: number;
}

/**
 * TextChunker splits a long text into smaller segments for narration.
 * It ensures that segments do not break in the middle of a sentence
 * and tracks the absolute word indices.
 */
export class TextChunker {
    private static readonly MAX_CHARS = 1500;
    private static readonly SENTENCE_ENDERS = /[.!?](\s+|$)/;

    static chunk(rawText: string): NarrationChunk[] {
        const allTokens = Tokenizer.tokenize(rawText);
        const wordTokens = Tokenizer.getWords(allTokens);

        const chunks: NarrationChunk[] = [];
        let currentTokens: Token[] = [];
        let currentWordIndices: number[] = [];
        let charsCount = 0;
        let chunkIndex = 0;

        for (let i = 0; i < allTokens.length; i++) {
            const token = allTokens[i];
            currentTokens.push(token);
            charsCount += token.t.length;

            if (token.type === 'w' && token.i !== undefined) {
                currentWordIndices.push(token.i);
            }

            const isSentenceEnd = token.type === 'p' && this.SENTENCE_ENDERS.test(token.t);
            const isOverLimit = charsCount >= this.MAX_CHARS;
            const isLastToken = i === allTokens.length - 1;

            if ((isOverLimit && isSentenceEnd) || isLastToken) {
                if (currentWordIndices.length > 0) {
                    chunks.push({
                        index: chunkIndex++,
                        text: Tokenizer.join(currentTokens),
                        startWordIndex: Math.min(...currentWordIndices),
                        endWordIndex: Math.max(...currentWordIndices),
                    });
                }

                currentTokens = [];
                currentWordIndices = [];
                charsCount = 0;
            }
        }

        return chunks;
    }
}
