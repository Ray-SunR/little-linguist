import {
  NarrationEvent,
  NarrationPrepareInput,
  NarrationProvider,
  NarrationResult,
} from "./narration-provider";

export class WebSpeechNarrationProvider implements NarrationProvider {
  type: "web_speech" = "web_speech";
  private utterance: SpeechSynthesisUtterance | null = null;
  private listeners: Map<NarrationEvent, Set<(payload?: unknown) => void>> = new Map();
  private preparedText = "";
  private rate = 1;
  private wordStarts: { index: number; start: number }[] = [];

  async prepare(input: NarrationPrepareInput): Promise<NarrationResult> {
    this.preparedText = input.rawText;
    this.rate = input.speed ?? 1;
    this.wordStarts = computeWordStarts(input.rawText);
    return {
      provider: this.type,
      meta: { fallbackWpm: 150 },
    };
  }

  async play(): Promise<void> {
    if (!this.preparedText) return;
    if (typeof window === "undefined") return;

    // Resume if paused
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      this.emit("state", "PLAYING");
      return;
    }

    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }

    this.utterance = new SpeechSynthesisUtterance(this.preparedText);
    this.utterance.rate = this.rate;
    this.utterance.onend = () => this.emit("ended");
    this.utterance.onerror = (event) => this.emit("error", event);
    this.utterance.onboundary = (event) => {
      const charIndex = event.charIndex ?? 0;
      const wordIndex = findWordIndexByChar(this.wordStarts, charIndex);
      if (wordIndex !== null) this.emit("boundary", wordIndex);
    };
    window.speechSynthesis.speak(this.utterance);
    this.emit("state", "PLAYING");
  }

  async pause(): Promise<void> {
    if (typeof window === "undefined") return;
    window.speechSynthesis.pause();
    this.emit("state", "PAUSED");
  }

  async stop(): Promise<void> {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    this.emit("state", "STOPPED");
  }

  setPlaybackRate(rate: number): void {
    if (!Number.isFinite(rate) || rate <= 0) return;
    this.rate = rate;
  }

  getCurrentTimeSec(): number | null {
    return null;
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

function computeWordStarts(raw: string) {
  const starts: { index: number; start: number }[] = [];
  const regex = /\S+/g;
  let match: RegExpExecArray | null;
  let idx = 0;
  while ((match = regex.exec(raw)) !== null) {
    starts.push({ index: idx, start: match.index });
    idx += 1;
  }
  return starts;
}

function findWordIndexByChar(starts: { index: number; start: number }[], charIndex: number) {
  if (!starts.length) return null;
  let low = 0;
  let high = starts.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const midStart = starts[mid].start;
    const nextStart = starts[mid + 1]?.start ?? Number.POSITIVE_INFINITY;
    if (charIndex < midStart) {
      high = mid - 1;
    } else if (charIndex >= nextStart) {
      low = mid + 1;
    } else {
      return starts[mid].index;
    }
  }
  return starts[starts.length - 1]?.index ?? null;
}
