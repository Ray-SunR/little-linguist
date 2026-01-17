import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

export class StabilityStoryService {
    private client: BedrockRuntimeClient;
    private region: string;
    private static readonly ART_STYLE_GUIDE = "A consistent professional children's book illustration in vibrant digital watercolor style, clean vector lines, whimsical charm, highly detailed character features, uniform soft lighting.";
    private static readonly NEGATIVE_PROMPT = "photorealistic, 3d render, grainy, blurry, deformed anatomy, mismatched eyes, extra limbs, text, watermark, low resolution, messy lines, realistic photography, dark moody lighting.";

    constructor() {
        this.region = process.env.POLLY_REGION || "us-west-2";
        this.client = new BedrockRuntimeClient({
            region: this.region,
            credentials: {
                accessKeyId: process.env.POLLY_ACCESS_KEY_ID!,
                secretAccessKey: process.env.POLLY_SECRET_ACCESS_KEY!,
            },
        });
    }

    async generateImage(prompt: string, seed?: number, styleOverride?: string): Promise<string> {
        let attempts = 0;
        const maxAttempts = 3;
        const initialDelay = 2000;

        const effectiveStyle = styleOverride || StabilityStoryService.ART_STYLE_GUIDE;

        while (attempts < maxAttempts) {
            try {
                attempts++;
                const body = {
                    prompt: `Style: ${effectiveStyle}. Subject: ${prompt}`,
                    negative_prompt: StabilityStoryService.NEGATIVE_PROMPT,
                    mode: "text-to-image",
                    aspect_ratio: "1:1",
                    output_format: "png",
                    seed: seed !== undefined ? seed % 4294967295 : Math.floor(Math.random() * 4294967295)
                };

                const command = new InvokeModelCommand({
                    modelId: "stability.sd3-5-large-v1:0",
                    contentType: "application/json",
                    accept: "application/json",
                    body: JSON.stringify(body),
                });

                const response = await this.client.send(command);
                const responseBody = JSON.parse(new TextDecoder().decode(response.body));

                if (responseBody.images && responseBody.images.length > 0) {
                    return responseBody.images[0];
                }

                if (responseBody.finish_reasons?.includes("Filter reason: prompt") || responseBody.finish_reasons?.includes("CONTENT_FILTERED")) {
                    console.error("Stability image blocked by content filter:", JSON.stringify(responseBody));
                    throw new Error("Image blocked by content filters");
                }

                console.error("Stable Diffusion failed to generate image. Response:", JSON.stringify(responseBody));
                throw new Error("Stable Diffusion failed to generate image");
            } catch (err: any) {
                const isRetryable = err.$metadata?.httpStatusCode === 429 || err.$metadata?.httpStatusCode === 500 || err.$metadata?.httpStatusCode === 503;
                
                if (isRetryable && attempts < maxAttempts) {
                    const delay = initialDelay * Math.pow(2, attempts - 1);
                    console.warn(`  ⚠️ Stability API error (${err.$metadata?.httpStatusCode}). Retrying in ${delay}ms... (Attempt ${attempts}/${maxAttempts})`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }

                if (err.$metadata?.httpStatusCode === 400) {
                    console.error("Stability 400 Error details:", err.message);
                }
                throw err;
            }
        }
        throw new Error("Failed to generate image after retries");
    }
}
