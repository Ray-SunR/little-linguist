import { SupabaseClient } from '@supabase/supabase-js';
import { AIFactory } from "../integrations/ai/factory.server";

export class SearchService {
    constructor(private supabase: SupabaseClient) {}

    /**
     * Generates an embedding for a book based on its title, description, and keywords,
     * and stores it in the database.
     */
    async generateAndStoreBookEmbedding(bookId: string): Promise<number[]> {
        const { data: book, error: fetchError } = await this.supabase
            .from('books')
            .select('title, description, keywords')
            .eq('id', bookId)
            .single();

        if (fetchError || !book) {
            throw new Error(`Failed to fetch book for embedding: ${fetchError?.message || 'Book not found'}`);
        }

        const description = book.description || '';
        const keywords = book.keywords || [];

        const embeddingText = `Title: ${book.title}. Description: ${description}. Keywords: ${keywords.join(', ')}.`;

        const embedding = await AIFactory.getProvider().generateEmbedding(embeddingText);

        const { error: updateError } = await this.supabase
            .from('books')
            .update({ embedding })
            .eq('id', bookId);

        if (updateError) {
            throw new Error(`Failed to store book embedding: ${updateError.message}`);
        }

        return embedding;
    }

    public mapLevelToGradeRange(level: string): { minGrade: number | null, maxGrade: number | null } {
        let minGrade: number | null = null;
        let maxGrade: number | null = null;
        switch (level.toLowerCase()) {
            case 'toddler':
                minGrade = null;
                maxGrade = -1;
                break;
            case 'preschool':
                minGrade = 0;
                maxGrade = 0;
                break;
            case 'elementary':
                minGrade = 1;
                maxGrade = 2;
                break;
            case 'intermediate':
                minGrade = 3;
                maxGrade = null;
                break;
        }
        return { minGrade, maxGrade };
    }

    public mapDurationToRange(duration: string): { minDuration: number | null, maxDuration: number | null } {
        let minDuration: number | null = null;
        let maxDuration: number | null = null;
        switch (duration) {
            case 'short': // < 5m
                maxDuration = 4;
                break;
            case 'medium': // 5-10m
                minDuration = 5;
                maxDuration = 10;
                break;
            case 'long': // > 10m
                minDuration = 11;
                break;
        }
        return { minDuration, maxDuration };
    }

    /**
     * Performs a semantic search for books based on a text query.
     * STRICTLY searches PUBLIC books only via match_books RPC.
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
        const queryEmbedding = await AIFactory.getProvider().generateEmbedding(query);

        const { minGrade, maxGrade } = options.level ? this.mapLevelToGradeRange(options.level) : { minGrade: null, maxGrade: null };
        const { minDuration, maxDuration } = options.duration ? this.mapDurationToRange(options.duration) : { minDuration: null, maxDuration: null };

        const { data, error } = await this.supabase.rpc('match_books', {
            query_embedding: queryEmbedding,
            match_threshold: options.matchThreshold ?? 0.05,
            match_count: options.limit ?? 20,
            match_offset: options.offset ?? 0,
            filter_min_grade: minGrade,
            filter_max_grade: maxGrade,
            filter_category: options.category && options.category !== 'all' ? options.category : null,
            filter_is_nonfiction: options.isNonFiction ?? null,
            filter_min_duration: minDuration,
            filter_max_duration: maxDuration
        });

        if (error) throw error;
        return data || [];
    }
}
