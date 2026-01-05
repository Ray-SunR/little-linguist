import { AIWordInsightService } from "./ai-service";
import type { WordInsightProvider, WordInsightProviderType } from "./types";

const ENV_PROVIDER = process.env.NEXT_PUBLIC_WORD_INSIGHT_PROVIDER as WordInsightProviderType | undefined;
const DEFAULT_PROVIDER: WordInsightProviderType = ENV_PROVIDER || "ai";

/**
 * Selects a word insight provider in a provider-agnostic way.
 * Keeps surface area small while allowing future providers to plug in.
 */
export function getWordInsightProvider(
  type: WordInsightProviderType = DEFAULT_PROVIDER
): WordInsightProvider {
  switch (type) {
    case "ai":
      return new AIWordInsightService();
    default: {
      console.warn(`[WordInsightFactory] Unknown provider '${type}', falling back to AI provider.`);
      return new AIWordInsightService();
    }
  }
}
