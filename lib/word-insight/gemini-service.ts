import { GoogleGenAI, Type } from "@google/genai";
import type { WordInsight, WordInsightService } from "./types";
import { FALLBACK_INSIGHT, normalizeWord } from "./types";

/**
 * Gemini-based word insight service (client-side)
 * Uses Google GenAI SDK to fetch definitions directly
 */
export class GeminiWordInsightService implements WordInsightService {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
    
    if (!apiKey) {
      console.warn("NEXT_PUBLIC_GEMINI_API_KEY not set. Word insights will use fallback data.");
    }

    this.ai = new GoogleGenAI({ apiKey });
  }

  async getInsight(word: string): Promise<WordInsight> {
    const normalized = normalizeWord(word);
    
    if (!normalized) {
      return { ...FALLBACK_INSIGHT, word };
    }

    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      return { ...FALLBACK_INSIGHT, word };
    }

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: `You are a helpful teacher for children ages 5-8. 
Provide a simple, kid-friendly explanation for the word "${normalized}".

Include:
1. A simple, clear definition (one sentence, appropriate for young children)
2. Simple phonetic pronunciation (e.g., "cat" = "kat", "there" = "thair")
3. 1-2 example sentences that a young child would understand

Keep everything simple, fun, and age-appropriate.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING },
              definition: { type: Type.STRING },
              pronunciation: { type: Type.STRING },
              examples: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["word", "definition", "pronunciation", "examples"]
          },
          systemInstruction: "You are a friendly teacher for 5-8 year-olds. Keep explanations short, simple, and positive.",
          temperature: 0.7,
        }
      });
      
      const data = JSON.parse(response.text || '{}') as WordInsight;
      
      // Validate response has required fields
      if (!data.word || !data.definition) {
        throw new Error("Invalid response from Gemini");
      }

      return {
        word: data.word,
        definition: data.definition,
        pronunciation: data.pronunciation || "",
        examples: Array.isArray(data.examples) ? data.examples.slice(0, 2) : []
      };

    } catch (error) {
      console.error("Gemini API error:", error);
      return { ...FALLBACK_INSIGHT, word };
    }
  }
}
