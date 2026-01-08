import { createClient } from '@supabase/supabase-js';
import { Book } from '../types';

/**
 * Server-only repository for Book data.
 * This should ONLY be used in API routes or Server Components.
 */
export class BookRepository {
    private supabase;

    constructor() {
        this.supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
    }

    static isValidUuid(id: string): boolean {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    }

    async getAvailableBooks(userId?: string): Promise<Partial<Book>[]> {
        let query = this.supabase
            .from('books')
            .select('id, book_key, title, origin, updated_at, voice_id, owner_user_id, estimated_reading_time');

        if (userId) {
            query = query.or(`owner_user_id.is.null,owner_user_id.eq.${userId}`);
        } else {
            query = query.is('owner_user_id', null);
        }

        const { data, error } = await query.order('title').order('id');

        if (error) throw error;
        return data || [];
    }

    /**
     * Fetches books with cover images for the library view.
     * This is optimized for the library page - it only returns metadata needed
     * for rendering book cards, including signed cover image URLs.
     */
    async getAvailableBooksWithCovers(userId?: string, childId?: string): Promise<{
        id: string;
        title: string;
        coverImageUrl?: string;
        updated_at?: string;
        voice_id?: string;
        owner_user_id?: string | null;
        totalTokens?: number;
        estimatedReadingTime?: number;
        isRead?: boolean;
        lastOpenedAt?: string;
    }[]> {
        // Fetch metadata only from 'books' table (NO TOKENS)
        const { data: booksData, error: booksError } = await this.supabase
            .from('books')
            .select('id, title, updated_at, voice_id, owner_user_id, child_id, total_tokens, estimated_reading_time, cover_image_path')
            .or(userId ? `owner_user_id.is.null,owner_user_id.eq.${userId}` : 'owner_user_id.is.null')
            .order('title');

        if (booksError) throw booksError;
        if (!booksData || booksData.length === 0) return [];

        // Fetch child-centric progress if childId is available
        let progressMap = new Map<string, any>();
        if (childId) {
            const { data: progressData } = await this.supabase
                .from('child_book_progress')
                .select('book_id, is_completed, last_read_at')
                .eq('child_id', childId)
                .in('book_id', booksData.map(b => b.id));

            if (progressData) {
                progressData.forEach(p => {
                    progressMap.set(p.book_id, p);
                });
            }
        }

        // Batch fetch cover images from book_media
        const bookIds = booksData.map(b => b.id);
        const { data: mediaData, error: mediaError } = await this.supabase
            .from('book_media')
            .select('book_id, path')
            .eq('media_type', 'image')
            .in('book_id', bookIds)
            .order('after_word_index')
            .order('path');

        const mediaCoverMap = new Map<string, string>();
        if (mediaData) {
            for (const media of mediaData) {
                if (!mediaCoverMap.has(media.book_id) && media.path) {
                    mediaCoverMap.set(media.book_id, media.path);
                }
            }
        }

        // Process books and sign cover URLs
        const booksWithCovers = await Promise.all(booksData.map(async (book: any) => {
            let coverImageUrl: string | undefined;
            // Prioritize explicit cover_image_path, fallback to first media image
            const coverPath = book.cover_image_path || mediaCoverMap.get(book.id);

            if (coverPath) {
                if (coverPath.startsWith('http')) {
                    coverImageUrl = coverPath;
                } else {
                    try {
                        const { data: signedData } = await this.supabase.storage
                            .from('book-assets')
                            .createSignedUrl(coverPath, 3600);
                        coverImageUrl = signedData?.signedUrl;
                    } catch (err) {
                        console.error(`Error signing cover URL for book ${book.id}:`, err);
                    }
                }
            }

            const progress = progressMap.get(book.id);

            // Visibility Check:
            // 1. System books (owner_user_id null) -> Visible to everyone
            // 2. Family books (child_id null) -> Visible to everyone in family
            // 3. Child books (child_id set) -> Only visible to THAT child
            const isSystemBook = !book.owner_user_id;
            const isFamilyBook = !book.child_id;
            const isMyBook = childId && book.child_id === childId;

            // If it's another child's book, skip it
            if (!isSystemBook && !isFamilyBook && !isMyBook) {
                return null;
            }

            return {
                id: book.id,
                title: book.title,
                coverImageUrl,
                coverPath,
                updated_at: book.updated_at,
                voice_id: book.voice_id,
                owner_user_id: book.owner_user_id,
                child_id: book.child_id,
                totalTokens: book.total_tokens,
                estimatedReadingTime: book.estimated_reading_time,
                isRead: progress?.is_completed || false,
                lastOpenedAt: progress?.last_read_at
            };
        }));

        return booksWithCovers.filter(Boolean) as any[];
    }

