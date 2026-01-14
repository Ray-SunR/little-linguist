"use server";

import { createClient } from "@/lib/supabase/server";

export interface UsageEvent {
    id: string;
    action: string;
    description: string;
    timestamp: string;
    amount: number;
    type: "credit" | "debit";
    // Enhanced metadata
    bookId?: string;
    coverImageUrl?: string;
}

export async function getUsageHistory(limit: number = 10): Promise<UsageEvent[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data: transactions, error } = await supabase
        .from("point_transactions")
        .select("*")
        .eq("owner_user_id", user.id)
        .order("created_at", { ascending: false })
        // Fetch a few more to account for potentially grouped items if we were grouping, but for now direct limit
        .limit(limit);

    if (error) {
        console.error("Failed to fetch usage history:", error);
        return [];
    }

    // 1. Collect Book IDs
    const bookIds = new Set<string>();
    transactions.forEach(tx => {
        if (tx.metadata?.book_id) {
            bookIds.add(tx.metadata.book_id);
        }
    });

    // 2. Fetch Book Details in Batch
    const bookMap = new Map<string, { title: string, cover_image_url: string | null }>();
    if (bookIds.size > 0) {
        const { data: books } = await supabase
            .from("books")
            .select("id, title, cover_image_url")
            .in("id", Array.from(bookIds));
        
        books?.forEach(book => {
            bookMap.set(book.id, book);
        });
    }

    return transactions.map((tx) => {
        const isCredit = tx.amount > 0;
        
        // Format action name nicely
        const formatAction = (reason: string) => {
            return reason
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        };

        let description = tx.metadata?.title || tx.metadata?.book_key || tx.reason;
        let bookId: string | undefined = tx.metadata?.book_id;
        let coverImageUrl: string | undefined = undefined;

        // Enhance description based on type and metadata
        if (tx.reason === 'word_insight' && tx.metadata?.word) {
            description = `${tx.metadata.word.charAt(0).toUpperCase() + tx.metadata.word.slice(1)}`;
        } else if (bookId && bookMap.has(bookId)) {
            const book = bookMap.get(bookId)!;
            description = book.title;
            coverImageUrl = book.cover_image_url || undefined;
        } else if (!tx.metadata?.title && !tx.metadata?.book_key) {
             // Fallbacks for missing metadata
             if (tx.reason === 'story_generation') description = 'New Story';
             else if (tx.reason === 'image_generation') description = 'Story Illustration';
             else if (tx.reason === 'word_insight') description = 'Word Learning';
        }

        return {
            id: tx.id,
            action: formatAction(tx.reason),
            description: description,
            timestamp: tx.created_at,
            amount: Math.abs(tx.amount),
            type: isCredit ? "credit" : "debit",
            bookId,
            coverImageUrl
        };
    });
}
