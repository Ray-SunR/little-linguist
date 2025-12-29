import {
    INarrationProvider,
    NarrationPrepareInput,
    NarrationEvent,
    NarrationResult,
    WordTiming,
} from "./types";

export class BlobNarrationProvider implements INarrationProvider {
    type: "remote_tts" = "remote_tts";
    private audio: HTMLAudioElement | null = null;
    private listeners: Map<NarrationEvent, Set<(payload?: unknown) => void>> = new Map();
    private blobUrl: string | null = null;
    private durationMs: number | null = null;
    private playbackRate = 1;
    private explicitTimings: WordTiming[] | undefined;

    constructor(private audioSource: Blob | string, timings?: WordTiming[]) {
        this.explicitTimings = timings;
    }

    async prepare(input: NarrationPrepareInput): Promise<NarrationResult> {
        // Clean up previous
        this.cleanup();

        if (this.audioSource instanceof Blob) {
            this.blobUrl = URL.createObjectURL(this.audioSource);
        } else {
            this.blobUrl = this.audioSource;
        }

        this.audio = new Audio(this.blobUrl);
        this.audio.playbackRate = this.playbackRate;
        this.audio.onended = () => this.emit("ended");
        this.audio.onerror = (event) => this.emit("error", event);

        await this.loadMetadata();

        return {
            provider: this.type,
            audioUrl: this.blobUrl ?? undefined,
            wordTimings: this.explicitTimings, // Return explicit timings if provided
            meta: this.durationMs ? { durationMs: this.durationMs } : undefined,
        };
    }

    async play(): Promise<void> {
        if (!this.audio) return;
        try {
            if (this.audio.paused) {
                await this.audio.play();
                this.emit("state", "PLAYING");
            }
        } catch (e) {
            console.error("Playback failed", e);
            this.emit("error", e);
        }
    }

    async pause(): Promise<void> {
        if (!this.audio) return;
        if (!this.audio.paused) {
            this.audio.pause();
            this.emit("state", "PAUSED");
        }
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

    private loadMetadata(): Promise<void> {
        if (!this.audio) return Promise.resolve();
        return new Promise((resolve) => {
            // If already loaded
            if (this.audio?.readyState && this.audio.readyState >= 1) {
                if (Number.isFinite(this.audio.duration)) {
                    this.durationMs = Math.floor(this.audio.duration * 1000);
                }
                resolve();
                return;
            }

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

    private cleanup() {
        if (this.blobUrl && this.audioSource instanceof Blob) {
            URL.revokeObjectURL(this.blobUrl);
        }
        if (this.audio) {
            this.audio.pause();
            this.audio.src = "";
            this.audio = null;
        }
        this.blobUrl = null;
    }
}
