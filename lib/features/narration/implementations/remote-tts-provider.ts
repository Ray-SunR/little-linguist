import {
  INarrationProvider,
  NarrationPrepareInput,
  NarrationResult,
  NarrationEvent,
  WordTiming,
} from "../types";

export class RemoteTtsNarrationProvider implements INarrationProvider {
  type: "remote_tts" = "remote_tts";
  capabilities = {
    supportsStreaming: false,
    supportsWordTimings: true,
    supportsVoices: false,
  };
  private audio: HTMLAudioElement | null = null;
  private listeners: Map<NarrationEvent, Set<(payload?: unknown) => void>> = new Map();
  private audioUrl: string | null;
  private wordTimings: WordTiming[] | undefined;
  private durationMs: number | null = null;
  private playbackRate = 1;

  constructor(audioUrl?: string | null) {
    this.audioUrl = audioUrl ?? null;
  }

  async prepare(input: NarrationPrepareInput): Promise<NarrationResult> {
    if (this.audioUrl) {
      this.audio = new Audio(this.audioUrl);
      this.audio.playbackRate = this.playbackRate;
      this.audio.onended = () => this.emit("ended");
      this.audio.onerror = (event) => this.emit("error", event);
      await this.loadMetadata();
    }

    return {
      provider: this.type,
      audioUrl: this.audioUrl ?? undefined,
      wordTimings: this.wordTimings,
      meta: this.durationMs ? { durationMs: this.durationMs } : undefined,
    };
  }

  async play(): Promise<void> {
    if (!this.audio) return;
    if (!this.audio.paused) return;
    await this.audio.play();
    this.emit("state", "PLAYING");
  }

  async pause(): Promise<void> {
    if (!this.audio) return;
    if (this.audio.paused) return;
    this.audio.pause();
    this.emit("state", "PAUSED");
  }

  async stop(): Promise<void> {
    if (!this.audio) return;
    this.audio.pause();
    this.audio.currentTime = 0;
    this.emit("state", "STOPPED");
  }

  setPlaybackRate(rate: number): void {
    if (!Number.isFinite(rate) || rate <= 0) return;
    this.playbackRate = rate;
    if (this.audio) {
      this.audio.playbackRate = rate;
    }
  }

  getCurrentTimeSec(): number | null {
    if (!this.audio) return null;
    const rate = this.playbackRate || 1;
    return this.audio.currentTime / rate;
  }

  seekToTime(seconds: number): void {
    if (!this.audio) return;
    if (!Number.isFinite(seconds) || seconds < 0) return;
    // Adjust for playback rate
    const rate = this.playbackRate || 1;
    this.audio.currentTime = seconds * rate;
  }

  on(event: NarrationEvent, cb: (payload?: unknown) => void): () => void {
    const existing = this.listeners.get(event) ?? new Set();
    existing.add(cb);
    this.listeners.set(event, existing);
    return () => {
      const listeners = this.listeners.get(event);
      if (!listeners) return;
      listeners.delete(cb);
    };
  }

  setWordTimings(wordTimings?: WordTiming[]) {
    this.wordTimings = wordTimings;
  }

  private emit(event: NarrationEvent, payload?: unknown) {
    const listeners = this.listeners.get(event);
    if (!listeners) return;
    for (const cb of listeners) {
      cb(payload);
    }
  }

  private loadMetadata(): Promise<void> {
    if (!this.audio) return Promise.resolve();
    return new Promise((resolve) => {
      this.audio?.addEventListener(
        "loadedmetadata",
        () => {
          if (this.audio && Number.isFinite(this.audio.duration)) {
            this.durationMs = Math.floor(this.audio.duration * 1000);
          }
          resolve();
        },
        { once: true }
      );
      this.audio?.addEventListener("error", () => resolve(), { once: true });
    });
  }
}
