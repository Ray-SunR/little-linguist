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

        const { data, error } = await query.order('title');

        if (error) throw error;
        return data || [];
    }

    /**
     * Fetches books with cover images for the library view.
     * This is optimized for the library page - it only returns metadata needed
     * for rendering book cards, including signed cover image URLs.
     * 
     * Performance optimizations:
     * - Uses total_tokens column to get token count without fetching full tokens array
     * - Fetches cover paths from book_media in a single batched query
     * - Handles signing errors gracefully
     */
    async getAvailableBooksWithCovers(userId?: string): Promise<{
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
        // Use RPC or raw query to get token count without fetching full array
        // For now, we'll get minimal fields and compute count server-side
        const { data: booksData, error: booksError } = await this.supabase
            .from('books')
            .select('id, title, updated_at, voice_id, owner_user_id, images, total_tokens, estimated_reading_time')
            .or(userId ? `owner_user_id.is.null,owner_user_id.eq.${userId}` : 'owner_user_id.is.null')
            .order('title');

        if (booksError) throw booksError;
        if (!booksData || booksData.length === 0) return [];

        // Fetch user progress for these books
        let userProgressMap = new Map<string, any>();
        if (userId) {
            const { data: progressData } = await this.supabase
                .from('user_progress')
                .select('book_id, is_completed, updated_at')
                .eq('user_id', userId)
                .in('book_id', booksData.map(b => b.id));

            if (progressData) {
                progressData.forEach(p => {
                    userProgressMap.set(p.book_id, p);
                });
            }
        }

        // Batch fetch cover images from book_media for all books at once (single query)
        const bookIds = booksData.map(b => b.id);
        const { data: mediaData, error: mediaError } = await this.supabase
            .from('book_media')
            .select('book_id, path')
            .in('book_id', bookIds)
            .order('after_word_index');

        if (mediaError) {
            console.error('Failed to fetch book_media covers:', mediaError);
            // Continue without media covers - graceful degradation
        }

        // Build a map of book_id -> first cover path from book_media
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
            let coverPath: string | undefined;

            // 1. Try to get cover from inline images array first
            if (Array.isArray(book.images) && book.images.length > 0) {
                const firstImage = book.images[0];
                coverPath = firstImage.src || firstImage.url;
            }

            // 2. Fallback to book_media cover if no inline image
            if (!coverPath) {
                coverPath = mediaCoverMap.get(book.id);
            }

            // 3. Resolve the cover URL
            if (coverPath) {
                if (coverPath.startsWith('http')) {
                    // Already a full URL
                    coverImageUrl = coverPath;
                } else {
                    // Supabase storage path - needs signing
                    try {
                        const { data: signedData, error: signError } = await this.supabase.storage
                            .from('book-assets')
                            .createSignedUrl(coverPath, 3600);

                        if (signError) {
                            console.error(`Failed to sign cover URL for book ${book.id}:`, signError);
                        } else {
                            coverImageUrl = signedData?.signedUrl;
                        }
                    } catch (err) {
                        console.error(`Error signing cover URL for book ${book.id}:`, err);
                    }
                }
            }

            const progress = userProgressMap.get(book.id);

            return {
                id: book.id,
                title: book.title,
                coverImageUrl,
                updated_at: book.updated_at,
                voice_id: book.voice_id,
                owner_user_id: book.owner_user_id,
                totalTokens: book.total_tokens,
                estimatedReadingTime: book.estimated_reading_time,
                isRead: progress?.is_completed || false,
                lastOpenedAt: progress?.updated_at
            };
        }));

        return booksWithCovers;
    }

    async getBookById(idOrSlug: string, options: { includeContent?: boolean, includeMedia?: boolean, userId?: string } = {}): Promise<any | null> {
        const isUuid = BookRepository.isValidUuid(idOrSlug);

        const fields = ['id', 'book_key', 'title', 'origin', 'tokens', 'images', 'updated_at', 'voice_id', 'owner_user_id', 'metadata'];
        if (options.includeContent) fields.push('text');

        let query = this.supabase.from('books').select(fields.join(','));

        if (isUuid) {
            query = query.eq('id', idOrSlug);
        } else {
            query = query.eq('book_key', idOrSlug);
        }

        // Apply ownership filter: public (null) OR owned by user
        if (options.userId) {
            query = query.or(`owner_user_id.is.null,owner_user_id.eq.${options.userId}`);
        } else {
            query = query.is('owner_user_id', null);
        }

        const { data, error } = await query.single();
        if (error && error.code !== 'PGRST116') throw error;
        const bookData = data as any;
        if (!bookData) return null;

        const result = { ...bookData };

        // Resolve signed URLs for images stored in the main book record
        if (Array.isArray(result.images)) {
            result.images = await Promise.all(result.images.map(async (img: any) => {
                if (img.src && !img.src.startsWith('http')) {
                    const { data: signedData } = await this.supabase.storage
                        .from('book-assets')
                        .createSignedUrl(img.src, 3600);
                    return { ...img, src: signedData?.signedUrl || img.src };
                }
                return img;
            }));
        }

        if (options.includeMedia) {
            // 1. Fetch images from book_media
            const { data: media, error: mediaError } = await this.supabase
                .from('book_media')
                .select('*')
                .eq('book_id', bookData.id)
                .order('after_word_index');

            if (mediaError) throw mediaError;

            // 2. Fetch story metadata to see all scenes (for placeholders)
            const { data: story } = await this.supabase
                .from('stories')
                .select('scenes')
                .eq('id', bookData.id)
                .maybeSingle();

            if (story && Array.isArray(story.scenes)) {
                // Return a combined list based on scenes
                const fullImages = story.scenes.map((scene: any, index: number) => {
                    // Find actual image for this scene's word index
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
                        // Placeholder
                        return {
                            id: `placeholder-${index}`,
                            afterWordIndex: Number(scene.after_word_index),
                            caption: "AI is drawing...",
                            isPlaceholder: true,
                            src: ""
                        };
                    }
                });

                // Resolve signed URLs for each media item
                result.images = await Promise.all(fullImages.map(async img => {
                    // If path is already a full URL (legacy), use it, otherwise sign it
                    if (img.src && !img.src.startsWith('http')) {
                        const { data: signedData, error: signError } = await this.supabase.storage
                            .from('book-assets')
                            .createSignedUrl(img.src, 3600);

                        if (!signError && signedData) {
                            return { ...img, src: signedData.signedUrl };
                        }
                    }
                    return img;
                }));
            } else if (media && media.length > 0) {
                // Fallback for books without 'stories' entry: resolve signed URLs for plain book_media
                result.images = await Promise.all(media.map(async m => {
                    let finalUrl = m.path;
                    if (!m.path.startsWith('http')) {
                        const { data: signedData, error: signError } = await this.supabase.storage
                            .from('book-assets')
                            .createSignedUrl(m.path, 3600);

                        if (!signError && signedData) {
                            finalUrl = signedData.signedUrl;
                        }
                    }

                    return {
                        id: m.id,
                        afterWordIndex: Number(m.after_word_index),
                        ...(m.metadata || {}),
                        src: finalUrl,
                        isPlaceholder: false
                    };
                }));
            }
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

    async getProgress(userId: string, bookId: string) {
        if (!BookRepository.isValidUuid(bookId)) {
            return null;
        }

        const { data, error } = await this.supabase
            .from('user_progress')
            .select('*')
            .match({ user_id: userId, book_id: bookId })
            .maybeSingle();

        if (error) throw error;
        return data;
    }

    async saveProgress(userId: string, bookId: string, progress: {
        last_token_index?: number;
        last_shard_index?: number;
        total_tokens?: number;
        estimatedReadingTime?: number;
        isRead?: boolean;
        lastOpenedAt?: string;
        last_playback_time?: number;
        view_mode?: string;
        playback_speed?: number;
    }) {
        if (!BookRepository.isValidUuid(bookId)) {
            throw new Error(`Invalid book ID: ${bookId}`);
        }

        // Map frontend camelCase fields to database snake_case columns
        const { isRead, lastOpenedAt, ...rest } = progress;

        const dbProgress: any = {
            ...rest,
            user_id: userId,
            book_id: bookId,
            updated_at: new Date().toISOString()
        };

        if (isRead !== undefined) dbProgress.is_completed = isRead;
        // lastOpenedAt is usually handled by the updated_at column in the DB, 
        // but we can map it if we really need to store a separate value

        const { data, error } = await this.supabase
            .from('user_progress')
            .upsert(dbProgress, { onConflict: 'user_id,book_id' })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    private mapRowToBook(row: any): Book {
        return {
            id: row.id,
            title: row.title,
            text: row.text,
            images: row.images,
            // book_key is stored in db but Book type currently treats id as the primary identifier
            // We might want to add book_key to the Book type in core later if needed.
        };
    }
}
