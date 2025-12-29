import {
  INarrationProvider,
  NarrationPrepareInput,
  NarrationResult,
  NarrationEvent,
} from "../types";
import { splitIntoChunks, CHUNKER_PRESETS, isAndroid, type TextChunk } from "../text-chunker";

export class WebSpeechNarrationProvider implements INarrationProvider {
  type: "web_speech" = "web_speech";
  private utterances: SpeechSynthesisUtterance[] = [];
  private listeners: Map<NarrationEvent, Set<(payload?: unknown) => void>> = new Map();
  private preparedText = "";
  private rate = 1;
  private chunks: TextChunk[] = [];
  private globalWordIndex = -1;
  private isPaused = false;
  private savedWordIndex: number | null = null;

  async prepare(input: NarrationPrepareInput): Promise<NarrationResult> {
    this.preparedText = input.rawText;
    this.rate = input.speed ?? 1;

    // Split text into chunks for reliable cross-browser playback
    this.chunks = splitIntoChunks(input.rawText, CHUNKER_PRESETS.WEB_SPEECH);

    if (process.env.NODE_ENV !== "production" && this.chunks.length > 1) {
      console.log(`[Web Speech]Chunking: ${input.rawText.length} chars → ${this.chunks.length} chunks`);
    }

    return {
      provider: this.type,
      meta: { fallbackWpm: 150 },
    };
  }

  async play(): Promise<void> {
    if (!this.preparedText || this.chunks.length === 0) return;
    if (typeof window === "undefined") return;

    // Handle resume on platforms that support true pause
    if (!isAndroid() && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      this.isPaused = false;
      this.emit("state", "PLAYING");
      return;
    }

    // Cancel any ongoing speech
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }

    // Reset word index to start from beginning
    this.globalWordIndex = -1;
    this.isPaused = false;
    this.utterances = [];

    // Create and queue utterances for each chunk
    this.chunks.forEach((chunk, chunkIndex) => {
      const utterance = new SpeechSynthesisUtterance(chunk.text);
      utterance.rate = this.rate;

      utterance.onboundary = (event) => {
        if (event.name === "word") {
          this.globalWordIndex++;
          this.emit("boundary", this.globalWordIndex);
        }
      };

      utterance.onend = () => {
        // If this was the last chunk, emit ended event
        if (chunkIndex === this.chunks.length - 1) {
          this.emit("ended");
        }
      };

      utterance.onerror = (event: any) => {
        // Ignore errors caused by intentional cancellation or interruption
        // These happen naturally when we call .cancel() to stop or change text
        if (event.error === "interrupted" || event.error === "canceled") {
          return;
        }
        console.error(`[Web Speech]Error in chunk ${chunkIndex + 1}/${this.chunks.length}:`, event);
        this.emit("error", event);
      };

      this.utterances.push(utterance);
      // Queue the utterance (browser will handle sequential playback)
      window.speechSynthesis.speak(utterance);
    });

    this.emit("state", "PLAYING");
  }

  async pause(): Promise<void> {
    if (typeof window === "undefined") return;

    if (isAndroid()) {
      // Android doesn't support true pause - save position and cancel
      this.savedWordIndex = this.globalWordIndex;
      window.speechSynthesis.cancel();
      this.isPaused = true;
    } else {
      // Standard pause
      window.speechSynthesis.pause();
      this.isPaused = true;
    }

    this.emit("state", "PAUSED");
  }

  async stop(): Promise<void> {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    this.globalWordIndex = -1;
    this.isPaused = false;
    this.savedWordIndex = null;
    this.utterances = [];
    this.emit("state", "STOPPED");
  }

  setPlaybackRate(rate: number): void {
    if (!Number.isFinite(rate) || rate <= 0) return;
    this.rate = rate;
    // Note: Rate change will apply to next chunk or next playback
    // Changing rate mid-utterance is not supported by Web Speech API
  }

  getCurrentTimeSec(): number | null {
    return null;
  }

  seekToTime(seconds: number): void {
    // Web Speech API doesn't support seeking by time directly
    // We'll handle seeking by word index instead (called from use-audio-narration)
    // This is a no-op for now, seeking is handled via seekToWordIndex
  }

  seekToWordIndex(wordIndex: number): void {
    // With chunking, seeking is simpler - just set the starting word index
    // When play() is called after this, it will start from this word
    this.globalWordIndex = wordIndex - 1;
    // Note: Full implementation would filter chunks to start from the right one
    // For now, we'll restart from beginning but with the word index set
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

  private emit(event: NarrationEvent, payload?: unknown) {
    const listeners = this.listeners.get(event);
    if (!listeners) return;
    for (const cb of listeners) {
      cb(payload);
    }
  }
}
