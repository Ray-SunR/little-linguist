import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { normalizeWord } from "@/lib/core";
import { sanitizeWord } from "@/lib/core/text-utils";
import { AuditService, AuditAction, EntityType } from "@/lib/features/audit/audit-service.server";


export async function GET(request: NextRequest) {
    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const childId = searchParams.get('childId');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');
        const light = searchParams.get('light') === 'true';
        const status = searchParams.get('status');
        const search = searchParams.get('search');
        const sortBy = searchParams.get('sortBy') || 'createdAt';
        const sortOrder = searchParams.get('sortOrder') || 'desc';
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        if (!childId) {
            return NextResponse.json({ error: 'childId is required' }, { status: 400 });
        }

        // 0. Ownership Validation: Ensure the child belongs to the authenticated user
        if (childId) {
             const { data: child, error: childCheckError } = await supabase
                .from('children')
                .select('id')
                .eq('id', childId)
                .eq('owner_user_id', user.id)
                .single();

            if (childCheckError || !child) {
                return NextResponse.json({ error: 'Forbidden: You do not own this child profile' }, { status: 403 });
            }
        }

        // 1. Build query
        const selectFields = `
            status,
            origin_book_id,
            created_at,
            source_type,
            reps,
            next_review_at,
            books: origin_book_id(
                title,
                cover_image_path
            ),
            word_insights!inner(
                word
                ${light ? '' : `,
                definition,
                pronunciation,
                examples,
                audio_path,
                word_audio_path,
                example_audio_paths,
                timing_markers,
                example_timing_markers`}
            )
        `;

        let query = supabase
            .from('child_vocab')
            .select(selectFields, { count: 'exact' })
            .eq('child_id', childId);

        // Filter by status
        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        // Filter by search
        if (search) {
            query = query.ilike('word_insights.word', `%${search.toLowerCase()}%`);
        }

        // Filter by Date Range
        if (startDate) {
            query = query.gte('created_at', startDate);
        }
        if (endDate) {
            query = query.lte('created_at', endDate);
        }

        // Sort mapping
        const dbSortField = sortBy === 'word' ? 'word' : (sortBy === 'reps' ? 'reps' : 'created_at');
        const ascending = sortOrder === 'asc';

        const { data, error, count } = await query
            .order(dbSortField, { ascending })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        // 2. Asset Signing
        const signedMap = new Map<string, string>();
        const imageBucket = "book-assets";
        const audioBucket = "word-insights-audio";
        
        const imagePaths = new Set<string>();
        const audioPaths = new Set<string>();

        (data || []).forEach((item: any) => {
            const b = item.books;
            if (b?.cover_image_path && !b.cover_image_path.startsWith('http')) {
                imagePaths.add(b.cover_image_path);
            }

            if (!light) {
                const wi = item.word_insights;
                if (wi) {
                    if (wi.audio_path) audioPaths.add(wi.audio_path);
                    if (wi.word_audio_path) audioPaths.add(wi.word_audio_path);
                    if (wi.example_audio_paths) {
                        wi.example_audio_paths.forEach((p: string) => audioPaths.add(p));
                    }
                }
            }
        });

        const allImagePaths = Array.from(imagePaths);
        if (allImagePaths.length > 0) {
            const { data: signs } = await supabase.storage
                .from(imageBucket)
                .createSignedUrls(allImagePaths, 3600);
            signs?.forEach(s => {
                if (s.signedUrl) signedMap.set(s.path || "", s.signedUrl);
            });
        }

        const allAudioPaths = Array.from(audioPaths);
        if (!light && allAudioPaths.length > 0) {
            const CHUNK_SIZE = 100;
            for (let i = 0; i < allAudioPaths.length; i += CHUNK_SIZE) {
                const chunk = allAudioPaths.slice(i, i + CHUNK_SIZE);
                const { data: signs } = await supabase.storage
                    .from(audioBucket)
                    .createSignedUrls(chunk, 3600);
                signs?.forEach(s => {
                    if (s.signedUrl) signedMap.set(s.path || "", s.signedUrl);
                });
            }
        }

        // 3. Transform
        const words = (data || []).map((item: any) => {
            const wi = item.word_insights;
            if (!wi) return null;

            const normalized = sanitizeWord(wi.word);

            return {
                word: wi.word, 
                bookId: item.origin_book_id,
                bookTitle: item.books?.title,
                coverImagePath: item.books?.cover_image_path,
                coverImageUrl: item.books?.cover_image_path
                    ? (item.books.cover_image_path.startsWith('http')
                        ? item.books.cover_image_path
                        : signedMap.get(item.books.cover_image_path))
                    : undefined,
                createdAt: item.created_at,
                status: item.status,
                source_type: item.source_type,
                reps: item.reps,
                nextReviewAt: item.next_review_at,
                definition: wi.definition,
                pronunciation: wi.pronunciation,
                examples: wi.examples,
                audioUrl: signedMap.get(wi.audio_path) || "",
                audioPath: wi.audio_path || "",
                wordAudioUrl: signedMap.get(wi.word_audio_path) || "",
                wordAudioPath: wi.word_audio_path || "",
                exampleAudioUrls: wi.example_audio_paths?.map((p: string) => signedMap.get(p) || "") || [],
                exampleAudioPaths: wi.example_audio_paths || [],
                wordTimings: wi.timing_markers,
                exampleTimings: wi.example_timing_markers || [],
                isLight: light
            };
        }).filter(Boolean);

        return NextResponse.json({
            words,
            pagination: {
                total: count,
                limit,
                offset,
                hasMore: (offset + words.length) < (count || 0)
            }
        });
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

        // 0. Ownership Validation: Ensure the child belongs to the authenticated user
        // We explicitly check owner_user_id to prevent any ID guessing or leakage
        const { data: child, error: childCheckError } = await userClient
            .from('children')
            .select('id')
            .eq('id', childId)
            .eq('owner_user_id', user.id) // CRITICAL: Enforce ownership
            .single();

        if (childCheckError || !child) {
            console.warn(`[Words API] Unauthorized attempt to add word to child ${childId} by user ${user.id}`);
            return NextResponse.json({ error: 'Forbidden: You do not own this child profile' }, { status: 403 });
        }

        const validWord = rawWord; // Use rawWord directly or normalized slightly but lookup against 'word'
        const normalized = sanitizeWord(rawWord);

        // 1. Ensure vocab_term exists and is enriched
        let termId: string;
        let finalTerm = null;

        // Use upsert on 'word' column to either insert new or update existing with fresh audio/timing paths
        const { data: upsertedTerm, error: termError } = await adminClient
            .from('word_insights')
            .upsert({
                word: normalized,
                definition: insight?.definition,
                pronunciation: insight?.pronunciation,
                examples: insight?.examples,
                audio_path: insight?.audioPath,
                word_audio_path: insight?.wordAudioPath,
                example_audio_paths: insight?.exampleAudioPaths,
                timing_markers: insight?.wordTimings,
                example_timing_markers: insight?.exampleTimings,
                updated_at: new Date().toISOString()
            }, { onConflict: 'word' })
            .select('id')
            .single();

        if (termError) throw termError;
        termId = upsertedTerm.id;
        finalTerm = upsertedTerm;

        // 2. Insert into child_vocab
        const { data, error } = await adminClient
            .from('child_vocab')
            .upsert({
                child_id: childId,
                word_id: termId,
                word: normalized,
                origin_book_id: bookId || null,
                source_type: 'clicked'
            }, { onConflict: 'child_id,word_id' })
            .select()
            .single();

        if (error) throw error;

        // D. Audit & Rewards: Word Added
        const { data: recordResult, error: recordError } = await adminClient.rpc('record_activity', {
            p_child_id: childId,
            p_action_type: AuditAction.WORD_ADDED,
            p_entity_type: EntityType.WORD,
            p_entity_id: normalized,
            p_details: {
                word: rawWord,
                bookId: bookId,
                insightGenerated: !!insight
            },
            p_xp_reward: 10 // Reward for and adding a word to their collection
        });

        if (recordError) {
            console.error("[Words API] Failed to record activity:", recordError);
            // Fallback to basic audit
            await AuditService.log({
                action: AuditAction.WORD_ADDED,
                entityType: EntityType.WORD,
                entityId: normalized,
                userId: user.id,
                childId: childId,
                details: { word: rawWord, bookId: bookId }
            });
        }

        return NextResponse.json({ success: true, word: normalized, entry: finalTerm });
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

        // Check for batch deletion in body
        let wordsToDelete: string[] = [];
        let targetChildId = childId;

        try {
            const body = await request.json();
            if (body.words && Array.isArray(body.words)) {
                wordsToDelete = body.words;
            }
            if (body.childId) {
                targetChildId = body.childId;
            }
        } catch (e) {
            // No body or not JSON, fallback to query param
            if (rawWord) wordsToDelete = [rawWord];
        }

        if (wordsToDelete.length === 0 || !targetChildId) {
            return NextResponse.json({ error: 'Words and childId are required' }, { status: 400 });
        }

        // 0. Ownership Validation
        const { data: child, error: childCheckError } = await supabase
            .from('children')
            .select('id')
            .eq('id', targetChildId)
            .eq('owner_user_id', user.id)
            .single();

        if (childCheckError || !child) {
            return NextResponse.json({ error: 'Forbidden: You do not own this child profile' }, { status: 403 });
        }

        const normalizedWords = wordsToDelete.map(w => sanitizeWord(w));

        // Find word_ids for these normalized words
        const { data: terms } = await supabase
            .from('word_insights')
            .select('id, word')
            .in('word', normalizedWords);

        if (!terms || terms.length === 0) return NextResponse.json({ success: true });

        const termIds = terms.map(t => t.id);

        const { error } = await supabase
            .from('child_vocab')
            .delete()
            .eq('child_id', targetChildId)
            .in('word_id', termIds);

        if (error) throw error;

        // Audit: Words Removed
        await Promise.all(normalizedWords.map(normalized => 
            AuditService.log({
                action: AuditAction.WORD_REMOVED,
                entityType: EntityType.WORD,
                entityId: normalized,
                userId: user.id,
                childId: targetChildId!,
                details: {
                    word: normalized, // Best effort since we might not have raw words for all in batch body
                }
            })
        ));

        return NextResponse.json({ success: true, count: normalizedWords.length });
    } catch (error: any) {
        console.error("DELETE /api/words error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
