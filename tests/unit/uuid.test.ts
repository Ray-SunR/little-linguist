import { describe, it, expect, vi } from 'vitest';
import { generateUUID } from '@/lib/core/utils/uuid';

describe('UUID Utilities', () => {
    it('should generate a valid UUID', () => {
        const uuid = generateUUID();
        expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should fall back to Math.random if crypto is missing', () => {
        const originalCrypto = global.crypto;
        // @ts-ignore
        delete global.crypto;
        
        const uuid = generateUUID();
        expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        
        global.crypto = originalCrypto;
    });
});
