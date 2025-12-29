import { GeminiProvider } from "./gemini-provider";
import type { AIProvider } from "./types";

let providerInstance: AIProvider | null = null;

export function getAIProvider(): AIProvider {
    if (!providerInstance) {
        providerInstance = new GeminiProvider();
    }
    return providerInstance;
}
