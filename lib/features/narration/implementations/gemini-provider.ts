import type {
  INarrationProvider,
  NarrationPrepareInput,
  NarrationResult,
  NarrationEvent,
  NarrationCapabilities,
} from "../types";
import { WebSpeechNarrationProvider } from "./web-speech-provider";

/**
 * Placeholder Gemini provider.
 * Today, it delegates to Web Speech while we finalize the Gemini TTS pipeline.
 * Keeping the class allows provider-agnostic selection without runtime errors
 * when NEXT_PUBLIC_NARRATION_PROVIDER=gemini.
 */
export class GeminiNarrationProvider implements INarrationProvider {
  type: "gemini" = "gemini";
  capabilities: NarrationCapabilities = {
    supportsStreaming: false,
    supportsWordTimings: false,
    supportsVoices: false,
  };

  private delegate = new WebSpeechNarrationProvider();

  async prepare(input: NarrationPrepareInput): Promise<NarrationResult> {
    console.warn("[GeminiNarrationProvider] Using Web Speech fallback (not implemented yet).");
    return this.delegate.prepare(input);
  }

  async play(): Promise<void> {
    return this.delegate.play();
  }

  async pause(): Promise<void> {
    return this.delegate.pause();
  }

  async stop(): Promise<void> {
    return this.delegate.stop();
  }

  setPlaybackRate(rate: number): void {
    this.delegate.setPlaybackRate(rate);
  }

  getCurrentTimeSec(): number | null {
    return this.delegate.getCurrentTimeSec();
  }

  seekToTime(seconds: number): void {
    this.delegate.seekToTime(seconds);
  }

  on(event: NarrationEvent, cb: (payload?: unknown) => void): () => void {
    return this.delegate.on(event, cb);
  }
}
