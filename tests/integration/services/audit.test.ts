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
    let supabase: any;

    beforeAll(async () => {
        supabase = createAdminClient();
        await truncateAllTables();
        testUser = await createTestUser();
        expect(testUser).toBeTruthy();
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

    it('should retry without childId if foreign key violation occurs', async () => {
        const testUserId = testUser.id;
        const invalidChildId = '00000000-0000-0000-0000-000000000002';

        // Log an action with an invalid child ID (that doesn't exist in the children table)
        await AuditService.log({
            action: AuditAction.BOOK_OPENED,
            entityType: EntityType.BOOK,
            entityId: 'invalid-child-test-book',
            userId: testUserId,
            childId: invalidChildId
        });

        // Verify that the log was still written (but with child_id = null)
        const { data, error } = await supabase
            .from('audit_logs')
            .select('*')
            .eq('owner_user_id', testUserId)
            .eq('action_type', AuditAction.BOOK_OPENED)
            .eq('entity_id', 'invalid-child-test-book')
            .single();

        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(data.child_id).toBeNull();
        expect(data.owner_user_id).toBe(testUserId);
    });
});
