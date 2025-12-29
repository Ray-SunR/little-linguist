import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const useBackend = process.env.USE_BACKEND_WORD_INSIGHT === "true";
    const backendUrl = process.env.WORD_INSIGHT_API_URL;
    const apiKey = process.env.GEMINI_API_KEY;

    try {
        const { word } = await req.json();

        if (useBackend && backendUrl) {
            const response = await fetch(backendUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ word }),
            });
            if (!response.ok) throw new Error(`Backend error: ${response.status}`);
            return NextResponse.json(await response.json());
        }

        if (!apiKey) {
            return NextResponse.json({ error: "Gemini API Key missing on server" }, { status: 500 });
        }

        const genAI = new GoogleGenAI({ apiKey });
        const response = await genAI.models.generateContent({
            model: "gemini-2.0-flash-exp",
            contents: `You are a helpful teacher for children ages 5-8. 
Provide a simple, kid-friendly explanation for the word "${word}".

Include:
1. A simple, clear definition (one sentence, appropriate for young children)
2. Simple phonetic pronunciation (e.g., "cat" = "kat", "there" = "thair")
3. 1-2 example sentences that a young child would understand

Keep everything simple, fun, and age-appropriate.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        word: { type: Type.STRING },
                        definition: { type: Type.STRING },
                        pronunciation: { type: Type.STRING },
                        examples: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ["word", "definition", "pronunciation", "examples"]
                },
                systemInstruction: "You are a friendly teacher for 5-8 year-olds. Keep explanations short, simple, and positive.",
                temperature: 0.7,
            }
        });

        const data = JSON.parse(response.text || '{}');
        return NextResponse.json(data);

    } catch (error: any) {
        console.error("Gemini API error:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch word insight" }, { status: 500 });
    }
}
