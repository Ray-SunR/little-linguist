
import { AuditService, AuditAction, EntityType } from "../lib/features/audit/audit-service.server";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function testStoryAudit() {
    console.log("Testing Story Audit Logging...");

    try {
        await AuditService.log({
            action: AuditAction.STORY_STARTED,
            entityType: EntityType.STORY,
            userId: "f6e5e1cf-ab1e-4c7a-b4ef-b0afff7ec61c", // Use the ID from user's screenshot
            identityKey: "f6e5e1cf-ab1e-4c7a-b4ef-b0afff7ec61c",
            details: {
                test: true,
                message: "Manual test for story.started"
            }
        });
        console.log("Log call finished. Check database.");
    } catch (e) {
        console.error("Test failed:", e);
    }
}

testStoryAudit();
