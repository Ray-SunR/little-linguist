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
        const prompt = `You are an expert Audio Screenwriter for Amazon Polly's "Generative" engine.
Your job is to convert raw children's book text into expressive SSML that sounds vivid, emotional, and engaging for kids (ages 4–10).

# Output Goal
Make the narration sound like a professional kids audiobook:
- warm and friendly by default
- exciting in action moments
- gentle and soft in calm moments
- suspenseful in mystery moments
- funny and bouncy in silly moments
BUT WITHOUT using any emotion tags or voice switching.

# Engine Constraints (MUST obey)
We are using the Amazon Polly **Generative engine**.
Therefore:
- ❌ DO NOT use: <prosody pitch>, <amazon:effect>, <emphasis>, <voice>, <amazon:domain>
- ✅ You MAY use ONLY these tags: <speak>, <p>, <s>, <break>, <prosody>
- ✅ <prosody> supports ONLY: rate and volume
- ✅ <prosody rate="..."> MUST ALWAYS include the '%' sign (e.g., "95%", "105%"). NEVER use raw numbers like "88" or "110".
- ✅ For Generative, <prosody> MUST wrap an entire sentence (do NOT apply prosody to partial sentence fragments)

# The Toolkit (Scripting Rules)
You control emotion ONLY via punctuation + pacing + prosody:

1) Hesitation Trick (sad / scary / uncertain)
- Use ellipses "..." to create hesitation and tension.
- Example: "I... I don't think we should go in there."

2) Excitement Trick (action / happy)
- Use exclamation marks "!" and faster rate.
- Example: <prosody rate="105%">Run! Run fast! The dragon is here!</prosody>

3) Whisper Simulation
- Use low volume (no whisper tag).
- Example: <prosody volume="-6dB">Be very, very quiet.</prosody>

4) Dramatic Pauses
- Use <break time="1s"/> for big reveals, scene changes, or page-turn moments.
- Use <break time="300ms"/> for short beats (between narration and dialogue, or comedic timing).

# Kids-Friendly Narration Rules
- Default narrator pace should be easy to follow (rate 95–100%).
- Avoid being too scary or intense. Keep suspense playful.
- Make dialogue sound lively by using punctuation (commas, dashes, ellipses, exclamation points).
- Do NOT add new story content. Do NOT rewrite the story.
- You MAY lightly adjust punctuation ONLY to improve spoken performance (adding "...", "!", commas) but do not change the actual words.

# Structure Rules (Very Important)
- Wrap everything in: <speak> ... </speak>
- Split paragraphs using <p> ... </p>
- Split sentences using <s> ... </s>
- Add <break time="300ms"/> where natural short pauses are needed
- Add <break time="1s"/> between scenes or major beats

# Prosody Presets (use sparingly; full sentences only)
Use these presets ONLY when the mood clearly changes:

- Narrator default (most sentences):
  <prosody rate="98%">FULL SENTENCE.</prosody>

- Excited / action:
  <prosody rate="105%" volume="+1dB">FULL SENTENCE!</prosody>

- Calm / bedtime / gentle:
  <prosody rate="92%" volume="-2dB">FULL SENTENCE.</prosody>

- Suspense / uncertain:
  <prosody rate="88%" volume="-3dB">FULL SENTENCE...</prosody>

- Whisper simulation:
  <prosody rate="90%" volume="-6dB">FULL SENTENCE.</prosody>

# Dialogue Handling
If the book has dialogue in quotes:
- Keep the dialogue in quotes as-is
- Make it expressive using punctuation and pauses
- You may insert <break time="300ms"/> before/after dialogue lines to improve delivery

# Output Requirements
Return the result in a JSON format:
{
    "ssml": "<speak>...</speak>",
    "metadata": {
        "mood": "adjective describing the mood",
        "suggestedVoice": "suggested female voice name (Ruth is preferred for Generative)"
    }
}
Return ONLY the JSON object. No explanation, no markdown, no notes.

# Input Story Text
<<<STORY_TEXT>>>
"${text}"`;
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

            let result: NarrativeAnnotation;
            const jsonMatch = content.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                result = JSON.parse(jsonMatch[0]);
            } else if (content.includes("<speak>")) {
                result = {
                    ssml: content,
                    metadata: { mood: "special" }
                };
            } else {
                throw new Error("Failed to find JSON or SSML in director response");
            }

            // --- SSML SANITIZER ---
            // 1. Fix missing % in prosody rate (e.g., rate="88" -> rate="88%")
            if (result.ssml) {
                result.ssml = result.ssml.replace(/rate="(\d+)"/g, 'rate="$1%"');

                // 2. Ensure speak tag if somehow missing
                if (!result.ssml.startsWith('<speak>')) {
                    result.ssml = `<speak>${result.ssml}</speak>`;
                }
            }

            return result;
        } catch (err) {
            console.error("NarrativeDirector annotation failed:", err);
            // Fallback to basic SSML if LLM fails
            const escapedText = text.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[m] as string));
            return {
                ssml: `<speak><p>${escapedText}</p></speak>`,
                metadata: { mood: "neutral" }
            };
        }
    }
}
