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
  /**
   * Fetch word insight for a given word
   * @param word - The word to look up (will be normalized)
   * @returns Promise resolving to WordInsight
   * @throws Error if service fails (should be caught and fallback used)
   */
  getInsight(word: string): Promise<WordInsight>;
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
