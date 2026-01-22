import { describe, it, expect, vi, beforeEach } from 'vitest';
import { assetCache } from '@/lib/core/asset-cache';

vi.mock('./cache', () => ({
    raidenCache: {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn()
    },
    CacheStore: {
        ASSET_METADATA: 'asset_metadata'
    }
}));

describe('AssetCache', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // @ts-ignore
        global.window = {};
        
        const mockCache = {
            match: vi.fn(),
            put: vi.fn(),
            delete: vi.fn()
        };
        vi.stubGlobal('caches', {
            open: vi.fn().mockResolvedValue(mockCache),
            delete: vi.fn()
        });

        vi.stubGlobal('URL', {
            createObjectURL: vi.fn().mockReturnValue('blob:url'),
            revokeObjectURL: vi.fn()
        });

        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            clone: () => ({
                blob: () => Promise.resolve(new Blob(['test']))
            }),
            blob: () => Promise.resolve(new Blob(['test']))
        }));
    });

    it('should return signedUrl if window is undefined', async () => {
        const originalWindow = global.window;
        // @ts-ignore
        delete global.window;
        
        const url = await assetCache.getAsset('key', 'signedUrl');
        expect(url).toBe('signedUrl');
        
        global.window = originalWindow;
    });

    it('should fetch and cache asset on miss', async () => {
        const url = await assetCache.getAsset('key', 'http://signed');
        expect(url).toBe('blob:url');
        expect(global.fetch).toHaveBeenCalledWith('http://signed');
    });
});
