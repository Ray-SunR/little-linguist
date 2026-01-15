import type { IWordService, WordServiceOptions } from "../types";
import type { SavedWord } from "../provider";
import type { WordInsight } from "../types";

export class DatabaseWordService implements IWordService {
    async getWords(childId?: string, options: WordServiceOptions = {}): Promise<{ words: SavedWord[], total: number }> {
        try {
            const url = new URL('/api/words', window.location.origin);
            if (childId) url.searchParams.append('childId', childId);
            if (options.limit !== undefined) url.searchParams.append('limit', options.limit.toString());
            if (options.offset !== undefined) url.searchParams.append('offset', options.offset.toString());
            if (options.light !== undefined) url.searchParams.append('light', options.light.toString());
            if (options.status) url.searchParams.append('status', options.status);
            if (options.search) url.searchParams.append('search', options.search);
            if (options.sortBy) url.searchParams.append('sortBy', options.sortBy);
            if (options.sortOrder) url.searchParams.append('sortOrder', options.sortOrder);
            if (options.startDate) url.searchParams.append('startDate', options.startDate);
            if (options.endDate) url.searchParams.append('endDate', options.endDate);

            const response = await fetch(url.toString());
            const data = await response.json();
            return {
                words: data.words || [],
                total: data.pagination?.total ?? data.total ?? 0
            };
        } catch (e) {
            console.error("DatabaseWordService getWords failed:", e);
            return { words: [], total: 0 };
        }
    }

    async addWord(word: WordInsight, bookId?: string, childId?: string): Promise<void> {
        try {
            const response = await fetch('/api/words', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ word: word.word, bookId, childId, insight: word })
            });
            if (!response.ok) throw new Error('Failed to add word');
        } catch (e) {
            console.error("DatabaseWordService addWord failed:", e);
        }
    }

    async removeWord(wordStr: string, bookId?: string, childId?: string): Promise<void> {
        try {
            const url = new URL('/api/words', window.location.origin);
            url.searchParams.append('word', wordStr);
            if (bookId) {
                url.searchParams.append('bookId', bookId);
            }
            if (childId) {
                url.searchParams.append('childId', childId);
            }

            const response = await fetch(url.toString(), {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Failed to remove word');
        } catch (e) {
            console.error("DatabaseWordService removeWord failed:", e);
        }
    }

    async hasWord(wordStr: string, bookId?: string, childId?: string): Promise<boolean> {
        const result = await this.getWords(childId, { light: true, limit: 1000 });
        const words = result.words || [];
        return words.some((w: any) => {
            const wordMatch = w.word.toLowerCase() === wordStr.toLowerCase();
            if (bookId) {
                return wordMatch && w.bookId === bookId;
            }
            return wordMatch;
        });
    }
}
