"use server";

import { BookRepository } from "@/lib/core/books/repository.server";
import { createClient } from "@/lib/supabase/server";
import { SupabaseBook } from "@/components/reader/supabase-reader-shell";
import { AuditService, AuditAction, EntityType } from "@/lib/features/audit/audit-service.server";

interface ReaderContainerProps {
    bookId: string;
    activeChildId?: string;
    children: (props: { initialBook: SupabaseBook | null; error: string | null }) => React.ReactElement;
}

/**
 * Server component that fetches book data using BookRepository.
 * Prevents the fetch waterfall on the client.
 */
export async function ReaderContainer({ bookId, activeChildId, children }: ReaderContainerProps) {
    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const repo = new BookRepository();

        // Fetch full book data
        const bookData = await repo.getBookById(bookId, {
            includeTokens: true,
            includeContent: true,
            includeMedia: true,
            includeAudio: true,
            userId: user?.id
        });

        if (!bookData) {
            return children({ initialBook: null, error: "Book not found" });
        }

        // Fetch initial progress if childId is provided
        let initialProgress = null;
        if (activeChildId) {
            const { data: progressData } = await (supabase as any)
                .from('child_books')
                .select('*')
                .eq('child_id', activeChildId)
                .eq('book_id', bookId)
                .maybeSingle();

            initialProgress = progressData;
        }

        const fullBook: SupabaseBook = {
            ...bookData,
            // SupabaseBook expects `text` and `tokens` to be present; some code paths return them as optional.
            text: bookData.text ?? "",
            tokens: (bookData as any).tokens ?? [],
            images: (bookData as any).images ?? undefined,
            shards: Array.isArray((bookData as any).audios) ? (bookData as any).audios : [],
            initialProgress,
            cached_at: Date.now(),
        };

        return children({ initialBook: fullBook, error: null });
    } catch (error: any) {
        console.error(`ReaderContainer Error [${bookId}]:`, error);
        return children({ initialBook: null, error: error.message || "Failed to load book" });
    }
}
