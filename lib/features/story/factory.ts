import { LocalStorageWordService } from "@/lib/features/word-insight";
import { StoryService } from "./story-service";
import type { IStoryService } from "./types";
import type { IWordService } from "@/lib/features/word-insight";

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
            this.storyService = new StoryService();
        }
        return this.storyService;
    }
}

export const getWordService = () => ServiceFactory.getWordService();
export const getStoryService = () => ServiceFactory.getStoryService();
