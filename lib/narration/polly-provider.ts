import {
  PollyClient,
  SynthesizeSpeechCommand,
  type SynthesizeSpeechCommandInput,
} from "@aws-sdk/client-polly";
import { NarrationEvent, NarrationPrepareInput, NarrationProvider, NarrationResult, WordTiming } from "./narration-provider";

type PollyCredentials = {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  voiceId: string;
};

export class PollyNarrationProvider implements NarrationProvider {
  type: "remote_tts" = "remote_tts";
  private audio: HTMLAudioElement | null = null;
  private listeners: Map<NarrationEvent, Set<(payload?: unknown) => void>> = new Map();
  private wordTimings: WordTiming[] | undefined;
  private durationMs: number | null = null;
  private creds: PollyCredentials;
  private playbackRate = 1;

  constructor(creds: PollyCredentials, speed = 1) {
    this.creds = creds;
    this.playbackRate = speed;
  }

  async prepare(input: NarrationPrepareInput): Promise<NarrationResult> {
    const normalizedText = normalizeText(input.rawText);

    const client = new PollyClient({
      region: this.creds.region,
      credentials: {
        accessKeyId: this.creds.accessKeyId,
        secretAccessKey: this.creds.secretAccessKey,
      },
    });

    // Polly requires separate calls for audio and speech marks
    const audioParams: SynthesizeSpeechCommandInput = {
      OutputFormat: "mp3",
      Text: normalizedText,
      VoiceId: this.creds.voiceId,
      Engine: "neural",
      TextType: "text",
      SpeechMarkTypes: undefined,
      SampleRate: "22050",
    };

    const marksParams: SynthesizeSpeechCommandInput = {
      OutputFormat: "json",
      Text: normalizedText,
      VoiceId: this.creds.voiceId,
      Engine: "neural",
      SpeechMarkTypes: ["word"],
      TextType: "text",
      SampleRate: "22050",
    };

    const [audioResp, marksResp] = await Promise.all([
      client.send(new SynthesizeSpeechCommand(audioParams)),
      client.send(new SynthesizeSpeechCommand(marksParams)),
    ]);

    const audioUrl = await streamToObjectUrl(audioResp.AudioStream);
    const rawMarks = parseSpeechMarks(await streamToString(marksResp.AudioStream));
    // Debug: log first few marks in dev
    if (process.env.NODE_ENV !== "production") {
      const markPreview = rawMarks.slice(0, 10).map((m, i) => ({
        i,
        word: m.word,
        startMs: m.startMs,
      }));
      const markTail = rawMarks.slice(-3).map((m, i) => ({
        i: rawMarks.length - 3 + i,
        word: m.word,
        startMs: m.startMs,
      }));
      console.log("Polly raw marks (first 10):", JSON.stringify(markPreview));
      console.log("Polly raw marks (last 3):", JSON.stringify(markTail));
    }

    this.audio = audioUrl ? new Audio(audioUrl) : null;
    if (!this.audio) {
      throw new Error("No audio from Polly");
    }
    this.audio.playbackRate = this.playbackRate;
    this.audio.onended = () => this.emit("ended");
    this.audio.onerror = (event) => this.emit("error", event);

    if (this.audio) {
      await this.loadMetadata();
    }

    this.wordTimings = alignTimingsToTokens(rawMarks, input.tokens, this.durationMs);

    return {
      provider: this.type,
      audioUrl,
      wordTimings: this.wordTimings,
      meta: this.durationMs ? { durationMs: this.durationMs } : undefined,
    };
  }

  async play(): Promise<void> {
    if (!this.audio) return;
    if (!this.audio.paused && !this.audio.ended) return;
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

  private emit(event: NarrationEvent, payload?: unknown) {
    const listeners = this.listeners.get(event);
    if (!listeners) return;
    for (const cb of listeners) {
      cb(payload);
    }
  }

  private async loadMetadata(): Promise<void> {
    if (!this.audio) return;
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

async function streamToObjectUrl(stream?: any): Promise<string> {
  const bytes = await toBytes(stream);
  if (!bytes) return "";
  const blob = new Blob([bytes], { type: "audio/mpeg" });
  return URL.createObjectURL(blob);
}

async function streamToString(stream?: any): Promise<string> {
  const bytes = await toBytes(stream);
  if (!bytes) return "";
  return new TextDecoder().decode(bytes);
}

async function toBytes(stream?: any): Promise<Uint8Array | null> {
  if (!stream) return null;
  if (typeof stream === "string") return new TextEncoder().encode(stream);
  if (stream instanceof Uint8Array) return stream;
  if (stream instanceof ArrayBuffer) return new Uint8Array(stream);
  if (typeof Blob !== "undefined" && stream instanceof Blob) {
    return new Uint8Array(await stream.arrayBuffer());
  }
  if (typeof stream === "object" && typeof stream.getReader === "function") {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) chunks.push(value instanceof Uint8Array ? value : new Uint8Array(value));
    }
    const total = chunks.reduce((sum, c) => sum + c.byteLength, 0);
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.byteLength;
    }
    return merged;
  }
  if (typeof stream.transformToByteArray === "function") {
    return await stream.transformToByteArray();
  }
  return null;
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
  rawMarks: RawMark[],
  tokens: { wordIndex: number; text: string }[],
  durationMs: number | null
) {
  if (!rawMarks.length || !tokens.length) return [];
  // Order by start time and map 1:1 in order (no skipping ahead)
  const marks = [...rawMarks].sort((a, b) => a.startMs - b.startMs);
  const aligned: WordTiming[] = [];
  const maxIdx = tokens.length - 1;
  const count = Math.min(marks.length, tokens.length);

  for (let i = 0; i < count; i++) {
    const token = tokens[i];
    const mark = marks[i];
    aligned.push({
      wordIndex: Math.min(Math.max(token.wordIndex, 0), maxIdx),
      startMs: mark.startMs,
      endMs: mark.startMs + 200,
    });
  }

  for (let i = 0; i < aligned.length; i++) {
    const nextStart = aligned[i + 1]?.startMs;
    if (nextStart !== undefined) {
      aligned[i].endMs = nextStart - 1;
    } else if (durationMs && durationMs > aligned[i].startMs) {
      aligned[i].endMs = durationMs;
    }
    aligned[i].wordIndex = Math.min(Math.max(aligned[i].wordIndex, 0), maxIdx);
  }

  return aligned;
}

function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}
