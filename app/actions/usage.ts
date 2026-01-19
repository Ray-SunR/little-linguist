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
    bucket?: string; // bucket name for storage
    // Grouping support
    isGrouped?: boolean;
    storyAmount?: number;
    imageAmount?: number;
    magicSentenceId?: string;
    entityId?: string;
    entityType?: string;
    isDeleted?: boolean;
    childId?: string;
    childName?: string;
    childAvatar?: string;
}

interface TransactionMetadata {
    book_id?: string;
    title?: string;
    book_key?: string;
    word?: string;
    magic_sentence_id?: string;
    words?: string[];
}

interface RawTransaction {
    id: string;
    amount: number;
    reason: string;
    created_at: string;
    metadata: TransactionMetadata | null;
    owner_user_id: string;
    child_id: string | null;
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
    type: "debit" | "credit";
    amount: number;
    bucket?: string;
    childId?: string;
}

export async function getUsageHistory(limit: number = 10): Promise<UsageEvent[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.log("[getUsageHistory] No user found");
        return [];
    }

    const internalLimit = limit * 10;

    const { data: transactions, error } = await supabase
        .from("point_transactions")
        .select("id, amount, reason, created_at, metadata, owner_user_id, child_id, entity_id, entity_type")
        .eq("owner_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(internalLimit);

    if (error) {
        console.error("Failed to fetch usage history:", error);
        return [];
    }

    // 1. Group transactions
    const processedTransactions: (RawTransaction | TransactionGroup)[] = [];
    const entityGroups = new Map<string, TransactionGroup>();

    (transactions as any as RawTransaction[]).forEach(tx => {
        const entityId = tx.entity_id;
        const entityType = tx.entity_type;
        const isGroupable = entityType === 'story' || entityType === 'magic_sentence';
        if (entityId && isGroupable) {
            const groupKey = `${entityType}:${entityId}`;
            let group = entityGroups.get(groupKey);
            if (!group) {
                group = {
                    id: `group-${entityType}-${entityId}`,
                    isGrouped: true,
                    entityId,
                    entityType,
                    storyAmount: 0,
                    imageAmount: 0,
                    timestamp: tx.created_at,
                    metadata: tx.metadata,
                    reason: 'generation_group',
                    type: 'debit',
                    amount: 0,
                    childId: tx.child_id || undefined
                };
                entityGroups.set(groupKey, group);
                processedTransactions.push(group);
            }

            group.amount += tx.amount;
            if (tx.reason === 'story_generation' || tx.reason === 'magic_sentence') {
                group.storyAmount += tx.amount;
            } else if (tx.reason === 'image_generation') {
                group.imageAmount += tx.amount;
            }
            group.type = group.amount < 0 ? 'debit' : 'credit';
        } else {
            processedTransactions.push(tx);
        }
    });

    const finalTransactions = processedTransactions.slice(0, limit);

    // 2. Fetch Entity Details
    const bookMap = new Map<string, { id: string, title: string, cover_image_path: string | null, updated_at: string }>();
    const magicSentenceMap = new Map<string, { id: string, image_path: string | null, created_at: string }>();
    const bookIds = new Set<string>();
    const magicSentenceIds = new Set<string>();
    const childIds = new Set<string>();
 
    finalTransactions.forEach(tx => {
        const isGroup = 'isGrouped' in tx && tx.isGrouped;
        const eId = isGroup ? (tx as TransactionGroup).entityId : (tx as RawTransaction).entity_id;
        const eType = isGroup ? (tx as TransactionGroup).entityType : (tx as RawTransaction).entity_type;
        const cId = isGroup ? (tx as TransactionGroup).childId : (tx as RawTransaction).child_id;

        if (eId) {
            if (eType === 'story' || eType === 'book') bookIds.add(eId);
            else if (eType === 'magic_sentence') magicSentenceIds.add(eId);
        }
        if (cId) childIds.add(cId);
    });

    if (bookIds.size > 0) {
        const { data: books } = await supabase.from("books").select("id, title, cover_image_path, updated_at").in("id", Array.from(bookIds));
        books?.forEach(book => bookMap.set(book.id, book));
    }
    if (magicSentenceIds.size > 0) {
        const { data: magicSentences } = await supabase.from("child_magic_sentences").select("id, image_path, created_at").in("id", Array.from(magicSentenceIds));
        magicSentences?.forEach(ms => magicSentenceMap.set(ms.id, ms));
    }

    const childMap = new Map<string, { id: string, name: string, avatar_path: string | null }>();
    if (childIds.size > 0) {
        const { data: children } = await supabase.from("children").select("id, first_name, avatar_paths, primary_avatar_index").in("id", Array.from(childIds));
        children?.forEach(c => {
            const avatarPaths = (c.avatar_paths as string[]) || [];
            const primary = c.primary_avatar_index ?? 0;
            const path = avatarPaths[primary] || avatarPaths[0] || null;
            childMap.set(c.id, { id: c.id, name: c.first_name, avatar_path: path });
        });
    }

    const mediaCoverMap = new Map<string, { path: string, updated_at: string }>();
    if (bookIds.size > 0) {
        const { data: mediaData } = await supabase.from('book_media').select('book_id, path, updated_at').eq('media_type', 'image').in('book_id', Array.from(bookIds)).order('after_word_index').order('path');
        mediaData?.forEach((media: any) => { if (!mediaCoverMap.has(media.book_id) && media.path) mediaCoverMap.set(media.book_id, { path: media.path, updated_at: media.updated_at }); });
    }

    // 3. Batch Sign URLs
    const bookPathsToSign = new Set<string>();
    const userPathsToSign = new Set<string>();
    bookMap.forEach(book => { if (book.cover_image_path && !book.cover_image_path.startsWith('http')) bookPathsToSign.add(book.cover_image_path); });
    mediaCoverMap.forEach(media => { if (media.path && !media.path.startsWith('http')) bookPathsToSign.add(media.path); });
    magicSentenceMap.forEach(ms => { if (ms.image_path && !ms.image_path.startsWith('http')) userPathsToSign.add(ms.image_path); });
    childMap.forEach(child => { if (child.avatar_path && !child.avatar_path.startsWith('http')) userPathsToSign.add(child.avatar_path); });

    const signedUrlMap = new Map<string, string>();
    if (bookPathsToSign.size > 0) {
        const { data: signedData } = await supabase.storage.from('book-assets').createSignedUrls(Array.from(bookPathsToSign), 3600);
        signedData?.forEach(item => { if (item.path && item.signedUrl) signedUrlMap.set(item.path, item.signedUrl); });
    }
    if (userPathsToSign.size > 0) {
        const { data: signedData } = await supabase.storage.from('user-assets').createSignedUrls(Array.from(userPathsToSign), 3600);
        signedData?.forEach(item => { if (item.path && item.signedUrl) signedUrlMap.set(item.path, item.signedUrl); });
    }

    // 4. Map to UsageEvent
    return finalTransactions.map((tx) => {
        const isGroup = 'isGrouped' in tx && tx.isGrouped === true;
        const eId = isGroup ? (tx as TransactionGroup).entityId : ((tx as RawTransaction).entity_id || undefined);
        const eType = isGroup ? (tx as TransactionGroup).entityType : ((tx as RawTransaction).entity_type || undefined);
        const bId = (eType === 'story' ? eId : undefined);
        const cId = isGroup ? (tx as TransactionGroup).childId : ((tx as RawTransaction).child_id || undefined);

        const formatAction = (reason: string) => {
            if (reason === 'generation_group') {
                return eType === 'magic_sentence' ? 'Magic Sentence' : 'Story Collection';
            }
            if (reason === 'magic_sentence') return 'Magic Sentence';
            if (reason === 'book.completed') return 'Goal Reached! 🏆';
            if (reason === 'book.opened') return 'Reading Adventure';
            return reason.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ').split('.').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        };

        let description = (tx as any).metadata?.title || (tx as any).metadata?.book_key;
        let magicSentenceId: string | undefined = undefined;
        let coverImageUrl: string | undefined = undefined;
        let storagePath: string | undefined = undefined;
        let updatedAt: string | undefined = undefined;
        let bucket: string | undefined = undefined;

        if ((tx as any).reason === 'word_insight' && (tx as any).metadata?.word) {
            description = (tx as any).metadata.word.charAt(0).toUpperCase() + (tx as any).metadata.word.slice(1);
        } else if (eType === 'magic_sentence' || (tx as any).reason === 'magic_sentence') {
            const m = (tx as any).metadata as any;
            if (m?.words) {
                description = m.words.length > 2 ? `${m.words.slice(0, 2).join(", ")} + ${m.words.length - 2} more` : m.words.join(", ");
            } else {
                description = 'Magic Sentence';
            }
            magicSentenceId = m?.magic_sentence_id || (eType === 'magic_sentence' ? eId : undefined);

            if (eId && magicSentenceMap.has(eId)) {
                const ms = magicSentenceMap.get(eId)!;
                storagePath = ms.image_path || undefined;
                updatedAt = ms.created_at;
                bucket = 'user-assets';
                if (storagePath) coverImageUrl = storagePath.startsWith('http') ? storagePath : signedUrlMap.get(storagePath);
            }
        } else if ((eType === 'story' || eType === 'book') && eId && bookMap.has(eId)) {
            const book = bookMap.get(eId)!;
            if (eType === 'book') {
                description = (tx as any).reason === 'book.completed' ? `Finished reading "${book.title}"` : `Started reading "${book.title}"`;
            } else {
                description = book.title;
            }
            storagePath = mediaCoverMap.get(eId)?.path || book.cover_image_path || undefined;
            updatedAt = mediaCoverMap.get(eId)?.updated_at || book.updated_at || undefined;
            bucket = 'book-assets';
            if (storagePath) coverImageUrl = storagePath.startsWith('http') ? storagePath : signedUrlMap.get(storagePath);
        }

        // Determine if the entity has been deleted
        let isDeleted = false;
        if (eId) {
            if ((eType === 'story' || eType === 'book') && !bookMap.has(eId)) isDeleted = true;
            if (eType === 'magic_sentence' && !magicSentenceMap.has(eId)) isDeleted = true;
        } else if (bId && !bookMap.has(bId)) {
            // Check if it's a reason that implies there SHOULD be an entity
            const needsEntity = ['story_generation', 'image_generation', 'magic_sentence', 'book.opened', 'book.completed'].includes((tx as any).reason);
            if (needsEntity) isDeleted = true;
        }

        // Final fallback for description if still empty or generic
        if (!description || description === 'generation_group' || description === tx.reason) {
            if ((tx as any).reason === 'story_generation') description = 'New Story';
            else if ((tx as any).reason === 'image_generation') description = 'Story Illustration';
            else if ((tx as any).reason === 'word_insight') description = 'Word Learning';
            else if ((tx as any).reason === 'magic_sentence') description = 'Magic Sentence';
            else description = formatAction((tx as any).reason);
        }

        const child = cId ? childMap.get(cId) : undefined;

        const timestamp = isGroup ? (tx as TransactionGroup).timestamp : (tx as RawTransaction).created_at;
        const amount = Math.abs((tx as any).amount);
        const type = (isGroup ? (tx as TransactionGroup).type : (((tx as RawTransaction).amount || 0) > 0 ? "credit" : "debit")) as "credit" | "debit";

        return {
            id: (tx as any).id,
            action: formatAction((tx as any).reason),
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
            bucket,
            isGrouped: isGroup,
            storyAmount: isGroup ? (tx as TransactionGroup).storyAmount : undefined,
            imageAmount: isGroup ? (tx as TransactionGroup).imageAmount : undefined,
            magicSentenceId,
            isDeleted,
            childId: cId,
            childName: child?.name,
            childAvatar: child?.avatar_path ? (child.avatar_path.startsWith('http') ? child.avatar_path : signedUrlMap.get(child.avatar_path)) : undefined
        };
    });
}
