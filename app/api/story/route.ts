import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return NextResponse.json({ error: "API Key missing on server" }, { status: 500 });
    }

    try {
        const { words, userProfile } = await req.json();
        const { name, age, gender } = userProfile;
        const wordsList = words.join(", ");

        const genAI = new GoogleGenAI({ apiKey });
        const response = await genAI.models.generateContent({
            model: "gemini-2.0-flash-exp",
            contents: `Write a short, engaging children's story for a ${age}-year-old ${gender} named ${name}.
The story MUST include the following words: ${wordsList}.
Split the story into exactly 5 distinct scenes.

For the JSON output:
1. In the "text" field: Use the name "${name}" naturally to tell the story.
2. In the "image_prompt" field: ALWAYS use the placeholder "[1]" to represent the main character ${name}. Do NOT use the name "${name}" in image prompts. ALWAYS start the image_prompt with "[1]" doing an action. Example: "[1] is running through a forest" or "[1] looks up at the stars".

IMPORTANT: Every image_prompt MUST contain "[1]" at least once. This is critical for the illustrator.

Also, provide a "mainCharacterDescription" which is a consistent physical description of ${name} (e.g., "A 6-year-old boy with curly brown hair wearing a green t-shirt").

The story should be fun, educational, and age-appropriate.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        content: { type: Type.STRING, description: "A full text version of the story" },
                        mainCharacterDescription: { type: Type.STRING },
                        scenes: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    text: { type: Type.STRING },
                                    image_prompt: { type: Type.STRING }
                                },
                                required: ["text", "image_prompt"]
                            }
                        }
                    },
                    required: ["title", "content", "scenes", "mainCharacterDescription"]
                },
                systemInstruction: "You are a creative storyteller for children. You output structured JSON stories with scene-by-scene descriptions for illustrators.",
                temperature: 0.8,
            }
        });

        const data = JSON.parse(response.text || '{}');
        console.log("Gemini Story API response:", data);
        return NextResponse.json(data);

    } catch (error: any) {
        console.error("Gemini Story API error:", error);
        return NextResponse.json({ error: error.message || "Failed to generate story" }, { status: 500 });
    }
}
