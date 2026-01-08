import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
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

        const { searchParams } = new URL(request.url);
        const childId = searchParams.get('childId');

        if (!childId) {
            return NextResponse.json({ error: 'childId is required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('child_vocab')
            .select(`
                status,
                origin_book_id,
                created_at,
                source_type,
                reps,
                next_review_at,
                books:origin_book_id (
                    title,
                    cover_image_path
                ),
                word_insights (
                    word,
                    definition,
                    pronunciation,
                    examples,
                    audio_path,
                    timing_markers
                )
            `)
            .eq('child_id', childId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Collect paths for batch signing, separated by bucket
        const audioBucket = "word-insights-audio";
        const imageBucket = "book-assets";
        
        const audioPaths = new Set<string>();
        const imagePaths = new Set<string>();

        (data || []).forEach((item) => {
            const b = item.books as any;
            if (b?.cover_image_path && !b.cover_image_path.startsWith('http')) {
                imagePaths.add(b.cover_image_path);
            }

            const wi = item.word_insights as any;
            if (wi && wi.word) {
                // Determine paths by convention from normalized word
                // 1. Stored path (likely definition audio)
                if (wi.audio_path) audioPaths.add(wi.audio_path);
                
                // 2. Convention paths (constructed from normalized word)
                const normalized = normalizeWord(wi.word).replace(/[^a-z0-9-]/g, "");
                
                audioPaths.add(`${normalized}/word.mp3`);
                audioPaths.add(`${normalized}/definition.mp3`);
                audioPaths.add(`${normalized}/example_0.mp3`);
            }
        });

        // Batch sign
        let signedMap = new Map<string, string>();
        
        // Sign audio paths
        const allAudioPaths = Array.from(audioPaths);
        if (allAudioPaths.length > 0) {
            const CHUNK_SIZE = 100;
            for (let i = 0; i < allAudioPaths.length; i += CHUNK_SIZE) {
                const chunk = allAudioPaths.slice(i, i + CHUNK_SIZE);
                const { data: signs, error: signError } = await supabase.storage
                    .from(audioBucket)
                    .createSignedUrls(chunk, 3600);
                
                if (!signError && signs) {
                    signs.forEach(s => {
                        if (s.signedUrl) signedMap.set(s.path || "", s.signedUrl);
                    });
                }
            }
        }

        // Sign image paths
        const allImagePaths = Array.from(imagePaths);
        if (allImagePaths.length > 0) {
            const CHUNK_SIZE = 100;
            for (let i = 0; i < allImagePaths.length; i += CHUNK_SIZE) {
                const chunk = allImagePaths.slice(i, i + CHUNK_SIZE);
                const { data: signs, error: signError } = await supabase.storage
                    .from(imageBucket)
                    .createSignedUrls(chunk, 3600);
                
                if (!signError && signs) {
                    signs.forEach(s => {
                        if (s.signedUrl) signedMap.set(s.path || "", s.signedUrl);
                    });
                }
            }
        }

        const words = (data || []).map((item) => {
            const wi = item.word_insights as any;
            if (!wi) return null;

            const normalized = normalizeWord(wi.word).replace(/[^a-z0-9-]/g, "");

            return {
                word: wi.word, // Map 'word' directly as display
                bookId: item.origin_book_id,
                bookTitle: (item.books as any)?.title,
                coverImagePath: (item.books as any)?.cover_image_path,
                coverImageUrl: (item.books as any)?.cover_image_path 
                    ? ( (item.books as any).cover_image_path.startsWith('http') 
                        ? (item.books as any).cover_image_path 
                        : signedMap.get((item.books as any).cover_image_path) ) 
                    : undefined,
                createdAt: item.created_at,
                status: item.status,
                source_type: item.source_type,
                reps: item.reps,
                nextReviewAt: item.next_review_at,
                definition: wi.definition,
                pronunciation: wi.pronunciation,
                examples: wi.examples,
                // audioUrl logic: Prefer explicit audio_path, fallback to definition.mp3 convention
                audioUrl: signedMap.get(wi.audio_path) || signedMap.get(`${normalized}/definition.mp3`) || "",
                audio_path: wi.audio_path || `${normalized}/definition.mp3`,
                wordAudioUrl: signedMap.get(`${normalized}/word.mp3`) || "",
                word_audio_path: `${normalized}/word.mp3`,
                exampleAudioUrls: [signedMap.get(`${normalized}/example_0.mp3`) || ""],
                example_audio_paths: [`${normalized}/example_0.mp3`],
                wordTimings: wi.timing_markers,
                exampleTimings: [],
            };
        }).filter(Boolean);

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
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { word: rawWord, bookId, childId, insight } = await request.json();
        if (!rawWord || !childId) {
            return NextResponse.json({ error: 'Word and childId are required' }, { status: 400 });
        }

        const validWord = rawWord; // Use rawWord directly or normalized slightly but lookup against 'word'
        const normalized = normalizeWord(rawWord).replace(/[^a-z0-9-]/g, "");

        // 1. Ensure vocab_term exists
        let termId: string;
        const { data: existingTerm } = await adminClient
            .from('word_insights')
            .select('id')
            .eq('word', normalized) // Use 'word' column, assumed normalized in storage
            .maybeSingle();

        if (existingTerm) {
            termId = existingTerm.id;
        } else {
            // 'word' column serves as both display and unique key
            const { data: newTerm, error: termError } = await adminClient
                .from('word_insights')
                .insert({
                    language: 'en',
                    word: normalized, // store normalized as 'word'
                    definition: insight?.definition,
                    pronunciation: insight?.pronunciation,
                    examples: insight?.examples,
                })
                .select('id')
                .single();
            if (termError) throw termError;
            termId = newTerm.id;
        }

        // 2. Insert into child_vocab
        const { data, error } = await adminClient
            .from('child_vocab')
            .upsert({
                child_id: childId,
                word_id: termId,
                origin_book_id: bookId || null,
                source_type: 'clicked'
            }, { onConflict: 'child_id,word_id' })
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
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const rawWord = searchParams.get('word');
        const childId = searchParams.get('childId');

        if (!rawWord || !childId) {
            return NextResponse.json({ error: 'Word and childId are required' }, { status: 400 });
        }

        const normalized = normalizeWord(rawWord).replace(/[^a-z0-9-]/g, "");

        // Find word_id
        const { data: term } = await supabase
            .from('word_insights')
            .select('id')
            .eq('word', normalized) // Use 'word' column
            .maybeSingle();

        if (!term) return NextResponse.json({ success: true });

        const { error } = await supabase
            .from('child_vocab')
            .delete()
            .eq('child_id', childId)
            .eq('word_id', term.id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("DELETE /api/words error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
