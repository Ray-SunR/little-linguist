import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { raidenCache } from '../cache';

describe('RaidenCache', () => {
    const originalWindow = global.window;
    const originalIndexedDB = global.indexedDB;

    beforeEach(() => {
        // Reset globals
        // @ts-ignore
        global.window = originalWindow;
        // @ts-ignore
        global.indexedDB = originalIndexedDB;
    });

    afterEach(() => {
        // Restore globals
        // @ts-ignore
        global.window = originalWindow;
        // @ts-ignore
        global.indexedDB = originalIndexedDB;
    });

    it('should throw error if window is not available (SSR/Node)', async () => {
        // @ts-ignore
        delete global.window;

        try {
            await raidenCache.init();
            throw new Error('Should have failed');
        } catch (error: any) {
            expect(error.message).toBe('indexedDB not available in this environment');
        }
    });

    it('should throw error if indexedDB is not available even if window exists', async () => {
        // Simulate browser environment without indexedDB
        // @ts-ignore
        global.window = {} as any;
        // @ts-ignore
        delete global.indexedDB;

        try {
            await raidenCache.init();
            throw new Error('Should have failed');
        } catch (error: any) {
            expect(error.message).toBe('indexedDB not available in this environment');
        }
    });
});
