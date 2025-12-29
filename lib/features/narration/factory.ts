import { PollyNarrationProvider } from "./polly-provider";
import { RemoteTtsNarrationProvider } from "./remote-tts-provider";
import { WebSpeechNarrationProvider } from "./web-speech-provider";
import type { INarrationProvider, NarrationProviderType } from "./types";

export interface NarrationFactoryConfig {
    audioUrl?: string;
}

export class NarrationProviderFactory {
    /**
     * Creates a narration provider instance based on the requested type.
     * Defaults to WebSpeech if the type is unknown or configuration is missing.
     * 
     * @param type - The type of provider to create ("polly", "remote_tts", "web_speech")
     * @param config - Configuration object (e.g. including audioUrl for remote_tts)
     * @throws Error if configuration is invalid for the requested type
     */
    static createProvider(type: string, config: NarrationFactoryConfig = {}): INarrationProvider {
        // Validation: Ensure type is something we expect, though we fallback safely for unknown strings if needed
        // But for specific types, we should enforce config validity.

        switch (type as NarrationProviderType) {
            case "polly":
                return new PollyNarrationProvider();

            case "remote_tts":
                if (!config.audioUrl) {
                    throw new Error("[NarrationFactory] 'remote_tts' requested but no audioUrl provided.");
                }
                return new RemoteTtsNarrationProvider(config.audioUrl);

            case "web_speech":
                return new WebSpeechNarrationProvider();

            default:
                // Handle "auto" or unknown types by defaulting to WebSpeech (safe fallback)
                // But log a warning if it's an unexpected type
                if (type !== "auto" && type !== undefined) {
                    console.warn(`[NarrationFactory] Unknown provider type '${type}', falling back to WebSpeech.`);
                }
                return new WebSpeechNarrationProvider();
        }
    }
}
