import { StoryService } from "./implementations/story-service";
import type { IStoryService } from "./types";

class ServiceFactory {
    private static storyService: IStoryService;

    static getStoryService(): IStoryService {
        if (!this.storyService) {
            this.storyService = new StoryService();
        }
        return this.storyService;
    }
}

export const getStoryService = () => ServiceFactory.getStoryService();
