import { BedrockClient, ListInferenceProfilesCommand, ListFoundationModelsCommand } from "@aws-sdk/client-bedrock";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function list() {
    const client = new BedrockClient({
        region: "us-west-2",
        credentials: {
            accessKeyId: process.env.POLLY_ACCESS_KEY_ID!,
            secretAccessKey: process.env.POLLY_SECRET_ACCESS_KEY!,
        },
    });

    try {
        console.log("Listing Foundation Models (Stability)...");
        const models = await client.send(new ListFoundationModelsCommand({
            byProvider: "stability"
        }));
        console.log("Models:", JSON.stringify(models.modelSummaries?.map(m => m.modelId), null, 2));

        console.log("\nListing Inference Profiles...");
        const profiles = await client.send(new ListInferenceProfilesCommand({}));
        console.log("Profiles:", JSON.stringify(profiles.inferenceProfileSummaries?.map(p => ({ id: p.inferenceProfileId, name: p.inferenceProfileName })), null, 2));
    } catch (err: any) {
        console.error("Error:", err.message);
    }
}

list();
