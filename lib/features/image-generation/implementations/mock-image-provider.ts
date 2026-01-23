import { IImageGenerationProvider, ImageGenerationOptions, ImageGenerationResult } from '../types';
import sharp from 'sharp';

export class MockImageProvider implements IImageGenerationProvider {
    async generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
        console.log(`[MockImageProvider] Generating image for prompt: ${options.prompt}`);

        // Simulate network latency
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Generate a visible dummy image (magenta block)
        const dummyImage = await sharp({
            create: {
                width: 800,
                height: 600,
                channels: 3,
                background: { r: 255, g: 0, b: 255 }
            }
        }).png().toBuffer();

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
