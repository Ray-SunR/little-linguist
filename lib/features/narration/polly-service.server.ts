import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";

export interface PollyResponse {
    audioBuffer: Buffer;
    speechMarks: any[];
}

export class PollyNarrationService {
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
        this.voiceId = process.env.POLLY_VOICE_ID || "Joanna";
    }

    async synthesize(text: string): Promise<PollyResponse> {
        const audioParams = {
            OutputFormat: "mp3" as const,
            Text: text,
            VoiceId: this.voiceId as any,
            Engine: "neural" as const,
            TextType: "text" as const,
            SampleRate: "22050",
        };

        const marksParams = {
            OutputFormat: "json" as const,
            Text: text,
            VoiceId: this.voiceId as any,
            Engine: "neural" as const,
            SpeechMarkTypes: ["word"] as any[],
            TextType: "text" as const,
            SampleRate: "22050",
        };

        const [audioResp, marksResp] = await Promise.all([
            this.client.send(new SynthesizeSpeechCommand(audioParams)),
            this.client.send(new SynthesizeSpeechCommand(marksParams)),
        ]);

        if (!audioResp.AudioStream || !marksResp.AudioStream) {
            throw new Error("Failed to generate audio or marks stream");
        }

        const audioBuffer = await this.streamToBuffer(audioResp.AudioStream as any);
        const marksBuffer = await this.streamToBuffer(marksResp.AudioStream as any);
        const marksString = marksBuffer.toString("utf-8");

        // Polly JSON marks are newline-delimited JSON objects
        const speechMarks = marksString
            .split("\n")
            .filter(line => line.trim())
            .map(line => JSON.parse(line));

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
