import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const accessKeyId = process.env.POLLY_ACCESS_KEY_ID;
    const secretAccessKey = process.env.POLLY_SECRET_ACCESS_KEY;
    const region = process.env.POLLY_REGION || "us-west-2";
    const voiceId = process.env.POLLY_VOICE_ID || "Joanna";

    if (!accessKeyId || !secretAccessKey) {
        return NextResponse.json({ error: "AWS Credentials missing on server" }, { status: 500 });
    }

    try {
        const { text } = await req.json();

        if (!text) {
            return NextResponse.json({ error: "Text is required" }, { status: 400 });
        }

        const client = new PollyClient({
            region,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });

        // We need both audio and speech marks to support word highlighting
        const audioParams = {
            OutputFormat: "mp3" as const,
            Text: text,
            VoiceId: voiceId as any,
            Engine: "neural" as const,
            TextType: "text" as const,
            SampleRate: "22050",
        };

        const marksParams = {
            OutputFormat: "json" as const,
            Text: text,
            VoiceId: voiceId as any,
            Engine: "neural" as const,
            SpeechMarkTypes: ["word"] as any[],
            TextType: "text" as const,
            SampleRate: "22050",
        };

        const [audioResp, marksResp] = await Promise.all([
            client.send(new SynthesizeSpeechCommand(audioParams)),
            client.send(new SynthesizeSpeechCommand(marksParams)),
        ]);

        if (!audioResp.AudioStream || !marksResp.AudioStream) {
            throw new Error("Failed to generate audio or marks stream");
        }

        // Node.js streams don't have .transformToByteArray() or .transformToString()
        // We must collect the chunks manually or use a helper
        const audioBuffer = await streamToBuffer(audioResp.AudioStream as any);
        const marksBuffer = await streamToBuffer(marksResp.AudioStream as any);
        const marksString = marksBuffer.toString("utf-8");

        if (!audioBuffer || audioBuffer.length === 0) {
            throw new Error("Empty audio stream received from Polly");
        }

        return NextResponse.json({
            audioContent: audioBuffer.toString("base64"),
            speechMarks: marksString,
        });

    } catch (error: any) {
        console.error("Polly Proxy error:", error);
        return NextResponse.json({ error: error.message || "Failed to synthesize speech" }, { status: 500 });
    }
}

async function streamToBuffer(stream: any): Promise<Buffer> {
    const chunks: any[] = [];
    if (stream.on) {
        return new Promise((resolve, reject) => {
            stream.on("data", (chunk: any) => chunks.push(chunk));
            stream.on("error", (err: any) => reject(err));
            stream.on("end", () => resolve(Buffer.concat(chunks)));
        });
    } else {
        // For web-streams style if applicable in some environments
        for await (const chunk of stream) {
            chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
        }
        return Buffer.concat(chunks);
    }
}
