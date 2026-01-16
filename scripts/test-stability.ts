import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function test() {
    const client = new BedrockRuntimeClient({
        region: "us-west-2",
        credentials: {
            accessKeyId: process.env.POLLY_ACCESS_KEY_ID!,
            secretAccessKey: process.env.POLLY_SECRET_ACCESS_KEY!,
        },
    });

    const body = {
        prompt: "A beautiful high-quality digital illustration of a superhero with a red cape flying over a city, comic book style.",
        mode: "text-to-image",
        aspect_ratio: "1:1",
        output_format: "webp"
    };

    console.log("Sending request to Stability SD3.5 Large...");
    
    try {
        const command = new InvokeModelCommand({
            modelId: "stability.sd3-5-large-v1:0",
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify(body),
        });

        const response = await client.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        console.log("Success! Images count:", responseBody.images?.length);
    } catch (err: any) {
        console.error("Failed!");
        console.error("Status Code:", err.$metadata?.httpStatusCode);
        console.error("Message:", err.message);
    }
}

test();
