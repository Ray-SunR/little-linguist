import { PollyNarrationService } from "./polly-service.server";
import { MockNarrationService } from "./implementations/mock-provider.server";
import type { INarrationService } from "./server-types";

export class NarrationFactory {
    static getProvider(): INarrationService {
        if (process.env.MOCK_AI_SERVICES === "false") {
            return new PollyNarrationService();
        }
        console.log("[NarrationFactory] Using MockNarrationService (Default)");
        return new MockNarrationService();
    }
}
