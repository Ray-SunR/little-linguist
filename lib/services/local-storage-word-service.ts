import type { IWordService } from "./types";
import type { WordInsight } from "../word-insight/types";

const STORAGE_KEY = "my-word-list";

export class LocalStorageWordService implements IWordService {
    async getWords(): Promise<WordInsight[]> {
        if (typeof window === "undefined") return [];

        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error("Failed to parse word list from local storage", e);
            return [];
        }
    }

    async addWord(word: WordInsight): Promise<void> {
        const words = await this.getWords();
        // Prevent duplicates based on word text (case-insensitive check maybe? keeping strict for now)
        if (words.some(w => w.word.toLowerCase() === word.word.toLowerCase())) {
            return;
        }
        const newWords = [word, ...words];
        this.saveWords(newWords);
    }

    async removeWord(wordStr: string): Promise<void> {
        const words = await this.getWords();
        const newWords = words.filter(w => w.word.toLowerCase() !== wordStr.toLowerCase());
        this.saveWords(newWords);
    }

    async hasWord(wordStr: string): Promise<boolean> {
        const words = await this.getWords();
        return words.some(w => w.word.toLowerCase() === wordStr.toLowerCase());
    }

    private saveWords(words: WordInsight[]): void {
        if (typeof window === "undefined") return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
    }
}
