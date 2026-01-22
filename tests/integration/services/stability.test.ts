import { describe, it, expect, vi } from 'vitest';
import { StabilityStoryService } from '@/lib/features/stability/stability-service.server';

vi.mock('@aws-sdk/client-bedrock-runtime', () => {
    return {
        BedrockRuntimeClient: class {
            async send() {
                return {
                    body: Buffer.from(JSON.stringify({
                        images: ['base64image']
                    }))
                };
            }
        },
        InvokeModelCommand: class {
            constructor(public input: any) {}
        }
    };
});

describe('StabilityStoryService Integration', () => {
    it('should generate image via Stability', async () => {
        const service = new StabilityStoryService();
        const image = await service.generateImage('A whimsical dragon');
        expect(image).toBe('base64image');
    });
});
