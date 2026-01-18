import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

export interface NarrativeAnnotation {
    ssml: string;
    metadata: {
        mood: string;
        suggestedVoice?: string;
    };
}

export class NarrativeDirector {
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

    /**
     * Analyzes a text snippet and returns SSML with prosody and pacing annotations.
     */
    async annotate(text: string, level: string = "G1-2"): Promise<NarrativeAnnotation> {
        const prompt = `You are a professional audio book director. Your task is to transform the following story text into expressive SSML (Speech Synthesis Markup Language) for AWS Polly's Generative engine.

Story Content:
"${text}"

Target Reading Level: ${level}

Instructions:
1. Wrap the entire output in <speak> tags.
2. Use <prosody> tags to control:
   - rate: Use values like "slow", "medium", "fast", or percentages (e.g., "90%" for a slightly slower narrator).
   - volume: Use "soft", "medium", "loud", or relative changes (e.g., "+3dB").
   - **CRITICAL**: The "pitch" attribute is NOT supported by the Generative engine. Do NOT use it.
3. **SENTENCE LEVEL ONLY**: For Generative voices, the <prosody> tag MUST only be applied to full sentences (<s>). Do NOT wrap partial sentences or individual words in <prosody>.
4. Use <break time="..." /> for natural pauses:
   - Short pause (300ms) between related sentences.
   - Longer pause (600ms+) for suspense or scene transitions.
5. Structural tags: Use <s> for sentences and <p> for paragraphs.
6. Tone:
   - Since "pitch" is unavailable, guide the emotion through descriptive text structure and pacing (rate).
7. Return ONLY a JSON object:
{
    "ssml": "<speak>...</speak>",
    "metadata": {
        "mood": "adjective describing the mood",
        "suggestedVoice": "suggested female voice name (Ruth is preferred for Generative)"
    }
}`;

        const body = {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 2000,
            temperature: 0.5,
            messages: [
                {
                    role: "user",
                    content: [{ type: "text", text: prompt }]
                }
            ]
        };

        const command = new InvokeModelCommand({
            modelId: "global.anthropic.claude-sonnet-4-5-20250929-v1:0",
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify(body),
        });

        try {
            const response = await this.client.send(command);
            const responseBody = JSON.parse(new TextDecoder().decode(response.body));
            const content = responseBody.content[0].text.trim();

            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error("Failed to find JSON in director response");
            }

            return JSON.parse(jsonMatch[0]);
        } catch (err) {
            console.error("NarrativeDirector annotation failed:", err);
            // Fallback to basic SSML if LLM fails
            return {
                ssml: `<speak><p>${text.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[m] as string))}</p></speak>`,
                metadata: { mood: "neutral" }
            };
        }
    }
}
