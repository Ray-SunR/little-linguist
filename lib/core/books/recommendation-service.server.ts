import { SupabaseClient } from '@supabase/supabase-js';
import { AIFactory } from "../integrations/ai/factory.server";
import { BookWithCover } from './library-types';
import { LibraryService } from './library-service.server';
import { SearchService } from './search-service.server';

export class RecommendationService {
    private libraryService: LibraryService;
    private searchService: SearchService;

    constructor(private supabase: SupabaseClient) {
        this.libraryService = new LibraryService(supabase);
        this.searchService = new SearchService(supabase);
    }

    /**
     * Recommends books for a child based on their interests.
     * STRICTLY recommends PUBLIC books only via match_books RPC.
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
        const { data: child, error: childError } = await this.supabase
            .from('children')
            .select('interests')
            .eq('id', childId)
            .single();

        if (childError || !child) {
            throw new Error(`Failed to fetch child interests: ${childError?.message || 'Child not found'}`);
        }

        const interests = child.interests || [];
        if (interests.length === 0) {
            return [];
        }

        const interestText = `Interests: ${interests.join(', ')}.`;

        const interestEmbedding = await AIFactory.getProvider().generateEmbedding(interestText);

        const { minGrade, maxGrade } = options.level ? this.searchService.mapLevelToGradeRange(options.level) : { minGrade: null, maxGrade: null };
        const { minDuration, maxDuration } = options.duration ? this.searchService.mapDurationToRange(options.duration) : { minDuration: null, maxDuration: null };

        const { data, error } = await this.supabase.rpc('match_books', {
            query_embedding: interestEmbedding,
            match_threshold: options.matchThreshold ?? 0.10,
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

    /**
     * Combines semantic recommendations with full UI metadata (covers, progress).
     * Falls back to newest books if no recommendations are found.
     * Persists the mission for the day to ensure consistency.
     */
    async getRecommendedBooksWithCovers(
        userId: string,
        childId: string,
        limit: number = 3
    ): Promise<BookWithCover[]> {
        try {
            // 0. Check for persisted daily mission
            const { data: child, error: childError } = await this.supabase
                .from('children')
                .select('daily_mission')
                .eq('id', childId)
                .single();

            const today = new Date().toISOString().split('T')[0];

            if (!childError && child?.daily_mission?.date === today && Array.isArray(child.daily_mission.book_ids) && child.daily_mission.book_ids.length > 0) {
                // Return persisted mission books
                const persistedBooks = await this.libraryService.getAvailableBooksWithCovers(
                    userId,
                    childId,
                    { ids: child.daily_mission.book_ids, limit: child.daily_mission.book_ids.length }
                );
                
                // Sort to maintain original order if possible
                return persistedBooks.sort((a, b) => {
                    const indexA = child.daily_mission.book_ids.indexOf(a.id);
                    const indexB = child.daily_mission.book_ids.indexOf(b.id);
                    return indexA - indexB;
                });
            }

            // 1. Get a larger pool of semantic recommendations
            const recommendations = await this.recommendBooksForChild(childId, { limit: 12 });
            const recommendedIds = recommendations.map(r => r.id);

            // 2. Fetch full metadata including covers and progress
            const books = await this.libraryService.getAvailableBooksWithCovers(
                userId,
                childId,
                recommendedIds.length > 0 
                    ? { ids: recommendedIds, limit: 12 } 
                    : { limit: 12, sortBy: 'newest' }
            );

            // 3. Prioritize Unread -> Read
            const unread = books.filter(b => !b.isRead);
            const read = books.filter(b => b.isRead);

            // Sort based on original semantic relevance
            const sortByRelevance = (a: BookWithCover, b: BookWithCover) => {
                const indexA = recommendedIds.indexOf(a.id);
                const indexB = recommendedIds.indexOf(b.id);
                return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
            };

            const sortedUnread = unread.sort(sortByRelevance);
            const sortedRead = read.sort(sortByRelevance);

            // Construct final list: Start with unread, fill with read if needed
            let finalSelection = [...sortedUnread];
            if (finalSelection.length < limit) {
                finalSelection = [...finalSelection, ...sortedRead].slice(0, limit);
            } else {
                finalSelection = finalSelection.slice(0, limit);
            }

            // Fallback: If still empty, get anything newest
            if (finalSelection.length === 0) {
                finalSelection = await this.libraryService.getAvailableBooksWithCovers(userId, childId, { limit, sortBy: 'newest' });
            }

            // 4. Persist the new selection for today
            if (finalSelection.length > 0) {
                await this.supabase.from('children').update({
                    daily_mission: {
                        date: today,
                        book_ids: finalSelection.map(b => b.id)
                    }
                }).eq('id', childId);
            }

            return finalSelection;
        } catch (err) {
            console.error('[RecommendationService.getRecommendedBooksWithCovers] Error:', err);
            return await this.libraryService.getAvailableBooksWithCovers(userId, childId, { limit, sortBy: 'newest' });
        }
    }
}
