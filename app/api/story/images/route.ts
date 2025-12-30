import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

const PROJECT_ID = process.env.GOOGLE_PROJECT_ID;
const LOCATION = 'global';
const MODEL_ID = 'gemini-2.5-flash-image';

function getCredentials() {
    if (process.env.GOOGLE_CREDENTIALS_JSON) {
        try {
            return JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
        } catch (e) {
            console.error("Failed to parse GOOGLE_CREDENTIALS_JSON", e);
        }
    }
    return undefined;
}

export async function POST(req: Request) {
    if (!PROJECT_ID) {
        return NextResponse.json({ error: "GOOGLE_PROJECT_ID missing" }, { status: 500 });
    }

    try {
        const { prompt, userPhotoBase64, characterDescription } = await req.json();

        // 1. Initialize Client (Using Vertex AI with explicit credentials)
        const credentials = getCredentials();
        const ai = new GoogleGenAI({
            vertexai: true,
            project: PROJECT_ID,
            location: LOCATION,
            googleAuthOptions: credentials ? { credentials } : undefined
        });

        // 2. Prepare Base64 string for reference images (remove header if present)
        const isBase64DataUrl = userPhotoBase64 && userPhotoBase64.startsWith('data:image');
        const cleanBase64 = isBase64DataUrl
            ? userPhotoBase64.replace(/^data:image\/\w+;base64,/, '')
            : userPhotoBase64; // Fallback if it's already clean base64

        // Validate base64 is not empty
        const hasValidBase64 = cleanBase64 && cleanBase64.length > 100;

        // 3. Prepare Contents array
        const contents: any[] = [];

        if (hasValidBase64) {
            const mimeType = userPhotoBase64.includes('image/png') ? 'image/png' : 'image/jpeg';

            const imagePart = {
                inlineData: {
                    data: cleanBase64,
                    mimeType: mimeType
                }
            };
            contents.push(imagePart);
        }

        // 4. Build prompt
        let finalPromptText = "";
        if (hasValidBase64) {
            finalPromptText = `
                Generate a professional-grade storybook illustration featuring the child whose photos are provided before and referenced as [1] in the prompt. 
                
                The scene depicts: ${prompt}. 
                
                The child [1] should remain the central character, carefully preserving their unique facial features, age, hair style, skin color, clothing, and identity from the reference photos. 
                
                Composition and Style: An eye-level medium shot with a soft, tactile children's book texture. Use a vibrant, harmonious color palette and warm, whimsical lighting to create a magical and inviting atmosphere. 
            `;
        } else {
            finalPromptText = `
                An enchanting children's book illustration depicting: ${prompt}. 
                The protagonist, ${characterDescription}, is the focus of the scene. 
                
                Style: Vibrant colors, professional storybook art style with rich textures and a sense of wonder. 
            `;
        }

        contents.push({ text: finalPromptText });

        console.log(`Generating with ${MODEL_ID}... (Subject reference: ${hasValidBase64 ? 'Yes' : 'No'}), final prompt: ${finalPromptText}`);

        // 5. Call the API
        const response = await ai.models.generateContent({
            model: MODEL_ID,
            contents: contents,
            config: {
                responseModalities: ["IMAGE"],
                imageConfig: {
                    imageSize: '1K'
                }
            }
        });

        // 6. Handle the Output
        const candidates = response.candidates;
        if (!candidates || candidates.length === 0) {
            throw new Error("No candidates returned from model");
        }

        let base64Image: string | undefined;
        let modelThought: string | undefined;

        // Safety check for content and parts
        const content = candidates[0].content;
        if (!content || !content.parts) {
            console.error("No content or parts in response. Finish reason:", candidates[0].finishReason);
            console.error("Full response structure:", JSON.stringify(response, (k, v) => k === 'data' ? '[BINARY]' : v, 2));
            return NextResponse.json({
                error: `Model returned no content (Finish Reason: ${candidates[0].finishReason})`,
                details: "The model did not return any parts."
            }, { status: 500 });
        }

        for (const part of content.parts) {
            if (part.inlineData) {
                base64Image = part.inlineData.data;
            } else if (part.text) {
                modelThought = part.text;
                console.log('\n🤖 Model Thought Process Snippet:\n', modelThought.substring(0, 300) + "...");
            }
        }

        if (!base64Image) {
            console.error("No image generated in parts. Full response structure:", JSON.stringify(response, (k, v) => k === 'data' ? '[BINARY]' : v, 2));
            return NextResponse.json({
                error: "No image generated (Safety Filter or Model Issue)",
                details: "The model did not return an image part."
            }, { status: 500 });
        }

        return NextResponse.json({
            imageUrl: `data:image/png;base64,${base64Image}`,
            thought: modelThought
        });

    } catch (error: any) {
        console.error("Gemini 3 Image generation API error:", error);
        return NextResponse.json({ error: error.message || "Failed to generate image" }, { status: 500 });
    }
}
