import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { normalizeWord } from "@/lib/core";

/**
 * Sanitizes a word for consistent storage and lookup across all APIs.
 * Must match the logic in app/api/word-insight/route.ts
 */
function sanitizeWord(word: string): string {
    return normalizeWord(word).replace(/[^a-z0-9-]/g, "");
}

export async function GET(request: NextRequest) {
    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('user_words')
            .select(`
                word,
                book_id,
                created_at,
                word_insights (
                    definition,
                    pronunciation,
                    examples,
                    audio_path,
                    timing_markers
                )
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Map to WordInsight-like structure for the frontend
        const words = (data || []).map((item: any) => ({
            word: item.word,
            bookId: item.book_id,
            createdAt: item.created_at,
            ...item.word_insights
        }));

        return NextResponse.json(words);
    } catch (error: any) {
        console.error("GET /api/words error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const userClient = createClient();
        const adminClient = createAdminClient();

        const { data: { user } } = await userClient.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { word: rawWord, bookId, insight } = await request.json();

        if (!rawWord) {
            return NextResponse.json({ error: 'Word is required' }, { status: 400 });
        }

        const word = sanitizeWord(rawWord);

        // Ensure the word exists in word_insights first to satisfy the foreign key
        // We use the admin client here because regular users don't have write access to public.word_insights
        if (insight) {
            const { error: insightError } = await adminClient
                .from('word_insights')
                .upsert({
                    word,
                    definition: insight.definition,
                    pronunciation: insight.pronunciation,
                    examples: insight.examples,
                }, { onConflict: 'word' });

            if (insightError) {
                console.error("Failed to upsert word insight:", insightError);
                // If it fails, we still try the user_words insert, which will fail with a 
                // more descriptive FK error if the word truly doesn't exist.
            }
        }

        const { data, error } = await userClient
            .from('user_words')
            .upsert({
                user_id: user.id,
                word,
                book_id: bookId || null,
            }, { onConflict: 'user_id,word,book_id' })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        console.error("POST /api/words error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const rawWord = searchParams.get('word');
        const bookId = searchParams.get('bookId');

        if (!rawWord) {
            return NextResponse.json({ error: 'Word is required' }, { status: 400 });
        }

        const word = sanitizeWord(rawWord);

        let query = supabase
            .from('user_words')
            .delete()
            .eq('user_id', user.id)
            .eq('word', word);

        if (bookId) {
            query = query.eq('book_id', bookId);
        }

        const { error } = await query;

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("DELETE /api/words error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
