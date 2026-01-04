import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";

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

import { createClient as createAuthClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
    if (!PROJECT_ID) {
        return NextResponse.json({ error: "GOOGLE_PROJECT_ID missing" }, { status: 500 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get current user for owner_user_id
    const authClient = createAuthClient();
    const { data: { user } } = await authClient.auth.getUser();

    try {
        const { prompt, userPhotoBase64, characterDescription, bookId, afterWordIndex, sceneIndex } = await req.json();

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

        const content = candidates[0].content;
        if (!content || !content.parts) {
            throw new Error(`Model returned no content (Finish Reason: ${candidates[0].finishReason})`);
        }

        for (const part of content.parts) {
            if (part.inlineData) {
                base64Image = part.inlineData.data;
            } else if (part.text) {
                modelThought = part.text;
            }
        }

        if (!base64Image) {
            throw new Error("No image generated");
        }

        const dataUrl = `data:image/png;base64,${base64Image}`;

        // --- 7. Persist Image to Supabase ---
        if (bookId && afterWordIndex !== undefined) {
            const buffer = Buffer.from(base64Image, 'base64');
            const fileName = `scene-${sceneIndex || Date.now()}.png`;
            const storagePath = `${bookId}/images/${fileName}`;

            await supabase.storage.from('book-assets').upload(storagePath, buffer, {
                contentType: 'image/png',
                upsert: true
            });

            await supabase.from('book_media').upsert({
                book_id: bookId,
                owner_user_id: user?.id || null,
                media_type: 'image',
                path: storagePath,
                after_word_index: afterWordIndex,
                metadata: {
                    caption: `Illustration for scene`,
                    alt: prompt
                }
            }, { onConflict: 'book_id,path' });

            // Also update the main book record's images array for redundancy/readability
            const { data: book } = await supabase.from('books').select('images').eq('id', bookId).single();
            const currentImages = Array.isArray(book?.images) ? book.images : [];
            const newImage = {
                id: crypto.randomUUID(),
                src: storagePath,
                afterWordIndex: afterWordIndex,
                caption: `Illustration for scene`,
                alt: prompt
            };

            await supabase.from('books').update({
                images: [...currentImages, newImage],
                updated_at: new Date().toISOString()
            }).eq('id', bookId);
        }

        return NextResponse.json({
            imageUrl: dataUrl,
            thought: modelThought
        });

    } catch (error: any) {
        console.error("Image generation error:", error);
        return NextResponse.json({ error: error.message || "Failed to generate image" }, { status: 500 });
    }
}
