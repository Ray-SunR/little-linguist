/**
 * Word insight feature types
 * Re-exports core types for backward compatibility
 */
import type { WordInsight } from "@/lib/core";

// Re-export from core for consumers
export type { WordInsight } from "@/lib/core";
export { normalizeWord } from "@/lib/core";

/**
 * Service interface for word insight providers
 * Implementations: AIWordInsightService
 */
export interface WordInsightService {
  getInsight(word: string): Promise<WordInsight>;
}

/**
 * Service interface for word list persistence
 * Implementations: LocalStorageWordService
 */
export interface IWordService {
  getWords(): Promise<WordInsight[]>;
  addWord(word: WordInsight): Promise<void>;
  removeWord(wordStr: string): Promise<void>;
  hasWord(wordStr: string): Promise<boolean>;
}

/**
 * Fallback data when service fails
 */
export const FALLBACK_INSIGHT: WordInsight = {
  word: "unknown",
  definition: "Sorry, we couldn't find a definition for this word.",
  pronunciation: "",
  examples: []
};
