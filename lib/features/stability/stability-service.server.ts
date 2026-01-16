import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

export class StabilityStoryService {
    private client: BedrockRuntimeClient;
    private region: string;
    private static readonly ART_STYLE_SUFFIX = "Professional digital children's book illustration, vibrant colors, clear focus, whimsical charm, highly detailed, masterpieces, storybook style.";

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

    async generateImage(prompt: string, seed?: number): Promise<string> {
        // SDXL is available in us-west-2/us-east-1
        const body = {
            prompt: `${prompt}. ${StabilityStoryService.ART_STYLE_SUFFIX}`,
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

        try {
            const response = await this.client.send(command);
            const responseBody = JSON.parse(new TextDecoder().decode(response.body));

            if (responseBody.images && responseBody.images.length > 0) {
                return responseBody.images[0];
            }

            console.error("Stable Diffusion failed to generate image. Response:", JSON.stringify(responseBody));
            throw new Error("Stable Diffusion failed to generate image");
        } catch (err: any) {
            if (err.$metadata?.httpStatusCode === 400) {
                 console.error("Stability 400 Error details:", err.message);
            }
            throw err;
        }
    }
}