    async getBookById(idOrSlug: string, options: {
        includeTokens?: boolean,
        includeContent?: boolean,
        includeMedia?: boolean,
        includeAudio?: boolean,
        userId?: string
    } = {}): Promise<any | null> {
        const isUuid = BookRepository.isValidUuid(idOrSlug);

        // Fetch Metadata first (NO TOKENS)
        const fields = ['id', 'book_key', 'title', 'origin', 'updated_at', 'voice_id', 'owner_user_id', 'child_id', 'metadata', 'total_tokens', 'cover_image_path'];
        let query = this.supabase.from('books').select(fields.join(','));

        if (isUuid) {
            query = query.eq('id', idOrSlug);
        } else {
            query = query.eq('book_key', idOrSlug);
        }

        if (options.userId) {
            query = query.or(`owner_user_id.is.null,owner_user_id.eq.${options.userId}`);
        } else {
            query = query.is('owner_user_id', null);
        }

        const { data, error: metadataError } = await query.single();
        if (metadataError && metadataError.code !== 'PGRST116') throw metadataError;
        if (!data) return null;

        const bookMetadata = data as any;
        const result = {
            ...bookMetadata,
            images: null, // Will be populated from book_media if includeMedia
            assetTimestamps: {
                metadata: bookMetadata.updated_at,
                text: null,
                tokens: null,
                images: null,
                audios: null
            }
        };

        // Always fetch timestamps for text/tokens if they exist
        const { data: contentTime } = await this.supabase
            .from('book_contents')
            .select('updated_at')
            .eq('book_id', bookMetadata.id)
            .maybeSingle();
        if (contentTime) {
            result.assetTimestamps.text = contentTime.updated_at;
            result.assetTimestamps.tokens = contentTime.updated_at;
        }

        // Always fetch max timestamp for images
        const { data: mediaTime } = await this.supabase
            .from('book_media')
            .select('updated_at')
            .eq('book_id', bookMetadata.id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (mediaTime) {
            result.assetTimestamps.images = mediaTime.updated_at;
        }

        // Always fetch max timestamp for audios
        const { data: audioTime } = await this.supabase
            .from('book_audios')
            .select('updated_at')
            .eq('book_id', bookMetadata.id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (audioTime) {
            result.assetTimestamps.audios = audioTime.updated_at;
        }

        // Fetch Tokens/Content only if requested (LAZY LOADING)
        if (options.includeTokens || options.includeContent) {
            const contentFields = ['updated_at'];
            if (options.includeTokens) contentFields.push('tokens');
            if (options.includeContent) contentFields.push('full_text');

            const { data: contentDataAny } = await this.supabase
                .from('book_contents')
                .select(contentFields.join(','))
                .eq('book_id', bookMetadata.id)
                .single();

            if (contentDataAny) {
                const contentData = contentDataAny as any;
                if (options.includeTokens) result.tokens = contentData.tokens;
                if (options.includeContent) result.text = contentData.full_text;
            }
        }


        if (options.includeMedia) {
            const { data: media, error: mediaError } = await this.supabase
                .from('book_media')
                .select('*')
                .eq('book_id', bookMetadata.id)
                .order('after_word_index');

            if (mediaError) throw mediaError;

            // V2+ Schema: Scenes live in book metadata
            // V1 Schema: Scenes live in stories table
            let scenes = [];
            if (bookMetadata.schema_version >= 2 && Array.isArray(bookMetadata.metadata?.scenes)) {
                scenes = bookMetadata.metadata.scenes;
            } else {
                const { data: story } = await this.supabase
                    .from('stories')
                    .select('scenes')
                    .eq('id', bookMetadata.id)
                    .maybeSingle();
                if (story && Array.isArray(story.scenes)) {
                    scenes = story.scenes;
                }
            }

            if (scenes.length > 0) {
                const fullImages = scenes.map((scene: any, index: number) => {
                    const actualMedia = media?.find(m => Number(m.after_word_index) === Number(scene.after_word_index));
                    if (actualMedia) {
                        return {
                            id: actualMedia.id,
                            afterWordIndex: Number(actualMedia.after_word_index),
                            ...(actualMedia.metadata || {}),
                            src: actualMedia.path,
                            isPlaceholder: false
                        };
                    } else {
                        return {
                            id: `placeholder-${index}`,
                            afterWordIndex: Number(scene.after_word_index),
                            caption: "AI is drawing...",
                            isPlaceholder: true,
                            src: ""
                        };
                    }
                });

                result.images = await Promise.all(fullImages.map(async (img: any) => {
                    if (img.src && !img.src.startsWith('http')) {
                        const { data: signedData } = await this.supabase.storage
                            .from('book-assets')
                            .createSignedUrl(img.src, 3600);
                        if (signedData) {
                            return { ...img, src: signedData.signedUrl, storagePath: img.src };
                        }
                    }
                    return img;
                }));
            } else if (media && media.length > 0) {
                result.images = await Promise.all(media.map(async m => {
                    let finalUrl = m.path;
                    if (!m.path.startsWith('http')) {
                        const { data: signedData } = await this.supabase.storage
                            .from('book-assets')
                            .createSignedUrl(m.path, 3600);
                        if (signedData) finalUrl = signedData.signedUrl;
                    }
                    return {
                        id: m.id,
                        afterWordIndex: Number(m.after_word_index),
                        ...(m.metadata || {}),
                        src: finalUrl,
                        storagePath: m.path,
                        isPlaceholder: false
                    };
                }));
            }
        }



        // Sign cover image if exists
        let coverImageUrl = undefined;
        let coverPath = bookMetadata.cover_image_path;
        if (coverPath) {
            if (coverPath.startsWith('http')) {
                coverImageUrl = coverPath;
            } else {
                try {
                    const { data: signedData } = await this.supabase.storage
                        .from('book-assets')
                        .createSignedUrl(coverPath, 3600);
                    coverImageUrl = signedData?.signedUrl;
                } catch (err) {
                    console.error(`Error signing cover URL for book ${bookMetadata.id}:`, err);
                }
            }
        }

        result.coverImageUrl = coverImageUrl;
        result.coverPath = coverPath;

        if (options.includeAudio) {
            const audios = await this.getNarrationChunks(bookMetadata.id, bookMetadata.voice_id);
            result.audios = await Promise.all(audios.map(async (audio: any) => {
                let finalUrl = audio.audio_path;
                if (finalUrl && !finalUrl.startsWith('http')) {
                    const { data: signedData } = await this.supabase.storage
                        .from('book-assets')
                        .createSignedUrl(finalUrl, 3600);
                    if (signedData) finalUrl = signedData.signedUrl;
                }
                return {
                    id: audio.id,
                    chunk_index: audio.chunk_index,
                    start_word_index: audio.start_word_index,
                    end_word_index: audio.end_word_index,
                    audio_path: finalUrl,
                    storagePath: audio.audio_path,
                    timings: audio.timings
                };
            }));
        }

        return result;
    }

    async getNarrationChunks(bookId: string, voiceId?: string) {
        let query = this.supabase
            .from('book_audios')
            .select('*')
            .eq('book_id', bookId);

        if (voiceId) {
            query = query.eq('voice_id', voiceId);
        }

        const { data, error } = await query.order('chunk_index');

        if (error) throw error;
        return data || [];
    }

    async saveNarrationChunk(payload: any) {
        const { data, error } = await this.supabase
            .from('book_audios')
            .upsert(payload, { onConflict: 'book_id,chunk_index,voice_id' })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async getProgress(childId: string, bookId: string) {
        if (!BookRepository.isValidUuid(bookId)) return null;

        const { data, error } = await this.supabase
            .from('child_book_progress')
            .select('*')
            .match({ child_id: childId, book_id: bookId })
            .maybeSingle();

        if (error) throw error;
        return data;
    }

    async saveProgress(childId: string, bookId: string, progress: {
        last_token_index?: number;
        last_shard_index?: number;
        is_completed?: boolean;
        total_read_seconds?: number;
        playback_speed?: number;
    }) {
        if (!BookRepository.isValidUuid(bookId)) {
            throw new Error(`Invalid book ID: ${bookId}`);
        }

        const dbProgress = {
            ...progress,
            child_id: childId,
            book_id: bookId,
            last_read_at: new Date().toISOString()
        };

        const { data, error } = await this.supabase
            .from('child_book_progress')
            .upsert(dbProgress, { onConflict: 'child_id,book_id' })
            .select()
            .single();

        if (error) throw error;
        return data;
    }


}
