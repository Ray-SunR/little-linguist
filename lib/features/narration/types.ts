// "polly" is kept for legacy compatibility but currently maps to WebSpeech or RemoteTTS in the factory
export type NarrationProviderType =
  | "web_speech"
  | "remote_tts"
  | "polly"
  | "gemini"
  | "blob"
  | "auto";

export type NarrationCapabilities = {
  supportsStreaming?: boolean;
  supportsWordTimings?: boolean;
  supportsVoices?: boolean;
};

export type TooltipPosition = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type WordTiming = {
  wordIndex: number;
  startMs: number;
  endMs: number;
};

export type NarrationResult = {
  audioUrl?: string;
  wordTimings?: WordTiming[];
  provider: NarrationProviderType;
  meta?: Record<string, unknown>;
};

export type NarrationProviderConfig = {
  audioUrl?: string | null;
  audioSource?: Blob | string | null;
};

export type NarrationPrepareInput = {
  contentId: string;
  rawText: string;
  tokens: { wordIndex: number; text: string; start?: number; end?: number }[];
  voice?: { name?: string; locale?: string };
  speed?: number;
};

export type NarrationEvent = "ended" | "error" | "state" | "boundary";

export interface INarrationProvider {
  type: NarrationProviderType;
  prepare(input: NarrationPrepareInput): Promise<NarrationResult>;
  play(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  setPlaybackRate(rate: number): void;
  getCurrentTimeSec(): number | null;
  seekToTime(seconds: number): void;
  on(event: NarrationEvent, cb: (payload?: unknown) => void): () => void;
  capabilities?: NarrationCapabilities;
}
