import { IImageGenerationProvider, ImageGenerationProviderType } from './types';
import { GoogleGenAIImageProvider } from './implementations/google-genai-provider';
import { MockImageProvider } from './implementations/mock-image-provider';

export class ImageGenerationFactory {
    static getProvider(type: ImageGenerationProviderType = 'google'): IImageGenerationProvider {
        if (process.env.MOCK_AI_SERVICES !== "false") {
            return new MockImageProvider();
        }

        // Allow override via environment variable
        const envType = process.env.IMAGE_GENERATION_PROVIDER as ImageGenerationProviderType;
        const actualType = envType || type;

        switch (actualType) {
            case 'google':
                return new GoogleGenAIImageProvider();
            case 'mock':
                return new MockImageProvider();
            case 'nova':
                throw new Error("Nova provider not implemented yet");
            default:
                console.warn(`Unknown image generation provider type: ${type}, falling back to mock`);
                return new MockImageProvider();
        }
    }
}
