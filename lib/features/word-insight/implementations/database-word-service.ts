import type { IWordService, WordInsight } from "../types";

export class DatabaseWordService implements IWordService {
    async getWords(): Promise<WordInsight[]> {
        try {
            const response = await fetch('/api/words');
            if (!response.ok) throw new Error('Failed to fetch words');
            return await response.json();
        } catch (e) {
            console.error("DatabaseWordService details fetch failed:", e);
            return [];
        }
    }

    async addWord(word: WordInsight, bookId?: string): Promise<void> {
        try {
            const response = await fetch('/api/words', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ word: word.word, bookId, insight: word })
            });
            if (!response.ok) throw new Error('Failed to add word');
        } catch (e) {
            console.error("DatabaseWordService addWord failed:", e);
        }
    }

    async removeWord(wordStr: string, bookId?: string): Promise<void> {
        try {
            const url = new URL('/api/words', window.location.origin);
            url.searchParams.append('word', wordStr);
            if (bookId) {
                url.searchParams.append('bookId', bookId);
            }

            const response = await fetch(url.toString(), {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Failed to remove word');
        } catch (e) {
            console.error("DatabaseWordService removeWord failed:", e);
        }
    }

    async hasWord(wordStr: string, bookId?: string): Promise<boolean> {
        // This is a bit inefficient as it fetches all words. 
        // In a real app, we might want a specific API for this or local caching.
        // For now, we'll keep it simple to match IWordService expectations.
        const words = await this.getWords();
        return words.some(w => {
            const wordMatch = w.word.toLowerCase() === wordStr.toLowerCase();
            if (bookId) {
                return wordMatch && (w as any).bookId === bookId;
            }
            return wordMatch;
        });
    }
}
