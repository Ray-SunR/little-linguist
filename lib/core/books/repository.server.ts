import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Book } from '../types';
import { BookFilters, BookWithCover, isValidUuid } from './library-types';
import { LibraryService } from './library-service.server';
import { SearchService } from './search-service.server';
import { RecommendationService } from './recommendation-service.server';
import { ProgressRepository } from './progress-repository.server';

/**
 * Server-only repository for Book data.
 * This should ONLY be used in API routes or Server Components.
 */
export class BookRepository {
    private supabase: SupabaseClient;

    constructor(supabaseClient?: SupabaseClient) {
        this.supabase = supabaseClient || createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
    }

    static isValidUuid(id: string): boolean {
        return isValidUuid(id);
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
     */
    async getAvailableBooksWithCovers(
        userId: string | undefined,
        childId: string | undefined,
        filters: BookFilters = {}
    ): Promise<BookWithCover[]> {
        const service = new LibraryService(this.supabase);
        return service.getAvailableBooksWithCovers(userId, childId, filters);
    }

    async getBookById(idOrSlug: string, options: {
        includeTokens?: boolean,
        includeContent?: boolean,
        includeMedia?: boolean,
        includeAudio?: boolean,
        userId?: string
    } = {}): Promise<any | null> {
        const service = new LibraryService(this.supabase);
        return service.getBookById(idOrSlug, options);
    }

    async createBook(book: Partial<Book>): Promise<Book> {
        const { data, error } = await this.supabase
            .from('books')
            .insert(book)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async getNarrationChunks(bookId: string, voiceId?: string) {
        const service = new LibraryService(this.supabase);
        return service.getNarrationChunks(bookId, voiceId);
    }

    async saveNarrationChunk(payload: any) {
        const service = new LibraryService(this.supabase);
        return service.saveNarrationChunk(payload);
    }

    async getProgress(childId: string, bookId: string) {
        const repo = new ProgressRepository(this.supabase);
        return repo.getProgress(childId, bookId);
    }

    async saveProgress(childId: string, bookId: string, progress: {
        last_token_index?: number;
        last_shard_index?: number;
        is_completed?: boolean;
        total_read_seconds?: number;
        playback_speed?: number;
    }) {
        const repo = new ProgressRepository(this.supabase);
        return repo.saveProgress(childId, bookId, progress);
    }

    async toggleFavorite(childId: string, bookId: string, isFavorite: boolean) {
        const repo = new ProgressRepository(this.supabase);
        return repo.toggleFavorite(childId, bookId, isFavorite);
    }

    /**
     * Generates an embedding for a book.
     */
    async generateAndStoreBookEmbedding(bookId: string): Promise<number[]> {
        const service = new SearchService(this.supabase);
        return service.generateAndStoreBookEmbedding(bookId);
    }

    /**
     * Performs a semantic search for books based on a text query.
     */
    async searchBooks(query: string, options: {
        matchThreshold?: number,
        limit?: number,
        offset?: number,
        level?: string,
        category?: string,
        isNonFiction?: boolean,
        duration?: string
    } = {}): Promise<any[]> {
        const service = new SearchService(this.supabase);
        return service.searchBooks(query, options);
    }

    /**
     * Recommends books for a child based on their interests.
     */
    async recommendBooksForChild(childId: string, options: {
        matchThreshold?: number,
        limit?: number,
        offset?: number,
        level?: string,
        category?: string,
        isNonFiction?: boolean,
        duration?: string
    } = {}): Promise<any[]> {
        const service = new RecommendationService(this.supabase);
        return service.recommendBooksForChild(childId, options);
    }

    /**
     * Combines semantic recommendations with full UI metadata.
     */
    async getRecommendedBooksWithCovers(
        userId: string,
        childId: string,
        limit: number = 3
    ): Promise<BookWithCover[]> {
        const service = new RecommendationService(this.supabase);
        return service.getRecommendedBooksWithCovers(userId, childId, limit);
    }
}
