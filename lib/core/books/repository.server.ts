import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from "@/lib/supabase/server";
import { AuditService, AuditAction, EntityType } from "@/lib/features/audit/audit-service.server";
import { Book } from '../types';

// Types for optimized library fetching
// ~580 tokens reads in 100s = 348 tokens/min. Rounded to 350 for simplicity.
const TOKENS_PER_MINUTE = 350;

interface BookFilters {
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    level?: string;
    origin?: string;
    is_nonfiction?: boolean;
    category?: string;
    is_favorite?: boolean;
    only_personal?: boolean;
    only_public?: boolean;
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
    description?: string;
    keywords?: string[];
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
            query = query.is('owner_user_id', null).limit(6);
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

        // --- RPC STRATEGY (Server-Side Sort & Optimized Join) ---
        // We now ALWAYS use the RPC for the library view to ensure consistent sorting
        // and avoid PostgREST limitations with one-to-many relationships.
        const rpcParams = {
            p_child_id: childId || null,
            p_filter_owner_id: userId || null,
            p_limit: filters.limit || 100,
            p_offset: filters.offset || 0,
            p_sort_by: filters.sortBy || 'last_opened',
            p_sort_asc: filters.sortOrder === 'asc',
            p_only_personal: !!filters.only_personal,
            p_filter_level: filters.level || null,
            p_filter_origin: filters.origin || null,
            p_filter_is_favorite: filters.is_favorite || null,
            p_filter_category: filters.category && filters.category !== 'all' ? filters.category : null,
            p_filter_duration: filters.duration || null,
            p_filter_is_nonfiction: filters.is_nonfiction ?? null,
            p_only_public: !!filters.only_public
        };

        // GUEST LIMIT: Enforce 6 books max for unauthenticated users
        if (!userId) {
            rpcParams.p_limit = 6;
            rpcParams.p_offset = 0;
        }

        const { data, error } = await this.supabase
            .rpc('get_library_books', rpcParams);

        if (error) {
            console.error('RPC Error in getAvailableBooksWithCovers:', error);
            throw error;
        }

        let booksData = data || [];

        if (booksData.length === 0) return [];

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
        const mappedBooks = booksData.map((book: any) => {
            const coverPath = book.cover_image_path || mediaCoverMap.get(book.id);
            let coverImageUrl = undefined;

            if (coverPath) {
                if (coverPath.startsWith('http')) {
                    coverImageUrl = coverPath;
                } else {
                    coverImageUrl = signedUrlMap[coverPath];
                }
            }

            // Normalization: RPC results use a flat structure for progress fields
            let progress = null;

            if (book.progress_last_read_at || book.progress_is_completed || book.progress_is_favorite) {
                progress = {
                    last_token_index: book.progress_last_token_index,
                    is_completed: book.progress_is_completed,
                    is_favorite: book.progress_is_favorite,
                    last_read_at: book.progress_last_read_at
                };
            }

            return {
                id: book.id,
                title: book.title,
                coverImageUrl,
                coverPath,
                updated_at: book.updated_at,
                createdAt: book.created_at,
                voice_id: book.voice_id,
                owner_user_id: book.owner_user_id,
                child_id: book.child_id,
                totalTokens: book.total_tokens,
                estimatedReadingTime: book.estimated_reading_time ?? (book.total_tokens ? Math.ceil(book.total_tokens / TOKENS_PER_MINUTE) : undefined),
                isRead: progress?.is_completed || false,
                isFavorite: progress?.is_favorite || false,
                lastOpenedAt: progress?.last_read_at,
                level: book.level,
                isNonFiction: book.is_nonfiction,
                origin: book.origin,
                description: book.description,
                keywords: book.keywords,
                progress: progress ? {
                    last_token_index: progress.last_token_index,
                    is_completed: progress.is_completed,
                    last_read_at: progress.last_read_at
                } : undefined
            };
        });

        return mappedBooks;
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
        const fields = ['id', 'book_key', 'title', 'origin', 'updated_at', 'voice_id', 'owner_user_id', 'child_id', 'metadata', 'total_tokens', 'cover_image_path', 'description', 'keywords'];
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

            // V2+ Schema: Sections live in book metadata
            // V1 Schema: Sections live in stories table
            let sections = [];
            const metadata = bookMetadata.metadata || {};
            if (bookMetadata.schema_version >= 2 && (Array.isArray(metadata.sections) || Array.isArray(metadata.scenes))) {
                sections = metadata.sections || metadata.scenes;
            } else {
                const { data: story } = await this.supabase
                    .from('stories')
                    .select('sections')
                    .eq('id', bookMetadata.id)
                    .maybeSingle();
                if (story && Array.isArray(story?.sections)) {
                    sections = story.sections;
                }
            }

            if (sections.length > 0) {
                const fullImages = sections.map((section: any, index: number) => {
                    const actualMedia = media?.find(m => Number(m.after_word_index) === Number(section.after_word_index));
                    if (actualMedia) {
                        return {
                            id: actualMedia.id,
                            afterWordIndex: Number(actualMedia.after_word_index),
                            ...(actualMedia.metadata || {}),
                            src: actualMedia.path,
                            isPlaceholder: false
                        };
                    } else {
                        // Only create a placeholder if there is a meaningful image prompt
                        // Ignored if prompt is missing, empty, or just contains the [1] character marker
                        const hasPrompt = section.image_prompt &&
                            section.image_prompt.trim() !== "" &&
                            section.image_prompt.trim() !== "[1]";

                        if (hasPrompt) {
                            return {
                                id: `placeholder-${index}`,
                                afterWordIndex: Number(section.after_word_index),
                                caption: section.image_status === 'failed' ? "Generation failed" : "AI is drawing...",
                                isPlaceholder: true,
                                src: "",
                                prompt: section.image_prompt,
                                sectionIndex: index,
                                status: section.image_status || 'pending',
                                retryCount: section.retry_count || 0,
                                errorMessage: section.error_message
                            };
                        }
                        return null;
                    }
                }).filter(Boolean); // Remove nulls (sections without images)

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

        // Audit: Book Favorited/Unfavorited
        await AuditService.log({
            action: isFavorite ? AuditAction.BOOK_FAVORITED : AuditAction.BOOK_UNFAVORITED,
            entityType: EntityType.BOOK,
            entityId: bookId,
            details: { childId }
        });

        return data;
    }
}
