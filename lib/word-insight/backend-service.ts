import type { WordInsight, WordInsightService } from "./types";
import { FALLBACK_INSIGHT, normalizeWord } from "./types";

/**
 * Backend API word insight service (future implementation)
 * Will call your custom backend API when available
 */
export class BackendWordInsightService implements WordInsightService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = process.env.NEXT_PUBLIC_WORD_INSIGHT_API_URL || "";
    
    if (!this.apiUrl) {
      console.warn("NEXT_PUBLIC_WORD_INSIGHT_API_URL not set. Backend service not configured.");
    }
  }

  async getInsight(word: string): Promise<WordInsight> {
    const normalized = normalizeWord(word);
    
    if (!normalized) {
      return { ...FALLBACK_INSIGHT, word };
    }

    if (!this.apiUrl) {
      console.error("Backend service not configured. Set NEXT_PUBLIC_WORD_INSIGHT_API_URL.");
      return { ...FALLBACK_INSIGHT, word };
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ word: normalized }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Validate response
      if (!data.word || !data.definition) {
        throw new Error("Invalid response from backend");
      }

      return {
        word: data.word,
        definition: data.definition,
        pronunciation: data.pronunciation || "",
        examples: Array.isArray(data.examples) ? data.examples : []
      };

    } catch (error) {
      console.error("Backend API error:", error);
      return { ...FALLBACK_INSIGHT, word };
    }
  }
}
