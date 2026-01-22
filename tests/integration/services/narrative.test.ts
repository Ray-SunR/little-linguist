import { describe, it, expect, vi } from 'vitest';
import { NarrativeDirector } from '@/lib/features/narration/narrative-director.server';
import { BedrockEmbeddingService } from '@/lib/features/bedrock/bedrock-embedding.server';

vi.mock('@aws-sdk/client-bedrock-runtime', () => {
    return {
        BedrockRuntimeClient: class {
            async send(command: any) {
                const body = JSON.parse(command.body);
                if (body.inputText) {
                    return {
                        body: Buffer.from(JSON.stringify({
                            embedding: new Array(1024).fill(0.5)
                        }))
                    };
                }
                return {
                    body: Buffer.from(JSON.stringify({
                        content: [{ text: JSON.stringify({
                            ssml: '<speak>Annotated text</speak>',
                            metadata: { mood: 'happy' }
                        }) }]
                    }))
                };
            }
        },
        InvokeModelCommand: class {
            constructor(public input: any) {}
            get body() { return this.input.body; }
        }
    };
});

describe('Narrative Services Integration', () => {
    it('should annotate text via NarrativeDirector', async () => {
        const director = new NarrativeDirector();
        const result = await director.annotate('Hello kids!');
        
        expect(result.ssml).toContain('<speak>');
        expect(result.metadata.mood).toBe('happy');
    });

    it('should generate embeddings via BedrockEmbeddingService', async () => {
        const service = new BedrockEmbeddingService();
        const embedding = await service.generateEmbedding('test text');
        
        expect(embedding.length).toBe(1024);
        expect(embedding[0]).toBe(0.5);
    });
});
