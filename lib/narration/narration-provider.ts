export type NarrationProviderType = "web_speech" | "remote_tts";

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

export type NarrationPrepareInput = {
  contentId: string;
  rawText: string;
  tokens: { wordIndex: number; text: string }[];
  voice?: { name?: string; locale?: string };
  speed?: number;
};

export type NarrationEvent = "ended" | "error" | "state" | "boundary";

export interface NarrationProvider {
  type: string;
  prepare(input: NarrationPrepareInput): Promise<NarrationResult>;
  play(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  setPlaybackRate(rate: number): void;
  getCurrentTimeSec(): number | null;
  seekToTime(seconds: number): void;
  on(event: NarrationEvent, cb: (payload?: unknown) => void): () => void;
}
