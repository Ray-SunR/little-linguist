import { assetCache } from "./asset-cache";

/**
 * Utility to resolve potentially cached media URLs.
 * Primarily used for audio playback to avoid redownloading chunks.
 */
export async function resolveMediaUrl(storagePath: string, fallbackUrl: string): Promise<string> {
    if (!storagePath) return fallbackUrl;

    try {
        const decodedPath = decodeURIComponent(storagePath);
        return await assetCache.getAsset(decodedPath, fallbackUrl);
    } catch (err) {
        console.warn(`[Media] Failed to resolve ${storagePath}:`, err);
        return fallbackUrl;
    }
}
