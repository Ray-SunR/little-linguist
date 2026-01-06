import { NextRequest, NextResponse } from 'next/server';
import { BookRepository } from '@/lib/core/books/repository.server';
import { TextChunker } from '@/lib/core/books/text-chunker';
import { Tokenizer } from '@/lib/core/books/tokenizer';
import { alignSpeechMarksToTokens, getWordTokensForChunk } from '@/lib/core/books/speech-mark-aligner';
import { PollyNarrationService } from '@/lib/features/narration/polly-service.server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createAuthClient } from '@/lib/supabase/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper function to generate signed URLs
async function getSignedUrlForChunk(chunk: any, bucketName: string) {
    const storagePath = chunk.audio_path; // Keep original path
    if (chunk.audio_path && !chunk.audio_path.startsWith('http')) {
        const { data, error } = await supabase.storage
            .from(bucketName)
            .createSignedUrl(chunk.audio_path, 3600);
        if (!error && data) {
            return { ...chunk, audio_path: data.signedUrl, storagePath };
        }
    }
    return { ...chunk, storagePath };
}

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const auth = createAuthClient();
        const { data: { user } } = await auth.auth.getUser();

        const repo = new BookRepository();
        const book = await repo.getBookById(id, { userId: user?.id, includeContent: true });

        if (!book || !book.text) {
            return NextResponse.json({ error: 'Book content not found' }, { status: 404 });
        }

        const voiceId = process.env.POLLY_VOICE_ID || 'Kevin';

        // 1. Check existing chunks in database
        let chunks = await repo.getNarrationChunks(book.id, voiceId);

        // 2. If no chunks exist, perform initial sharding and generate first chunk
        if (chunks.length === 0) {
            const textChunks = TextChunker.chunk(book.text);
            const polly = new PollyNarrationService();

            const firstChunkText = textChunks[0].text;
            const { audioBuffer, speechMarks } = await polly.synthesize(firstChunkText);

            const voiceId = process.env.POLLY_VOICE_ID || 'Kevin';
            const storagePath = `${book.id}/audio/${voiceId}/0.mp3`;

            const { error: uploadError } = await supabase.storage
                .from('book-assets')
                .upload(storagePath, audioBuffer, {
                    contentType: 'audio/mpeg',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            // Align speech marks to canonical token indices
            const allTokens = Tokenizer.tokenize(book.text);
            const wordTokensForChunk = getWordTokensForChunk(allTokens, textChunks[0].startWordIndex, textChunks[0].endWordIndex);
            const alignedTimings = alignSpeechMarksToTokens(speechMarks, wordTokensForChunk);

            // Save relative path to DB
            await repo.saveNarrationChunk({
                book_id: book.id,
                chunk_index: 0,
                start_word_index: textChunks[0].startWordIndex,
                end_word_index: textChunks[0].endWordIndex,
                audio_path: storagePath,
                timings: alignedTimings,
                voice_id: voiceId
            });

            // Create placeholders
            if (textChunks.length > 1) {
                const otherChunks = textChunks.slice(1).map(c => ({
                    book_id: book.id,
                    chunk_index: c.index,
                    start_word_index: c.startWordIndex,
                    end_word_index: c.endWordIndex,
                    audio_path: '',
                    timings: [],
                    voice_id: voiceId
                }));
                await supabase.from('book_audios').upsert(otherChunks, { onConflict: 'book_id,chunk_index,voice_id' });
            }

            chunks = await repo.getNarrationChunks(book.id, voiceId);
        }

        // 3. Resolve signed URLs for all chunks
        const chunksWithUrls = await Promise.all(chunks.map(c => getSignedUrlForChunk(c, 'book-assets')));
        return NextResponse.json(chunksWithUrls);
    } catch (error: any) {
        console.error(`Narration API Error [${params.id}]:`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const { chunkIndex } = await request.json();

        const auth = createAuthClient();
        const { data: { user } } = await auth.auth.getUser();

        const repo = new BookRepository();
        const book = await repo.getBookById(id, { userId: user?.id, includeContent: true });
        if (!book || !book.text) return NextResponse.json({ error: 'Book content not found' }, { status: 404 });

        const voiceId = process.env.POLLY_VOICE_ID || 'Kevin';
        const existingChunks = await repo.getNarrationChunks(book.id, voiceId);
        const targetChunk = existingChunks.find(c => c.chunk_index === chunkIndex);

        if (!targetChunk) return NextResponse.json({ error: 'Chunk index out of range' }, { status: 400 });
        if (targetChunk.audio_path) {
            const result = await getSignedUrlForChunk(targetChunk, 'book-assets');
            return NextResponse.json(result);
        }

        // Generate!
        const textChunks = TextChunker.chunk(book.text);
        const currentText = textChunks[chunkIndex].text;

        const polly = new PollyNarrationService();
        const { audioBuffer, speechMarks } = await polly.synthesize(currentText);

        // const voiceId = process.env.POLLY_VOICE_ID || 'Kevin'; // Already defined above
        const storagePath = `${book.id}/audio/${voiceId}/${chunkIndex}.mp3`;

        const { error: uploadError } = await supabase.storage
            .from('book-assets')
            .upload(storagePath, audioBuffer, {
                contentType: 'audio/mpeg',
                upsert: true
            });

        if (uploadError) throw uploadError;

        // Align speech marks to canonical token indices
        const allTokens = Tokenizer.tokenize(book.text);
        const chunkInfo = textChunks[chunkIndex];
        const wordTokensForChunk = getWordTokensForChunk(allTokens, chunkInfo.startWordIndex, chunkInfo.endWordIndex);
        const alignedTimings = alignSpeechMarksToTokens(speechMarks, wordTokensForChunk);

        const updatedChunk = await repo.saveNarrationChunk({
            ...targetChunk,
            audio_path: storagePath, // Relative path
            timings: alignedTimings
        });

        const result = await getSignedUrlForChunk(updatedChunk, 'book-assets');
        return NextResponse.json(result);
    } catch (error: any) {
        console.error(`Narration Generation Error [${params.id}]:`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
