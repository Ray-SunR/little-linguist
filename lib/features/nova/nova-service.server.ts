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

    async generateImage(prompt: string): Promise<string> {
        // Nova Canvas is primarily available in us-east-1
        const imageClient = new BedrockRuntimeClient({
            region: "us-east-1",
            credentials: {
                accessKeyId: process.env.POLLY_ACCESS_KEY_ID!,
                secretAccessKey: process.env.POLLY_SECRET_ACCESS_KEY!,
            },
        });

        const command = new InvokeModelCommand({
            modelId: "amazon.nova-canvas-v1:0",
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify({
                taskType: "TEXT_IMAGE",
                textToImageParams: {
                    text: prompt
                },
                imageGenerationConfig: {
                    numberOfImages: 1,
                    quality: "standard",
                    height: 512,
                    width: 512,
                    cfgScale: 8.0,
                }
            }),
        });

        const response = await imageClient.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));

        // Nova Canvas returns images as base64 in an array
        return responseBody.images[0];
    }
}
