/**
 * Word insight feature types
 * Re-exports core types for backward compatibility
 */
import type { WordInsight } from "@/lib/core";

// Re-export from core for consumers
export type { WordInsight } from "@/lib/core";
export { normalizeWord } from "@/lib/core";

export type WordInsightProviderType = "ai";

/**
 * Provider interface for word insight lookups.
 * Implementations: AIWordInsightService (default), future providers can plug in here.
 */
export interface WordInsightProvider {
  getInsight(word: string): Promise<WordInsight>;
}

/**
 * Backward-compatible alias. Keep existing name to avoid breaking imports.
 */
export interface WordInsightService extends WordInsightProvider {}

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

// Alias for clarity in new code
export type WordListStore = IWordService;

/**
 * Fallback data when service fails
 */
export const FALLBACK_INSIGHT: WordInsight = {
  word: "unknown",
  definition: "Sorry, we couldn't find a definition for this word.",
  pronunciation: "",
  examples: []
};
