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
            modelId: "global.anthropic.claude-sonnet-4-5-20250929-v1:0",
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify(body),
        });

        const response = await this.client.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));

        // Claude 3 Messages API response format
        const content = responseBody.content[0].text;

        // Find JSON in the response - find the first [ and last ]
        const startIdx = content.indexOf('[');
        const endIdx = content.lastIndexOf(']');

        if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
            // Try a last resort: maybe it's the whole string or has markdown backticks
            const cleanContent = content.replace(/```json|```/g, '').trim();
            try {
                return JSON.parse(cleanContent);
            } catch {
                console.error("Failed to parse story JSON from Claude response. Raw content:", content);
                throw new Error("Failed to parse story JSON from Claude response");
            }
        }

        const jsonString = content.substring(startIdx, endIdx + 1);
        try {
            return JSON.parse(jsonString);
        } catch (err) {
            // If direct parse fails, try to fix common issues like trailing commas
            const cleaned = jsonString
                .replace(/,\s*([\]}])/g, '$1') // Remove trailing commas
                .replace(/([^\\])"\s*\+/g, '$1') // Handle multi-line string concatenation if present
                .replace(/\+ \s*"/g, '');

            try {
                return JSON.parse(cleaned);
            } catch (innerErr) {
                console.error("Failed to parse story JSON from Claude response even after cleaning. Raw content:", content);
                throw new Error("Failed to parse story JSON from Claude response");
            }
        }
    }

    async generateCoverPrompt(storyText: string, characterAnchor: string): Promise<string> {
        const prompt = `Based on the following children's story, generate a highly descriptive image prompt for a book cover illustration. 
        Focus on the central theme and action, featuring the main character.
        
        Story Text:
        ${storyText}

        Character Visual Identity (USE THIS FULL DESCRIPTION EXACTLY, DO NOT SUMMARIZE):
        ${characterAnchor}
        
        IMPORTANT: Your output MUST be under 800 characters. Output ONLY the image prompt text. Do not include style keywords as they will be added later.
        The prompt should describe an iconic, centered scene suitable for a book cover, and MUST literally include the key visual markers from the Character Visual Identity description above.`;

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
            modelId: "global.anthropic.claude-sonnet-4-5-20250929-v1:0",
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify(body),
        });

        const response = await this.client.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        return responseBody.content[0].text.trim();
    }

    async generateKeywordsAndDescription(storyText: string, category?: string, theme?: string): Promise<{ keywords: string[], description: string }> {
        const prompt = `Based on the children's story text below, generate:
        1. A list of 8-12 descriptive theme keywords.
           - EACH keyword MUST be a SINGLE word.
           - Focus on simple, searchable terms (e.g., "moon", "space", "hero", "magic", "dinosaur").
           - Include terms related to the category "${category || 'unknown'}" and theme "${theme || 'unknown'}".
        2. A concise, engaging 2-3 sentence description of the story for a library catalog.
        
        Story Text:
        ${storyText.slice(0, 4000)}

        Output format: JSON
        {
            "keywords": ["word1", "word2", ...],
            "description": "Engaging description here..."
        }`;

        const body = {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 500,
            temperature: 0.5,
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
            modelId: "global.anthropic.claude-sonnet-4-5-20250929-v1:0",
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify(body),
        });

        const response = await this.client.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        const content = responseBody.content[0].text.trim();

        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error("Failed to find JSON in Claude response. Raw content:", content);
            throw new Error("Failed to parse keywords JSON");
        }

        try {
            return JSON.parse(jsonMatch[0]);
        } catch (e) {
            console.error("JSON parse error in generateKeywordsAndDescription:", e, "JSON string:", jsonMatch[0]);
            // Fallback: try to fix common issues like trailing commas
            try {
                const fixedJson = jsonMatch[0].replace(/,\s*([\}\]])/g, '$1');
                return JSON.parse(fixedJson);
            } catch (e2) {
                throw new Error("Failed to parse fixed keywords JSON");
            }
        }
    }

    async sanitizeImagePrompt(originalPrompt: string): Promise<string> {
        const prompt = `Rewrite the following image prompt for a children's book illustration, removing ALL trademarked character names, specific brand series, and identifiable character-specific titles/names (e.g., remove "Thomas the Tank Engine", "Sir Topham Hatt", "Disney", "Marvel", "Iron Man", "Thor", "Hulk", "Avengers", "Paw Patrol", "Ryder", "Chase", "Dog Man", "Cat Kid", "Minecraft", "Steve", "Alex"). 
        Replace them with generic but highly descriptive equivalents that capture the same visual essence.
        
        Examples of good replacements:
        - "Thomas" -> "a cheerful small blue tank engine with a friendly face"
        - "Sir Topham Hatt" -> "a friendly portly gentleman in a formal black suit and top hat"
        - "Iron Man" -> "a futuristic superhero in sleek red and gold high-tech armor"
        - "Hulk" -> "a friendly and strong big green giant with a playful smile"
        - "Thor" -> "a heroic warrior with a red cape holding a magical heavy hammer"
        - "Ryder" -> "a helpful young boy leading a team"
        - "Chase" -> "a brave German Shepherd puppy in a blue police uniform"
        
        Original Prompt:
        ${originalPrompt}
        
        Constraints:
        - Preserve all other descriptive details (colors, setting, action).
        - Keep the output under 800 characters.
        - Return ONLY the rewritten prompt text. No introduction or quotes.`;

        const body = {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 500,
            temperature: 0.3, // Lower temperature for more direct replacement
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
            modelId: "global.anthropic.claude-sonnet-4-5-20250929-v1:0",
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify(body),
        });

        const response = await this.client.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        return responseBody.content[0].text.trim().replace(/^"|"$/g, '');
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
            modelId: "global.anthropic.claude-sonnet-4-5-20250929-v1:0",
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify(body),
        });

        const response = await this.client.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        return responseBody.content[0].text.trim().replace(/^"|"$/g, '');
    }

    async generateCharacterAnchor(theme: string, level: string): Promise<string> {
        const prompt = `Create a concise set of "Visual Keys" for the main character of a children's story about "${theme}" for ${level} level.
        
        Requirements:
        1. List only the absolute essentials: age/build, specific hair, specific clothing colors/items, and 1 signature accessory (glasses, hat, etc.).
        2. Format should be a comma-separated list of visual markers (e.g., "10yo boy, messy chestnut hair, bright red hoodie, blue denim jeans, small round glasses").
        3. Do NOT use trademarked names (like Batman or Superman), instead use descriptive equivalents.
        4. Return ONLY the comma-separated list. No introduction or bullets.`;

        const body = {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 300,
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
            modelId: "global.anthropic.claude-sonnet-4-5-20250929-v1:0",
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
