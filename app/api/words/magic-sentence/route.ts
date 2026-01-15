import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient as createAuthClient } from "@/lib/supabase/server";
import { MagicSentenceService } from "@/lib/features/word-insight/magic-sentence-service.server";

export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<NextResponse> {
    try {
        const authClient = createAuthClient();
        const { data: { user } } = await authClient.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "AUTH_REQUIRED", message: "Please sign in to use Magic Sentences!" }, { status: 401 });
        }

        const { words, generateImage = false } = await req.json();

        if (!Array.isArray(words) || words.length === 0) {
            return NextResponse.json({ error: "Words array is required" }, { status: 400 });
        }

        if (words.length > 10) {
            return NextResponse.json({ error: "MAX_WORDS_EXCEEDED", message: "Select up to 10 words at a time." }, { status: 400 });
        }

        const activeChildId = cookies().get('activeChildId')?.value;
        
        if (!activeChildId) {
            return NextResponse.json({ 
                error: "CHILD_REQUIRED", 
                message: "Magic Sentences belong to a specific child. Please select a child profile first!" 
            }, { status: 400 });
        }

        const service = new MagicSentenceService(user.id);
        
        try {
            const result = await service.generateMagicSentence(words, activeChildId, generateImage);
            return NextResponse.json(result);
        } catch (error: any) {
            console.error("[MagicSentence] Generation error:", error);

            if (error.message.startsWith("LIMIT_REACHED")) {
                const message = error.message.includes('image_generation') 
                    ? "You've reached your image generation limit!" 
                    : "You've reached your magic sentence limit!";
                return NextResponse.json({ error: "LIMIT_REACHED", message }, { status: 403 });
            }

            if (error.message.startsWith("FORBIDDEN")) {
                return NextResponse.json({ error: "FORBIDDEN", message: "You don't have access to this child profile." }, { status: 403 });
            }

            return NextResponse.json({ 
                error: "GENERATION_FAILED", 
                message: "The magic wand flickered! Please try again." 
            }, { status: 500 });
        }
    } catch (error: any) {
        console.error("[MagicSentence] Route error:", error);
        return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
    }
}
