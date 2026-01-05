import { RemoteTtsNarrationProvider } from "./implementations/remote-tts-provider";
import { WebSpeechNarrationProvider } from "./implementations/web-speech-provider";
import { BlobNarrationProvider } from "./implementations/blob-provider";
import { GeminiNarrationProvider } from "./implementations/gemini-provider";
import type { INarrationProvider, NarrationProviderType, NarrationProviderConfig } from "./types";

const ENV_PROVIDER = process.env.NEXT_PUBLIC_NARRATION_PROVIDER as NarrationProviderType | undefined;
const FALLBACK_PROVIDER: NarrationProviderType = "web_speech";

/**
 * Centralized provider selection to keep UI/hooks provider-agnostic.
 * Mirrors the provider-factory pattern used by image-generation.
 */
export class NarrationProviderFactory {
    /**
     * Creates a narration provider instance based on the requested type.
     * - Honors env override via NEXT_PUBLIC_NARRATION_PROVIDER.
     * - If type is "auto", prefers remote_tts when an audioUrl is supplied, else falls back.
     * - Unknown types fall back to Web Speech with a console warning.
     */
    static createProvider(
        type: NarrationProviderType | "auto" | undefined,
        config: NarrationProviderConfig = {}
    ): INarrationProvider {
        const requested = this.resolveType(type, config);

        switch (requested) {
            case "blob": {
                if (!config.audioSource) {
                    throw new Error("[NarrationFactory] 'blob' requested but no audioSource provided.");
                }
                return new BlobNarrationProvider(config.audioSource, undefined);
            }
            case "remote_tts": {
                if (!config.audioUrl) {
                    throw new Error("[NarrationFactory] 'remote_tts' requested but no audioUrl provided.");
                }
                return new RemoteTtsNarrationProvider(config.audioUrl);
            }
            case "polly": {
                console.warn("[NarrationFactory] Polly provider not wired on client; using Web Speech fallback.");
                return new WebSpeechNarrationProvider();
            }
            case "gemini": {
                return new GeminiNarrationProvider();
            }
            case "web_speech":
            default:
                return new WebSpeechNarrationProvider();
        }
    }

    private static resolveType(
        type: NarrationProviderType | "auto" | undefined,
        config: NarrationProviderConfig
    ): NarrationProviderType {
        // Explicit override wins
        if (type && type !== "auto") {
            return type as NarrationProviderType;
        }

        // Env override next
        if (ENV_PROVIDER) {
            return ENV_PROVIDER;
        }

        // Auto selection: prefer blob when explicit source provided, then remote_tts for URLs
        if (config.audioSource) return "blob";
        if (config.audioUrl) return "remote_tts";

        return FALLBACK_PROVIDER;
    }
}
