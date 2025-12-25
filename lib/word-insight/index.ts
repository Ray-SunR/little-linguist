import type { WordInsightService } from "./types";
import { GeminiWordInsightService } from "./gemini-service";
import { BackendWordInsightService } from "./backend-service";

// Re-export types for convenience
export type { WordInsight, WordInsightService } from "./types";
export { normalizeWord, FALLBACK_INSIGHT } from "./types";

/**
 * Factory function to get the appropriate word insight service
 * Toggle between implementations via environment variable
 * 
 * @returns WordInsightService instance (Gemini or Backend)
 */
export function getWordInsightService(): WordInsightService {
  const useBackend = process.env.NEXT_PUBLIC_USE_BACKEND_WORD_INSIGHT === "true";
  
  if (useBackend) {
    return new BackendWordInsightService();
  }
  
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
