import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

export interface StoryPage {
    text: string;
    imagePrompt: string;
    imageUrl?: string;
    imageBase64?: string;
}

export class NovaStoryService {
    private client: BedrockRuntimeClient;
    private region: string;
    private static readonly ART_STYLE_SUFFIX = "Professional high-quality digital children's book illustration, vibrant watercolor and ink style, whimsical and charming, expressive characters, soft lighting, clean lines, high resolution.";

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

    async generateStory(theme: string): Promise<StoryPage[]> {
        const prompt = `Write a 3-page children's story book about ${theme}. 
        For each page provide:
        1. The story text (max 2 sentences).
        2. A descriptive image prompt for a children's book illustration style.
        
        Format the output as a JSON array of objects with "text" and "imagePrompt" keys.`;

        const command = new InvokeModelCommand({
            modelId: "us.amazon.nova-lite-v1:0",
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify({
                messages: [
                    {
                        role: "user",
                        content: [{ text: prompt }]
                    }
                ],
                inferenceConfig: {
                    maxTokens: 1000,
                    temperature: 0.7,
                }
            }),
        });

        const response = await this.client.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        const content = responseBody.output.message.content[0].text;

        // Find JSON in the response (sometimes models add markdown wrappers)
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            throw new Error("Failed to parse story JSON from Nova response");
        }

        return JSON.parse(jsonMatch[0]);
    }

    async generateImage(prompt: string, seed?: number, styleOverride?: string, negativePrompt?: string): Promise<string> {
        // Nova Canvas is primarily available in us-east-1
        const imageClient = new BedrockRuntimeClient({
            region: "us-east-1",
            credentials: {
                accessKeyId: process.env.POLLY_ACCESS_KEY_ID!,
                secretAccessKey: process.env.POLLY_SECRET_ACCESS_KEY!,
            },
        });

        const effectiveStyle = styleOverride || NovaStoryService.ART_STYLE_SUFFIX;

        const body: any = {
            taskType: "TEXT_IMAGE",
            textToImageParams: {
                text: `${prompt}. Style: ${effectiveStyle}`.slice(0, 1000)
            },
            imageGenerationConfig: {
                numberOfImages: 1,
                quality: "standard",
                height: 1024,
                width: 1024,
                cfgScale: 8.0,
            }
        };

        if (negativePrompt) {
            body.textToImageParams.negativeText = negativePrompt.slice(0, 1000);
        }

        if (seed !== undefined) {
            body.imageGenerationConfig.seed = seed;
        }

        const command = new InvokeModelCommand({
            modelId: "amazon.nova-canvas-v1:0",
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify(body),
        });

        const response = await imageClient.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));

        if (!responseBody.images || responseBody.images.length === 0) {
            console.error("Nova Canvas returned no images. Response:", JSON.stringify(responseBody));
            throw new Error("Nova Canvas returned no images");
        }

        // Nova Canvas returns images as base64 in an array
        return responseBody.images[0];
    }

    async generateCoverPrompt(storyText: string): Promise<string> {
        const prompt = `Based on the following children's story, generate a highly descriptive image prompt for a book cover illustration. 
        Focus on the main characters and the central theme. The style must be high-quality and consistent with: ${NovaStoryService.ART_STYLE_SUFFIX}.
        
        Story Text:
        ${storyText}
        
        IMPORTANT: Your output MUST be under 800 characters. Output only the image prompt text, avoiding specific art style keywords as they will be appended automatically.`;

        const command = new InvokeModelCommand({
            modelId: "us.amazon.nova-lite-v1:0",
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify({
                messages: [
                    {
                        role: "user",
                        content: [{ text: prompt }]
                    }
                ],
                inferenceConfig: {
                    maxTokens: 500,
                    temperature: 0.7,
                }
            }),
        });

        const response = await this.client.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        return responseBody.output.message.content[0].text;
    }
}
