import { describe, it, expect, beforeAll, vi } from 'vitest';
import { AuditService, AuditAction, EntityType } from '@/lib/features/audit/audit-service.server';
import { truncateAllTables, createTestUser } from '../../utils/db-test-utils';
import { createAdminClient } from '@/lib/supabase/server';

vi.mock('next/headers', () => ({
    cookies: vi.fn(() => ({
        get: vi.fn(),
        set: vi.fn()
    })),
    headers: vi.fn(() => ({
        get: vi.fn()
    }))
}));

describe('AuditService Integration', () => {
    let testUser: any;
    const supabase = createAdminClient();

    beforeAll(async () => {
        await truncateAllTables();
        testUser = await createTestUser();
    });

    it('should log an action successfully', async () => {
        await AuditService.log({
            action: AuditAction.BOOK_OPENED,
            entityType: EntityType.BOOK,
            entityId: 'test-book-id',
            userId: testUser.id,
            details: { test: 'data' }
        });

        const { data, error } = await supabase
            .from('audit_logs')
            .select('*')
            .eq('owner_user_id', testUser.id)
            .eq('action_type', AuditAction.BOOK_OPENED)
            .single();
        
        expect(error).toBeNull();
        expect(data).not.toBeNull();
        expect(data.details).toEqual({ test: 'data' });
    });

    it('should respect cooldown and not log duplicates', async () => {
        const action = AuditAction.USER_LOGIN;
        
        await AuditService.log({
            action,
            entityType: EntityType.USER,
            userId: testUser.id
        });

        await AuditService.log({
            action,
            entityType: EntityType.USER,
            userId: testUser.id
        });

        const { data } = await supabase
            .from('audit_logs')
            .select('id')
            .eq('owner_user_id', testUser.id)
            .eq('action_type', action);
        
        expect(data?.length).toBe(1);
    });
});
