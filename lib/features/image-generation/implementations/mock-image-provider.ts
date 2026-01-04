import { IImageGenerationProvider, ImageGenerationOptions, ImageGenerationResult } from '../types';
import fs from 'fs/promises';
import path from 'path';

export class MockImageProvider implements IImageGenerationProvider {
    async generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
        console.log(`[MockImageProvider] Generating image for prompt: ${options.prompt}`);

        // Simulate network latency
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Use a placeholder image from the repo if it exists, otherwise a generic one
        // In a real mock we might use something like sharp to generate a buffered image
        // For now, let's just return a dummy 1x1 pixel PNG buffer
        const dummyImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

        return {
            imageBuffer: dummyImage,
            mimeType: 'image/png',
            metadata: {
                prompt: options.prompt,
                model: 'mock-model'
            }
        };
    }
}
