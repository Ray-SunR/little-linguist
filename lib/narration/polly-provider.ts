import {
  PollyClient,
  SynthesizeSpeechCommand,
  type SynthesizeSpeechCommandInput,
} from "@aws-sdk/client-polly";
import { NarrationEvent, NarrationPrepareInput, NarrationProvider, NarrationResult, WordTiming } from "./narration-provider";
import { splitIntoChunks, CHUNKER_PRESETS, type TextChunk } from "./text-chunker";

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
  private chunks: TextChunk[] = [];

  constructor(creds: PollyCredentials, speed = 1) {
    this.creds = creds;
    this.playbackRate = speed;
  }

  async prepare(input: NarrationPrepareInput): Promise<NarrationResult> {
    const normalizedText = normalizeText(input.rawText);
    
    // Split text into chunks for Polly's 3,000 character limit
    this.chunks = splitIntoChunks(normalizedText, CHUNKER_PRESETS.POLLY);
    
    if (process.env.NODE_ENV !== "production" && this.chunks.length > 1) {
      console.log(`[Polly] Chunking: ${normalizedText.length} chars → ${this.chunks.length} chunks`);
    }

    const client = new PollyClient({
      region: this.creds.region,
      credentials: {
        accessKeyId: this.creds.accessKeyId,
        secretAccessKey: this.creds.secretAccessKey,
      },
    });

    // Process each chunk and collect audio buffers
    const audioBuffers: ArrayBuffer[] = [];
    let totalDurationMs = 0;
    const allWordTimings: WordTiming[] = [];

    for (let i = 0; i < this.chunks.length; i++) {
      const chunk = this.chunks[i];
      
      // Polly requires separate calls for audio and speech marks
      const audioParams: SynthesizeSpeechCommandInput = {
        OutputFormat: "mp3",
        Text: chunk.text,
        VoiceId: this.creds.voiceId as any,
        Engine: "neural",
        TextType: "text",
        SpeechMarkTypes: undefined,
        SampleRate: "22050",
      };

      const marksParams: SynthesizeSpeechCommandInput = {
        OutputFormat: "json",
        Text: chunk.text,
        VoiceId: this.creds.voiceId as any,
        Engine: "neural",
        SpeechMarkTypes: ["word"],
        TextType: "text",
        SampleRate: "22050",
      };

      const [audioResp, marksResp] = await Promise.all([
        client.send(new SynthesizeSpeechCommand(audioParams)),
        client.send(new SynthesizeSpeechCommand(marksParams)),
      ]);

      const audioBuffer = await streamToArrayBuffer(audioResp.AudioStream);
      const rawMarks = parseSpeechMarks(await streamToString(marksResp.AudioStream));

      if (!audioBuffer) {
        throw new Error(`No audio from Polly for chunk ${i}`);
      }

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
      console.log(`[Polly] Concatenated ${this.chunks.length} chunks → ${(totalDurationMs/1000).toFixed(1)}s audio, ${allWordTimings.length} words`);
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

async function streamToArrayBuffer(stream?: any): Promise<ArrayBuffer | null> {
  const bytes = await toBytes(stream);
  if (!bytes) return null;
  // Ensure we return an ArrayBuffer (not SharedArrayBuffer)
  if (bytes.buffer instanceof ArrayBuffer) {
    return bytes.buffer;
  }
  // If it's a SharedArrayBuffer or something else, copy to regular ArrayBuffer
  return bytes.slice().buffer;
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
