import { GeminiWordInsightService } from "./gemini-service";

// Re-export types for convenience
export type { WordInsight, WordInsightService } from "./types";
export { normalizeWord, FALLBACK_INSIGHT } from "./types";

/**
 * Factory function to get the appropriate word insight service.
 * The server-side /api/word-insight route handles provider selection.
 * 
 * @returns WordInsightService instance
 */
export function getWordInsightService(): WordInsightService {
  return new GeminiWordInsightService();
}

// Singleton instance for reuse
let serviceInstance: WordInsightService | null = null;

/**
 * Get singleton service instance (creates on first call)
 */
export function getWordInsightServiceInstance(): WordInsightService {
  if (!serviceInstance) {
    serviceInstance = getWordInsightService();
  }
  return serviceInstance;
}
