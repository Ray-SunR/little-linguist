import { LocalStorageWordService } from "./local-storage-word-service";
import { GeminiStoryService } from "./gemini-story-service";
import type { IWordService, IStoryService } from "./types";

class ServiceFactory {
    private static wordService: IWordService;
    private static storyService: IStoryService;

    static getWordService(): IWordService {
        if (!this.wordService) {
            this.wordService = new LocalStorageWordService();
        }
        return this.wordService;
    }

    static getStoryService(): IStoryService {
        if (!this.storyService) {
            this.storyService = new GeminiStoryService();
        }
        return this.storyService;
    }
}

export const wordService = ServiceFactory.getWordService();
export const storyService = ServiceFactory.getStoryService();
