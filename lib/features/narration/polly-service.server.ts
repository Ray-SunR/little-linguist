import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";
import type { INarrationService, NarrationResponse } from "./server-types";

export class PollyNarrationService implements INarrationService {
    private client: PollyClient;
    private voiceId: string;

    constructor() {
        this.client = new PollyClient({
            region: process.env.POLLY_REGION || "us-west-2",
            credentials: {
                accessKeyId: process.env.POLLY_ACCESS_KEY_ID!,
                secretAccessKey: process.env.POLLY_SECRET_ACCESS_KEY!,
            },
        });
        this.voiceId = process.env.POLLY_VOICE_ID || "Kevin";
    }

    async synthesize(
        text: string,
        options: {
            textType?: "text" | "ssml",
            voiceId?: string,
            engine?: "neural" | "generative" | "standard"
        } = {}
    ): Promise<NarrationResponse> {
        const textType = options.textType || "text";
        const voiceId = options.voiceId || this.voiceId;
        const engine = options.engine || "neural";

        const audioParams = {
            OutputFormat: "mp3" as const,
            Text: text,
            VoiceId: voiceId as any,
            Engine: engine as any,
            TextType: textType,
            SampleRate: "22050",
        };

        const audioResp = await this.client.send(new SynthesizeSpeechCommand(audioParams));
        let marksResp = null;

        if (engine !== "generative") {
            const marksParams = {
                OutputFormat: "json" as const,
                Text: text,
                VoiceId: voiceId as any,
                Engine: engine as any,
                SpeechMarkTypes: ["word"] as any[],
                TextType: textType,
                SampleRate: "22050",
            };
            marksResp = await this.client.send(new SynthesizeSpeechCommand(marksParams));
        }

        if (!audioResp.AudioStream) {
            throw new Error("Failed to generate audio stream");
        }

        const audioBuffer = await this.streamToBuffer(audioResp.AudioStream as any);
        let speechMarks: any[] = [];

        if (marksResp && marksResp.AudioStream) {
            const marksBuffer = await this.streamToBuffer(marksResp.AudioStream as any);
            const marksString = marksBuffer.toString("utf-8");

            // Polly JSON marks are newline-delimited JSON objects
            speechMarks = marksString
                .split("\n")
                .filter(line => line.trim())
                .map(line => JSON.parse(line));
        }

        return {
            audioBuffer,
            speechMarks,
        };
    }

    private async streamToBuffer(stream: any): Promise<Buffer> {
        const chunks: any[] = [];
        if (stream.on) {
            return new Promise((resolve, reject) => {
                stream.on("data", (chunk: any) => chunks.push(chunk));
                stream.on("error", (err: any) => reject(err));
                stream.on("end", () => resolve(Buffer.concat(chunks)));
            });
        } else {
            for await (const chunk of stream) {
                chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
            }
            return Buffer.concat(chunks);
        }
    }
}
