export interface NarrationResponse {
    audioBuffer: Buffer;
    speechMarks: any[];
}

export interface INarrationService {
    synthesize(
        text: string,
        options?: {
            textType?: "text" | "ssml",
            voiceId?: string,
            engine?: "neural" | "generative" | "standard"
        }
    ): Promise<NarrationResponse>;
}
