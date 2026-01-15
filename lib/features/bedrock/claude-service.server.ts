import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { StoryPage } from "../nova/nova-service.server";

export class ClaudeStoryService {
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

    async generateStory(prompt: string): Promise<StoryPage[]> {
        const body = {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 4000,
            temperature: 0.7,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: prompt
                        }
                    ]
                }
            ]
        };

        const command = new InvokeModelCommand({
            modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify(body),
        });

        const response = await this.client.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));

        // Claude 3 Messages API response format
        const content = responseBody.content[0].text;

        // Find JSON in the response
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.error("Failed to parse story JSON from Claude response. Raw content:", content);
            throw new Error("Failed to parse story JSON from Claude response");
        }

        return JSON.parse(jsonMatch[0]);
    }

    async generateCoverPrompt(storyText: string): Promise<string> {
        const prompt = `Based on the following children's story, generate a highly descriptive image prompt for a book cover illustration. 
        Focus on the main characters and the central theme. Ensure the prompt is vivid and captures the essence of the book.
        
        Story Text:
        ${storyText}
        
        IMPORTANT: Your output MUST be under 800 characters. Output ONLY the image prompt text. Do not include style keywords as they will be added later.`;

        const body = {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 1000,
            temperature: 0.7,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: prompt
                        }
                    ]
                }
            ]
        };

        const command = new InvokeModelCommand({
            modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify(body),
        });

        const response = await this.client.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        return responseBody.content[0].text.trim();
    }

    async generateBookTitle(storyText: string): Promise<string> {
        const prompt = `You are a professional children's book editor. Based on the story text below, generate a catchy, concise, and engaging title.
        
        Story Text:
        ${storyText}

        Constraints:
        - Maximum 5 words.
        - Fun and appealing to kids (4-8 years).
        - No grade levels or "[TBD]" tags.
        - Return ONLY the title text. No quotes.`;

        const body = {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 100,
            temperature: 0.7,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: prompt
                        }
                    ]
                }
            ]
        };

        const command = new InvokeModelCommand({
            modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify(body),
        });

        const response = await this.client.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        return responseBody.content[0].text.trim().replace(/^"|"$/g, '');
    }
    async generateMagicSentence(words: string[], age: number): Promise<{ sentence: string; imagePrompt: string }> {
        const prompt = `You are a whimsical and creative children's storyteller. 
        Create a SINGLE, fun, and age-appropriate sentence for a ${age}-year-old child using ALL of the following words: ${words.join(', ')}.
        
        Requirements:
        1. Exactly ONE sentence.
        2. Format should be simple and engaging for a ${age}-year-old.
        3. Keep the tone whimsical and positive.
        4. After the sentence, provide a descriptive image prompt for an illustration of that sentence.
        
        Expected JSON output format:
        {
            "sentence": "The magical sentence here.",
            "imagePrompt": "A vivid description of the scene for an AI image generator."
        }`;

        const body = {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 1000,
            temperature: 0.7,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: prompt
                        }
                    ]
                }
            ]
        };

        const command = new InvokeModelCommand({
            modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify(body),
        });

        const response = await this.client.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        const content = responseBody.content[0].text.trim();
        
        // Find JSON in the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error("Failed to parse Magic Sentence JSON from Claude response. Raw content:", content);
            throw new Error("Failed to parse Magic Sentence JSON from Claude response");
        }

        return JSON.parse(jsonMatch[0]);
    }
}
