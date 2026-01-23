import { describe, it, expect } from 'vitest';
import { raidenCache } from '../cache';

describe('RaidenCache', () => {
    it('should throw error if indexedDB is not available', async () => {
        // Ensure indexedDB is truly undefined
        const originalIndexedDB = global.indexedDB;
        // @ts-ignore
        delete global.indexedDB;

        try {
            await raidenCache.init();
            throw new Error('Should have failed');
        } catch (error: any) {
            // We want it to be an Error with a descriptive message
            expect(error.message).toBe('indexedDB not available in this environment');
        } finally {
            global.indexedDB = originalIndexedDB;
        }
    });
});
