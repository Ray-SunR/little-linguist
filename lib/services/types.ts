import type { WordInsight } from "../word-insight/types";

export interface IWordService {
    getWords(): Promise<WordInsight[]>;
    addWord(word: WordInsight): Promise<void>;
    removeWord(wordStr: string): Promise<void>;
    hasWord(wordStr: string): Promise<boolean>;
}

export type UserProfile = {
    name: string;
    age: number;
    gender: 'boy' | 'girl' | 'other';
    avatarUrl?: string;
};

export type Story = {
    id: string;
    title: string;
    content: string;
    createdAt: number;
    wordsUsed: string[];
    userProfile: UserProfile;
    coverImageUrl?: string;
};

export interface IStoryService {
    generateStory(words: string[], userProfile: UserProfile): Promise<Story>;
    saveStory(story: Story): Promise<void>;
    getStories(): Promise<Story[]>;
    getStory(id: string): Promise<Story | null>;
    deleteStory(id: string): Promise<void>;
}
