import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

export class BedrockEmbeddingService {
    private client: BedrockRuntimeClient;
    private region: string;

    constructor() {
        this.region = process.env.POLLY_REGION || "us-west-2";
        this.client = new BedrockRuntimeClient({
            region: this.region,
            credentials: {
                accessKeyId: process.env.POLLY_ACCESS_KEY_ID!,
                secretAccessKey: process.env.POLLY_SECRET_ACCESS_KEY!,
            },
        });
    }

    /**
     * Generates a 1024-dimension embedding using Amazon Titan Text Embeddings v2.
     * @param text The input text to embed.
     * @returns A promise that resolves to an array of 1024 numbers.
     */
    async generateEmbedding(text: string): Promise<number[]> {
        const body = {
            inputText: text,
            dimensions: 1024,
            normalize: true
        };

        const command = new InvokeModelCommand({
            modelId: "amazon.titan-embed-text-v2:0",
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify(body),
        });

        try {
            const response = await this.client.send(command);
            const responseBody = JSON.parse(new TextDecoder().decode(response.body));
            
            if (!responseBody.embedding) {
                throw new Error("Invalid response from Bedrock: Missing embedding field");
            }

            return responseBody.embedding;
        } catch (error) {
            console.error("Bedrock Embedding Service error:", error);
            throw new Error(`Failed to generate embedding: ${(error as Error).message}`);
        }
    }
}
