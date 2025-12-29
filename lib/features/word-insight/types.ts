/**
 * Word insight data structure returned by all services
 */
export interface WordInsight {
  word: string;
  definition: string;
  pronunciation: string;
  examples: string[];
}

/**
 * Service interface for word insight providers
 * Implementations: GeminiWordInsightService, BackendWordInsightService
 */
export interface WordInsightService {
  getInsight(word: string): Promise<WordInsight>;
}

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

/**
 * Normalize word for lookup and caching
 */
export function normalizeWord(word: string): string {
  return word.trim().toLowerCase().replace(/[.,!?;:'"]/g, "");
}
