import { SupabaseClient } from '@supabase/supabase-js';
import { AuditService, AuditAction, EntityType } from "../../features/audit/audit-service.server";
import { isValidUuid } from './library-types';

export class ProgressRepository {

    constructor(private supabase: SupabaseClient) {}

    async getProgress(childId: string, bookId: string) {
        if (!isValidUuid(bookId)) return null;

        const { data, error } = await this.supabase
            .from('child_books')
            .select('*')
            .match({ child_id: childId, book_id: bookId })
            .maybeSingle();

        if (error) throw error;
        return data;
    }

    async saveProgress(childId: string, bookId: string, progress: {
        last_token_index?: number;
        last_shard_index?: number;
        is_completed?: boolean;
        total_read_seconds?: number;
        playback_speed?: number;
    }) {
        if (!isValidUuid(bookId)) {
            throw new Error(`Invalid book ID: ${bookId}`);
        }

        // Fetch current progress to ensure we don't overwrite completion status
        const { data: current } = await this.supabase
            .from('child_books')
            .select('is_completed')
            .match({ child_id: childId, book_id: bookId })
            .maybeSingle();

        const dbProgress = {
            ...progress,
            child_id: childId,
            book_id: bookId,
            total_read_seconds: progress.total_read_seconds ? Math.round(progress.total_read_seconds) : undefined,
            // Never set completed back to false if it was already true
            is_completed: progress.is_completed || (current?.is_completed ?? false),
            last_read_at: new Date().toISOString()
        };

        const { data, error } = await this.supabase
            .from('child_books')
            .upsert(dbProgress, { onConflict: 'child_id,book_id' })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async toggleFavorite(childId: string, bookId: string, isFavorite: boolean) {
        if (!isValidUuid(bookId)) {
            throw new Error(`Invalid book ID: ${bookId}`);
        }

        const { data, error } = await this.supabase
            .from('child_books')
            .upsert({
                child_id: childId,
                book_id: bookId,
                is_favorite: isFavorite
            }, { onConflict: 'child_id,book_id' })
            .select()
            .single();

        if (error) throw error;

        // Audit: Book Favorited/Unfavorited
        await AuditService.log({
            action: isFavorite ? AuditAction.BOOK_FAVORITED : AuditAction.BOOK_UNFAVORITED,
            entityType: EntityType.BOOK,
            entityId: bookId,
            details: { childId }
        });

        return data;
    }
}
