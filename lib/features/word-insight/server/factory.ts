import { WordAnalysisProvider } from "./types";
import { GeminiWordAnalysisProvider } from "./gemini-provider";

export function getWordAnalysisProvider(): WordAnalysisProvider {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not defined in environment variables");
    }

    // Default to Gemini for now
    // In the future, we could check an environment variable like WORD_INSIGHT_PROVIDER
    return new GeminiWordAnalysisProvider(apiKey);
}
