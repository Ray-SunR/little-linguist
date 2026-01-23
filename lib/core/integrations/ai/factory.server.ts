import { GeminiServerProvider } from "./gemini-server-provider";
import { MockAIProvider } from "./mock-provider.server";
import type { AIProvider } from "./types";

export class AIFactory {
    static getProvider(): AIProvider {
        if (process.env.MOCK_AI_SERVICES === "true") {
            return new MockAIProvider();
        }
        return new GeminiServerProvider();
    }
}
