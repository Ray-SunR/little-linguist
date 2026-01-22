import { describe, it, expect, vi } from 'vitest';
import { NovaStoryService } from '@/lib/features/nova/nova-service.server';

vi.mock('@aws-sdk/client-bedrock-runtime', () => {
    return {
        BedrockRuntimeClient: class {
            async send(command: any) {
                const body = JSON.parse(command.input.body);
                
                if (body.taskType === 'TEXT_IMAGE') {
                    return {
                        body: Buffer.from(JSON.stringify({
                            images: ['base64image']
                        }))
                    };
                }

                if (body.messages) {
                    const prompt = body.messages[0].content[0].text;
                    if (prompt.includes('3-page children\'s story')) {
                        return {
                            body: Buffer.from(JSON.stringify({
                                output: {
                                    message: {
                                        content: [{ text: JSON.stringify([{ text: 'Page 1', imagePrompt: 'Prompt 1' }]) }]
                                    }
                                }
                            }))
                        };
                    }
                    return {
                        body: Buffer.from(JSON.stringify({
                            output: {
                                message: {
                                    content: [{ text: 'Cover Prompt' }]
                                }
                            }
                        }))
                    };
                }
                
                return { body: Buffer.from('{}') };
            }
        },
        InvokeModelCommand: class {
            constructor(public input: any) {}
        }
    };
});

describe('NovaStoryService Integration', () => {
    it('should generate story via Nova', async () => {
        const service = new NovaStoryService();
        const pages = await service.generateStory('cats');
        expect(pages.length).toBe(1);
        expect(pages[0].text).toBe('Page 1');
    });

    it('should generate image via Nova', async () => {
        const service = new NovaStoryService();
        const image = await service.generateImage('A happy cat');
        expect(image).toBe('base64image');
    });

    it('should generate cover prompt via Nova', async () => {
        const service = new NovaStoryService();
        const prompt = await service.generateCoverPrompt('Some story text');
        expect(prompt).toBe('Cover Prompt');
    });
});
