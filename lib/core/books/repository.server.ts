import { createClient } from '@supabase/supabase-js';
import { Book } from '../types';

// Types for optimized library fetching
// ~580 tokens reads in 100s = 348 tokens/min. Rounded to 350 for simplicity.
const TOKENS_PER_MINUTE = 350;

interface BookFilters {
    limit?: number;
    offset?: number;
    sortBy?: string;
    level?: string;
    origin?: string;
    is_nonfiction?: boolean;
    category?: string;
    is_favorite?: boolean;
    only_personal?: boolean;
    duration?: string;
}

interface BookWithCover {
    id: string;
    title: string;
    coverImageUrl?: string;
    coverPath?: string;
    updated_at?: string;
    voice_id?: string;
    owner_user_id?: string | null;
    child_id?: string | null;
    totalTokens?: number;
    estimatedReadingTime?: number;
    isRead?: boolean;
    lastOpenedAt?: string;
    isFavorite?: boolean;
    level?: string;
    isNonFiction?: boolean;
    origin?: string;
    progress?: {
        last_token_index?: number;
        is_completed?: boolean;
        total_read_seconds?: number;
        last_read_at?: string;
    };
}

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
    async getAvailableBooksWithCovers(
        userId: string | undefined,
        childId: string | undefined,
        filters: BookFilters = {}
    ): Promise<BookWithCover[]> {
        // PERFORMANCE: Single Query Strategy (as per user request)
        // Always join with `child_books` when childId is present to get progress/favorites in one go.

        const joinType = (filters?.is_favorite) ? 'inner' : 'left';

        // Base fields
        let selectFields = 'id, title, updated_at, voice_id, owner_user_id, child_id, total_tokens, estimated_reading_time, cover_image_path, level, is_nonfiction, origin';

        // Add join if childId is present
        if (childId) {
            selectFields += `, child_books!${joinType}(child_id, is_favorite, is_completed, last_token_index)`;
        }

        let query = this.supabase
            .from('books')
            .select(selectFields, { count: 'exact' });

        // Visibility logic:
        // 1. Personal books only: Owner matches user AND (child_id matches childId OR is null for shared)
        // 2. All books: (Owner is null) OR (Owner matches user)
        if (filters?.only_personal) {
            if (userId) {
                // Personal Scope
                if (childId) {
                    // Logic: Must be owned by user.
                    // AND: (child_id IS NULL [Household/Shared]) OR (child_id EQ childId [Private])
                    query = query.eq('owner_user_id', userId)
                        .or(`child_id.is.null,child_id.eq.${childId}`);
                } else {
                    // Just user owned (e.g. parent view?)
                    query = query.eq('owner_user_id', userId);
                }
            } else {
                return [];
            }
        } else {
            // Discovery Scope (Personal + Public)
            if (userId) {
                if (childId) {
                    // Public (null owner) OR (Personal Owned AND (Shared OR Private))
                    // Note: child_id here refers to books.child_id (private book ownership)
                    query = query.or(`owner_user_id.is.null,and(owner_user_id.eq.${userId},or(child_id.is.null,child_id.eq.${childId}))`);
                } else {
                    query = query.or(`owner_user_id.is.null,owner_user_id.eq.${userId}`);
                }
            } else {
                query = query.is('owner_user_id', null);
            }
        }

        // Apply filters on the joined table if necessary
        if (childId) {
            // NOTE: We do NOT apply .eq('child_books.child_id', childId) here because in PostgREST,
            // filtering on a joined table's column restricts the PARENT rows (effectively an INNER JOIN),
            // which hides books that haven't been started yet.
            //
            // Instead, we rely on RLS to limit `child_books` to the user's family, 
            // and we filter the array in memory below to pick the specific child's progress.

            // EXCEPT: If we are specifically filtering by favorite, we DO want an inner join behavior
            // because we only want books that ARE favorites.
            if (filters.is_favorite) {
                // For favorites, we want to ensure the specific child marked it.
                // This will filter parent rows to only those with a matching child_books entry where is_favorite=true
                query = query.eq('child_books.child_id', childId);
                query = query.eq('child_books.is_favorite', true);
            }
        }

        // Apply other book filters
        // NOTE: Skip these filters for personal books, as user-generated content doesn't have level/category/etc. metadata
        if (filters && !filters.only_personal) {
            const f = filters;
            if (f.level) {
                switch (f.level) {
                    case 'toddler': query = query.lte('min_grade', -1); break;
                    case 'preschool': query = query.eq('min_grade', 0); break;
                    case 'elementary': query = query.gte('min_grade', 1).lt('min_grade', 3); break;
                    case 'intermediate': query = query.gte('min_grade', 3); break;
                    default: query = query.eq('level', f.level);
                }
            }

            if (f.duration) {
                switch (f.duration) {
                    case 'short': query = query.lt('estimated_reading_time', 5); break;
                    case 'medium': query = query.gte('estimated_reading_time', 5).lte('estimated_reading_time', 10); break;
                    case 'long': query = query.gt('estimated_reading_time', 10); break;
                }
            }

            if (f.origin) query = query.eq('origin', f.origin);
            if (f.is_nonfiction !== undefined) query = query.eq('is_nonfiction', f.is_nonfiction);
            if (f.category && f.category !== 'all') {
                query = query.contains('categories', [f.category]);
            }
        }

        // Apply sorting
        const sortBy = filters.sortBy || 'newest';
        if (sortBy === 'newest') {
            query = query.order('updated_at', { ascending: false });
        } else if (sortBy === 'alphabetical') {
            query = query.order('title', { ascending: true });
        } else if (sortBy === 'reading_time') {
            query = query.order('estimated_reading_time', { ascending: true });
        }
        query = query.order('title');

        if (filters.limit) {
            const offset = filters.offset || 0;
            query = query.range(offset, offset + filters.limit - 1);
        }

        const { data: booksData, error: booksError } = await query.throwOnError();
        if (!booksData || booksData.length === 0) return [];

        // Batch fetch signed URLs
        const pathsToSign: string[] = [];
        const bookMap = new Map<string, any>();

        booksData.forEach((book: any) => {
            if (book.cover_image_path) {
                if (!book.cover_image_path.startsWith('http')) {
                    pathsToSign.push(book.cover_image_path);
                }
            }
            bookMap.set(book.id, book);
        });

        // Also fetch any media covers if cover_image_path is missing
        const booksMissingCover = booksData.filter((b: any) => !b.cover_image_path);
        const mediaCoverMap = new Map<string, string>();

        if (booksMissingCover.length > 0) {
            const bookIds = booksMissingCover.map((b: any) => b.id);
            const { data: mediaData, error: mediaError } = await this.supabase
                .from('book_media')
                .select('book_id, path')
                .eq('media_type', 'image')
                .in('book_id', bookIds)
                .order('after_word_index')
                .order('path');

            if (mediaError) {
                console.error('Error fetching media covers:', mediaError);
            }

            if (mediaData) {
                mediaData.forEach((media: any) => {
                    if (!mediaCoverMap.has(media.book_id) && media.path) {
                        mediaCoverMap.set(media.book_id, media.path);
                        if (!media.path.startsWith('http')) {
                            pathsToSign.push(media.path);
                        }
                    }
                });
            }
        }

        // Execute Batch Sign
        const signedUrlMap: Record<string, string> = {};
        if (pathsToSign.length > 0) {
            const { data: signedData, error: signedError } = await this.supabase
                .storage
                .from('book-assets')
                .createSignedUrls(pathsToSign, 60 * 60);

            if (signedError) {
                console.error('Error batch signing URLs:', signedError);
            }

            if (signedData) {
                signedData.forEach(item => {
                    if (item.path && item.signedUrl) {
                        signedUrlMap[item.path] = item.signedUrl;
                    }
                });
            }
        }

        // Map final results
        return booksData.map((book: any) => {
            const coverPath = book.cover_image_path || mediaCoverMap.get(book.id);
            let coverImageUrl = undefined;

            if (coverPath) {
                if (coverPath.startsWith('http')) {
                    coverImageUrl = coverPath;
                } else {
                    coverImageUrl = signedUrlMap[coverPath];
                }
            }

            // JOIN RESULT: `child_books` will be an array because of the one-to-many relationship (Book -> ChildBooks)
            // Even if we use `child_books!inner`, PostgREST returns it as an array.
            let progress = null;
            if (book.child_books) {
                const pArray = Array.isArray(book.child_books) ? book.child_books : [book.child_books];
                if (childId) {
                    // Find the progress entry SPECIFICALLY for this child (since RLS might return siblings' data too)
                    progress = pArray.find((p: any) => p.child_id === childId);
                } else {
                    // Fallback (shouldn't really happen in this filtered context, but safe default)
                    progress = pArray[0];
                }
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
                estimatedReadingTime: book.estimated_reading_time ?? (book.total_tokens ? Math.ceil(book.total_tokens / TOKENS_PER_MINUTE) : undefined),
                isRead: progress?.is_completed || false,
                isFavorite: progress?.is_favorite || false,
                level: book.level,
                isNonFiction: book.is_nonfiction,
                origin: book.origin,
                progress: progress ? {
                    last_token_index: progress.last_token_index,
                    is_completed: progress.is_completed
                } : undefined
            };
        });
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
            .from('child_books')
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
            .from('child_books')
            .upsert(dbProgress, { onConflict: 'child_id,book_id' })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async toggleFavorite(childId: string, bookId: string, isFavorite: boolean) {
        if (!BookRepository.isValidUuid(bookId)) {
            throw new Error(`Invalid book ID: ${bookId}`);
        }

        const { data, error } = await this.supabase
            .from('child_books')
            .upsert({
                child_id: childId,
                book_id: bookId,
                is_favorite: isFavorite
            }, { onConflict: 'child_id,book_id' })
            .select()
            .single();

        if (error) throw error;
        return data;
    }
}
