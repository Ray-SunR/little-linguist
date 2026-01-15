import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient as createAuthClient } from "@/lib/supabase/server";
import { MagicSentenceService } from "@/lib/features/word-insight/magic-sentence-service.server";

export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<NextResponse> {
    try {
        const authClient = createAuthClient();
        const { data: { user } } = await authClient.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const sentenceId = searchParams.get('id');

        const service = new MagicSentenceService(user.id);

        if (sentenceId) {
            try {
                const sentence = await service.getSentenceById(sentenceId);
                return NextResponse.json(sentence);
            } catch (error: any) {
                console.error("[MagicHistory] Single fetch error:", error);
                if (error.message.startsWith("NOT_FOUND")) {
                    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
                }
                if (error.message.startsWith("FORBIDDEN")) {
                    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
                }
                return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
            }
        }

        const activeChildId = cookies().get('activeChildId')?.value;
        if (!activeChildId) {
            return NextResponse.json({ error: "CHILD_REQUIRED" }, { status: 400 });
        }

        try {
            const history = await service.getHistory(activeChildId);
            return NextResponse.json(history);
        } catch (error: any) {
            console.error("[MagicHistory] History fetch error:", error);
            if (error.message.startsWith("FORBIDDEN")) {
                return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
            }
            return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
        }

    } catch (err) {
        console.error("[MagicHistory] Unexpected Error:", err);
        return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
    }
}
