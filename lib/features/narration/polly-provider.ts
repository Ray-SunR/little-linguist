import { INarrationProvider, NarrationPrepareInput, NarrationResult, NarrationEvent, WordTiming } from "./types";
import { splitIntoChunks, CHUNKER_PRESETS, type TextChunk } from "./text-chunker";
import { pollyCache } from "./polly-cache";

export class PollyNarrationProvider implements INarrationProvider {
  type: "polly" = "polly";
  private audio: HTMLAudioElement | null = null;
  private listeners: Map<NarrationEvent, Set<(payload?: unknown) => void>> = new Map();
  private wordTimings: WordTiming[] | undefined;
  private durationMs: number | null = null;
  private playbackRate = 1;
  private chunks: TextChunk[] = [];

  constructor(speed = 1) {
    this.playbackRate = speed;
  }

  async prepare(input: NarrationPrepareInput): Promise<NarrationResult> {
    const normalizedText = normalizeText(input.rawText);

    // Clean up previous audio if it exists to prevent "ghost" errors/events
    if (this.audio) {
      this.audio.pause();
      this.audio.onended = null;
      this.audio.onerror = null;
      this.audio.src = "";
      this.audio.load();
      this.audio = null;
    }

    // Split text into chunks for Polly's 3,000 character limit
    this.chunks = splitIntoChunks(normalizedText, CHUNKER_PRESETS.POLLY);

    if (process.env.NODE_ENV !== "production" && this.chunks.length > 1) {
      console.log(`[Polly Proxy]Chunking: ${normalizedText.length} chars → ${this.chunks.length} chunks`);
    }

    // Process each chunk and collect audio buffers
    const audioBuffers: ArrayBuffer[] = [];
    let totalDurationMs = 0;
    const allWordTimings: WordTiming[] = [];

    for (let i = 0; i < this.chunks.length; i++) {
      const chunk = this.chunks[i];

      // Check cache first
      let data = await pollyCache.get(chunk.text);

      if (!data) {
        // Cache miss - fetch from API
        const response = await fetch("/api/polly", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: chunk.text }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Proxy error: ${response.statusText} `);
        }

        const result = await response.json();
        const newData = {
          audioContent: result.audioContent as string,
          speechMarks: result.speechMarks as string,
        };

        // Save to cache
        await pollyCache.set(chunk.text, newData);

        data = {
          ...newData,
          timestamp: Date.now(),
        };
      } else if (process.env.NODE_ENV !== "production") {
        console.log(`[Polly Cache] HIT for chunk ${i + 1}/${this.chunks.length}`);
      }

      const { audioContent, speechMarks } = data;

      // Convert base64 audio to ArrayBuffer
      const binaryString = window.atob(audioContent);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let j = 0; j < len; j++) {
        bytes[j] = binaryString.charCodeAt(j);
      }
      const audioBuffer = bytes.buffer;

      const rawMarks = parseSpeechMarks(speechMarks || "");

      audioBuffers.push(audioBuffer);

      // Create temporary audio to get duration
      const tempUrl = URL.createObjectURL(new Blob([audioBuffer], { type: "audio/mpeg" }));
      const tempAudio = new Audio(tempUrl);

      await new Promise<void>((resolve) => {
        tempAudio.addEventListener("loadedmetadata", () => resolve(), { once: true });
        tempAudio.addEventListener("error", () => resolve(), { once: true });
      });

      const chunkDurationMs = Math.floor(tempAudio.duration * 1000);
      URL.revokeObjectURL(tempUrl);

      // Adjust word timings for this chunk to global indices
      const adjustedTimings = rawMarks.map((mark, idx) => ({
        wordIndex: chunk.startWordIndex + idx,
        startMs: totalDurationMs + mark.startMs,
        endMs: totalDurationMs + (rawMarks[idx + 1]?.startMs ?? chunkDurationMs),
      }));

      allWordTimings.push(...adjustedTimings);
      totalDurationMs += chunkDurationMs;
    }

    // Concatenate all audio chunks into a single blob
    const concatenatedBlob = new Blob(audioBuffers, { type: "audio/mpeg" });
    const audioUrl = URL.createObjectURL(concatenatedBlob);

    // Create single audio element
    this.audio = new Audio(audioUrl);
    this.audio.playbackRate = this.playbackRate;

    // Setup event handlers
    this.audio.onended = () => {
      this.emit("ended");
    };

    this.audio.onerror = (event) => {
      console.error("[Polly] Audio playback error:", event);
      this.emit("error", event);
    };

    this.wordTimings = alignTimingsToTokens(allWordTimings, input.tokens, totalDurationMs);
    this.durationMs = totalDurationMs;

    if (process.env.NODE_ENV !== "production" && this.chunks.length > 1) {
      console.log(`[Polly] Concatenated ${this.chunks.length} chunks → ${(totalDurationMs / 1000).toFixed(1)}s audio, ${allWordTimings.length} words`);
    }

    return {
      provider: this.type,
      audioUrl,
      wordTimings: this.wordTimings,
      meta: { durationMs: totalDurationMs },
    };
  }

  async play(): Promise<void> {
    if (!this.audio) return;
    await this.audio.play();
    this.emit("state", "PLAYING");
  }

  async pause(): Promise<void> {
    if (!this.audio) return;
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
    return this.audio.currentTime;
  }

  seekToTime(seconds: number): void {
    if (!this.audio) return;
    if (!Number.isFinite(seconds) || seconds < 0) return;
    this.audio.currentTime = seconds;
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


type RawMark = { word: string; startMs: number };

function parseSpeechMarks(jsonl: string): RawMark[] {
  const marks: RawMark[] = [];
  const lines = jsonl.split("\n").filter(Boolean);
  lines.forEach((line) => {
    try {
      const data = JSON.parse(line);
      if (data.type === "word" && typeof data.time === "number" && typeof data.value === "string") {
        marks.push({
          word: data.value,
          startMs: data.time,
        });
      }
    } catch {
      // ignore malformed lines
    }
  });
  return marks;
}

function alignTimingsToTokens(
  wordTimings: WordTiming[],
  tokens: { wordIndex: number; text: string }[],
  durationMs: number | null
): WordTiming[] {
  // Word timings from chunks are already adjusted to global indices
  // Just ensure they align with token indices
  const maxIdx = tokens.length - 1;

  return wordTimings.map(timing => ({
    wordIndex: Math.min(Math.max(timing.wordIndex, 0), maxIdx),
    startMs: timing.startMs,
    endMs: timing.endMs,
  }));
}

function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}
