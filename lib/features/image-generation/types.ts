export interface ImageGenerationOptions {
    prompt: string;
    subjectImage?: Buffer; // For subject reference
    characterDescription?: string;
    negativePrompt?: string;
    aspectRatio?: '1:1' | '16:9' | '4:3' | '3:2' | '2:1';
    style?: string;
    imageSize?: '1K' | '512' | '256';
}

export interface ImageGenerationResult {
    imageBuffer: Buffer;
    mimeType: string;
    metadata?: Record<string, any>;
}

export interface IImageGenerationProvider {
    generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult>;
}

export type ImageGenerationProviderType = 'google' | 'nova' | 'mock';
