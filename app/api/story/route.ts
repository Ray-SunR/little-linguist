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
            contents: `Write a short, engaging story for a ${age}-year-old ${gender} named ${name}.
The story MUST include the following words: ${wordsList}.
Highlight the usage of these words in the story if possible (e.g., using bold markdown).

The story should be fun, educational, and age-appropriate.
Provide a title for the story as well.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        content: { type: Type.STRING },
                    },
                    required: ["title", "content"]
                },
                systemInstruction: "You are a creative storyteller for children.",
                temperature: 0.8,
            }
        });

        const data = JSON.parse(response.text || '{}');
        return NextResponse.json(data);

    } catch (error: any) {
        console.error("Gemini Story API error:", error);
        return NextResponse.json({ error: error.message || "Failed to generate story" }, { status: 500 });
    }
}
