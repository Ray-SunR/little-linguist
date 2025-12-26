/**
 * Text chunker for splitting long texts into smaller segments
 * for text-to-speech APIs with character limits
 */

export interface TextChunk {
  text: string;
  startWordIndex: number;
  endWordIndex: number;
  startCharIndex: number;
  endCharIndex: number;
}

export interface ChunkerConfig {
  maxChars: number;
  preferSentenceBoundary?: boolean;
}

// Provider-specific configurations
export const CHUNKER_PRESETS = {
  // AWS Polly has 3,000 character limit per request
  POLLY: { maxChars: 2500, preferSentenceBoundary: true },
  // Web Speech API - conservative for mobile and Chrome issues
  WEB_SPEECH: { maxChars: 2000, preferSentenceBoundary: true },
  // More aggressive for desktop Web Speech
  WEB_SPEECH_DESKTOP: { maxChars: 4000, preferSentenceBoundary: true },
};

/**
 * Split text into chunks at natural boundaries (sentences/phrases)
 * while respecting character limits
 */
export function splitIntoChunks(
  text: string,
  config: ChunkerConfig = CHUNKER_PRESETS.WEB_SPEECH
): TextChunk[] {
  const chunks: TextChunk[] = [];
  let remaining = text.trim();
  let globalCharOffset = 0;
  let globalWordOffset = 0;

  while (remaining.length > 0) {
    // If remaining text fits in one chunk, use it all
    if (remaining.length <= config.maxChars) {
      const wordCount = countWords(remaining);
      chunks.push({
        text: remaining,
        startWordIndex: globalWordOffset,
        endWordIndex: globalWordOffset + wordCount - 1,
        startCharIndex: globalCharOffset,
        endCharIndex: globalCharOffset + remaining.length - 1,
      });
      break;
    }

    // Find the best breaking point within maxChars
    let chunkText: string;
    
    if (config.preferSentenceBoundary) {
      // Try to break at sentence boundary (. ! ? followed by space or end)
      const sentenceEndPattern = /[.!?][\s\n]/g;
      let bestBreak = -1;
      let match: RegExpExecArray | null;

      while ((match = sentenceEndPattern.exec(remaining)) !== null) {
        const endPos = match.index + 1; // Include the punctuation
        if (endPos <= config.maxChars) {
          bestBreak = endPos;
        } else {
          break; // We've gone past the limit
        }
      }

      if (bestBreak > 0) {
        // Found a good sentence boundary
        chunkText = remaining.substring(0, bestBreak).trim();
      } else {
        // No sentence boundary found within limit, try comma or semicolon
        const phrasePattern = /[,;][\s\n]/g;
        while ((match = phrasePattern.exec(remaining)) !== null) {
          const endPos = match.index + 1;
          if (endPos <= config.maxChars) {
            bestBreak = endPos;
          } else {
            break;
          }
        }

        if (bestBreak > 0) {
          chunkText = remaining.substring(0, bestBreak).trim();
        } else {
          // Fall back to breaking at last space before limit
          chunkText = breakAtSpace(remaining, config.maxChars);
        }
      }
    } else {
      // Just break at space within limit
      chunkText = breakAtSpace(remaining, config.maxChars);
    }

    // Ensure we got at least something (safety check)
    if (chunkText.length === 0) {
      // Force break at maxChars if we can't find any good boundary
      // This shouldn't happen with normal text, but handle it
      chunkText = remaining.substring(0, config.maxChars);
    }

    const wordCount = countWords(chunkText);
    
    chunks.push({
      text: chunkText,
      startWordIndex: globalWordOffset,
      endWordIndex: globalWordOffset + wordCount - 1,
      startCharIndex: globalCharOffset,
      endCharIndex: globalCharOffset + chunkText.length - 1,
    });

    // Move to next chunk
    globalCharOffset += chunkText.length;
    globalWordOffset += wordCount;
    remaining = remaining.substring(chunkText.length).trim();
    
    // Adjust global char offset for trimmed whitespace
    const trimmedChars = text.length - globalCharOffset - remaining.length;
    globalCharOffset += trimmedChars;
  }

  return chunks;
}

/**
 * Break text at the last space before maxChars
 */
function breakAtSpace(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }

  // Find last space before maxChars
  const chunk = text.substring(0, maxChars);
  const lastSpace = chunk.lastIndexOf(' ');

  if (lastSpace > 0) {
    return chunk.substring(0, lastSpace);
  }

  // No space found, force break at maxChars (rare case - very long word)
  return chunk;
}

/**
 * Count words in text (simple whitespace split)
 */
function countWords(text: string): number {
  const words = text.trim().split(/\s+/);
  return words.filter(w => w.length > 0).length;
}

/**
 * Detect if running on Android
 */
export function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android/i.test(navigator.userAgent);
}
