import type { WordInsight, WordInsightService } from "./types";
import { FALLBACK_INSIGHT, normalizeWord } from "./types";
import type { AIProvider } from "@/lib/core/integrations/ai";
import { getAIProvider } from "@/lib/core/integrations/ai";

/**
 * AI-based word insight service
 * Delegates to the configured AIProvider
 */
export class AIWordInsightService implements WordInsightService {
    private provider: AIProvider;

    constructor(provider?: AIProvider) {
        this.provider = provider || getAIProvider();
    }

    async getInsight(word: string): Promise<WordInsight> {
        const normalized = normalizeWord(word);

        if (!normalized) {
            return { ...FALLBACK_INSIGHT, word };
        }

        try {
            return await this.provider.getWordInsight(normalized);
        } catch (error) {
            console.error("AI Insight Service error:", error);
            // Re-throw so the UI can handle specific errors like LIMIT_REACHED
            throw error;
        }
    }
}
