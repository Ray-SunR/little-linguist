import { GoogleGenAI, Type } from "@google/genai";
import { WordAnalysisProvider, WordAnalysisResult } from "./types";

export class GeminiWordAnalysisProvider implements WordAnalysisProvider {
    private genAI: GoogleGenAI;

    constructor(apiKey: string) {
        this.genAI = new GoogleGenAI({ apiKey });
    }

    async analyzeWord(word: string): Promise<WordAnalysisResult> {
        const prompt = `You are a helpful teacher for children ages 5-8. 
Provide a simple, kid-friendly explanation for the word "${word}".

Include:
1. A simple, clear definition (one sentence, appropriate for young children)
2. Simple phonetic pronunciation (e.g., "cat" = "kat", "there" = "thair")
3. 1-2 example sentences that a young child would understand

Keep everything simple, fun, and age-appropriate.`;

        const result = await this.genAI.models.generateContent({
            model: "gemini-2.0-flash-exp",
            contents: prompt,
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

        const text = result.text || '{}';
        return JSON.parse(text) as WordAnalysisResult;
    }
}
