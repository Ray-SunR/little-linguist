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
    storagePath?: string;
    updatedAt?: string;
    // Grouping support
    isGrouped?: boolean;
    storyAmount?: number;
    imageAmount?: number;
    magicSentenceId?: string;
    entityId?: string;
    entityType?: string;
}

interface TransactionMetadata {
    book_id?: string;
    title?: string;
    book_key?: string;
    word?: string;
}

interface RawTransaction {
    id: string;
    amount: number;
    reason: string;
    created_at: string;
    metadata: TransactionMetadata | null;
    owner_user_id: string;
    entity_id: string | null;
    entity_type: string | null;
}

interface TransactionGroup {
    id: string;
    isGrouped: boolean;
    entityId: string;
    entityType: string;
    storyAmount: number;
    imageAmount: number;
    timestamp: string;
    metadata: TransactionMetadata | null;
    reason: string;
    type: "debit";
    amount: number;
}

export async function getUsageHistory(limit: number = 10): Promise<UsageEvent[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.log("[getUsageHistory] No user found");
        return [];
    }

    // Increased limit to 10x to ensure we have enough data even with heavy grouping
    const internalLimit = limit * 10;

    const { data: transactions, error } = await supabase
        .from("point_transactions")
        .select("id, amount, reason, created_at, metadata, owner_user_id, entity_id, entity_type")
        .eq("owner_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(internalLimit);

    if (error) {
        console.error("Failed to fetch usage history:", error);
        return [];
    }

    console.log(`[getUsageHistory] User: ${user.id}, Fetched ${transactions?.length || 0} raw transactions`);

    // 1. Group transactions
    const processedTransactions: (RawTransaction | TransactionGroup)[] = [];
    const entityGroups = new Map<string, TransactionGroup>();

    (transactions as any as RawTransaction[]).forEach(tx => {
        const entityId = tx.entity_id;
        const entityType = tx.entity_type;
        const isGroupable = entityType === 'story' || entityType === 'magic_sentence';

        if (entityId && isGroupable) {
            let group = entityGroups.get(entityId);
            if (!group) {
                group = {
                    id: `group-${entityId}`,
                    isGrouped: true,
                    entityId,
                    entityType,
                    storyAmount: 0,
                    imageAmount: 0,
                    timestamp: tx.created_at,
                    metadata: tx.metadata,
                    reason: 'generation_group',
                    type: 'debit',
                    amount: 0
                };
                entityGroups.set(entityId, group);
                processedTransactions.push(group);
            }

            const absAmount = Math.abs(tx.amount);
            group.amount += absAmount; // Maintain total amount sum

            if (tx.reason === 'story_generation' || tx.reason === 'magic_sentence') {
                group.storyAmount += absAmount;
            } else if (tx.reason === 'image_generation') {
                group.imageAmount += absAmount;
            }
        } else {
            // Check for legacy grouping (via metadata)
            const legacyBookId = tx.metadata?.book_id;
            if (legacyBookId && (tx.reason === 'story_generation' || tx.reason === 'image_generation')) {
                 let group = entityGroups.get(legacyBookId);
                 if (!group) {
                     group = {
                         id: `group-${legacyBookId}`,
                         isGrouped: true,
                         entityId: legacyBookId,
                         entityType: 'story',
                         storyAmount: 0,
                         imageAmount: 0,
                         timestamp: tx.created_at,
                         metadata: tx.metadata,
                         reason: 'generation_group',
                         type: 'debit',
                         amount: 0
                     };
                     entityGroups.set(legacyBookId, group);
                     processedTransactions.push(group);
                 }
                 const absAmount = Math.abs(tx.amount);
                 group.amount += absAmount;
                 if (tx.reason === 'story_generation') group.storyAmount += absAmount;
                 else group.imageAmount += absAmount;
            } else {
                processedTransactions.push(tx);
            }
        }
    });

    // Take only the requested limit after grouping
    const finalTransactions = processedTransactions.slice(0, limit);

    // 3. Fetch Book/Entity Details in Batch
    const bookMap = new Map<string, { id: string, title: string, cover_image_path: string | null, updated_at: string }>();
    const bookIds = Array.from(new Set(finalTransactions
        .map(tx => {
            if ('isGrouped' in tx && tx.isGrouped) {
                const group = tx as TransactionGroup;
                return group.entityType === 'story' ? group.entityId : null;
            } else {
                const raw = tx as RawTransaction;
                return raw.entity_type === 'story' ? raw.entity_id : (raw.metadata?.book_id || null);
            }
        })
        .filter(Boolean) as string[]));

    if (bookIds.length > 0) {
        const { data: books } = await supabase
            .from("books")
            .select("id, title, cover_image_path, updated_at")
            .in("id", bookIds);

        books?.forEach(book => {
            bookMap.set(book.id, book);
        });
    }

    // 4. Fetch Covers from book_media (User's specific requirement for story type)
    const mediaCoverMap = new Map<string, { path: string, updated_at: string }>();
    if (bookIds.length > 0) {
        const { data: mediaData } = await supabase
            .from('book_media')
            .select('book_id, path, updated_at')
            .eq('media_type', 'image')
            .in('book_id', bookIds)
            .order('after_word_index')
            .order('path');

        if (mediaData) {
            mediaData.forEach((media: any) => {
                // Keep the first image found for each book as the cover
                if (!mediaCoverMap.has(media.book_id) && media.path) {
                    mediaCoverMap.set(media.book_id, { path: media.path, updated_at: media.updated_at });
                }
            });
        }
    }

    // 5. Batch Sign URLs
    const pathsToSign = new Set<string>();
    bookMap.forEach(book => {
        if (book.cover_image_path && !book.cover_image_path.startsWith('http')) {
            pathsToSign.add(book.cover_image_path);
        }
    });
    mediaCoverMap.forEach(media => {
        if (media.path && !media.path.startsWith('http')) {
            pathsToSign.add(media.path);
        }
    });

    const signedUrlMap = new Map<string, string>();
    if (pathsToSign.size > 0) {
        const { data: signedData } = await supabase.storage
            .from('book-assets')
            .createSignedUrls(Array.from(pathsToSign), 3600);

        signedData?.forEach(item => {
            if (item.path && item.signedUrl) {
                signedUrlMap.set(item.path, item.signedUrl);
            }
        });
    }

    const result = finalTransactions.map((tx) => {
        // Format action name nicely
        const formatAction = (reason: string) => {
            if (reason === 'generation_group') return 'Story Collection';
            return reason
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        };

        const isGroup = 'isGrouped' in tx && tx.isGrouped === true;
        const eId = isGroup ? (tx as TransactionGroup).entityId : (tx as RawTransaction).entity_id;
        const eType = isGroup ? (tx as TransactionGroup).entityType : (tx as RawTransaction).entity_type;
        const bId = (eType === 'story' ? eId : null) || tx.metadata?.book_id;

        let description = tx.metadata?.title || tx.metadata?.book_key || tx.reason;
        let magicSentenceId: string | undefined = undefined;
        let coverImageUrl: string | undefined = undefined;
        let storagePath: string | undefined = undefined;
        let updatedAt: string | undefined = undefined;

        // Enhance description based on type and metadata
        if (tx.reason === 'word_insight' && tx.metadata?.word) {
            description = `${tx.metadata.word.charAt(0).toUpperCase() + tx.metadata.word.slice(1)}`;
        } else if (tx.reason === 'magic_sentence' && (tx.metadata as any)?.words) {
            const m = tx.metadata as any;
            const words = m.words;
            description = words.length > 2 
                ? `${words.slice(0, 2).join(", ")} + ${words.length - 2} more`
                : words.join(", ");
            magicSentenceId = m.magic_sentence_id;
        } else if (bId && bookMap.has(bId)) {
            const book = bookMap.get(bId)!;
            description = book.title;
            storagePath = (mediaCoverMap.get(bId)?.path || book.cover_image_path) || undefined; 
            updatedAt = (mediaCoverMap.get(bId)?.updated_at || book.updated_at) || undefined;

            if (storagePath) {
                coverImageUrl = storagePath.startsWith('http') ? storagePath : signedUrlMap.get(storagePath) || undefined;
            }
        } else if (!tx.metadata?.title && !tx.metadata?.book_key) {
            // Fallbacks for missing metadata
            if (tx.reason === 'story_generation') description = 'New Story';
            else if (tx.reason === 'image_generation') description = 'Story Illustration';
            else if (tx.reason === 'word_insight') description = 'Word Learning';
            else if (tx.reason === 'magic_sentence') description = 'Magic Sentence';
        }

        const timestamp = isGroup ? (tx as TransactionGroup).timestamp : (tx as RawTransaction).created_at;
        const amount = isGroup ? (tx as TransactionGroup).amount : Math.abs((tx as RawTransaction).amount);
        const type = (isGroup ? 'debit' : ((tx as RawTransaction).amount > 0 ? "credit" : "debit")) as "credit" | "debit";

        return {
            id: tx.id,
            action: formatAction(tx.reason),
            description: description,
            timestamp,
            amount,
            type,
            entityId: eId || undefined,
            entityType: eType || undefined,
            bookId: bId,
            coverImageUrl,
            storagePath,
            updatedAt,
            isGrouped: isGroup,
            storyAmount: isGroup ? (tx as TransactionGroup).storyAmount : undefined,
            imageAmount: isGroup ? (tx as TransactionGroup).imageAmount : undefined,
            magicSentenceId
        };
    });

    console.log(`[getUsageHistory] Returning ${result.length} processed events`);
    return result;
}
