import type { WordInsight, WordInsightService } from "./types";
import { FALLBACK_INSIGHT, normalizeWord } from "./types";

/**
 * Gemini-based word insight service (client-side)
 * Now proxies requests through server-side /api/word-insight for security
 */
export class GeminiWordInsightService implements WordInsightService {
  async getInsight(word: string): Promise<WordInsight> {
    const normalized = normalizeWord(word);

    if (!normalized) {
      return { ...FALLBACK_INSIGHT, word };
    }

    try {
      const response = await fetch("/api/word-insight", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ word: normalized }),
      });

      if (!response.ok) {
        throw new Error(`Proxy error: ${response.statusText}`);
      }

      const data = await response.json();

      // Validate response has required fields
      if (!data.word || !data.definition) {
        throw new Error("Invalid response from Gemini Proxy");
      }

      return {
        word: data.word,
        definition: data.definition,
        pronunciation: data.pronunciation || "",
        examples: Array.isArray(data.examples) ? data.examples.slice(0, 2) : []
      };

    } catch (error) {
      console.error("Gemini Insight Service error:", error);
      return { ...FALLBACK_INSIGHT, word };
    }
  }
}
