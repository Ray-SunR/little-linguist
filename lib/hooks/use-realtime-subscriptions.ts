import { useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';


/**
 * Hook to subscribe to new images for a specific book.
 */
export function useBookMediaSubscription(bookId: string | undefined, onNewImage: (image: any) => void) {
    useEffect(() => {
        if (!bookId) return;

        const supabase = createClient();

        const channel = supabase
            .channel(`book_media:${bookId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'book_media',
                    filter: `book_id=eq.${bookId}`,
                },
                async (payload) => {
                    if (!payload.new) return;
                    console.log('Realtime image change detected:', payload);
                    const newMedia = payload.new as any;

                    // Generate signed URL if needed
                    if (newMedia.path && !newMedia.path.startsWith('http')) {
                        const { data } = await supabase.storage
                            .from('book-assets')
                            .createSignedUrl(newMedia.path, 3600);

                        if (data?.signedUrl) {
                            onNewImage({
                                id: newMedia.id,
                                src: data.signedUrl,
                                storagePath: newMedia.path,
                                afterWordIndex: newMedia.after_word_index,
                                caption: newMedia.metadata?.caption || 'Illustration',
                                alt: newMedia.metadata?.alt || '',
                                isPlaceholder: false
                            });
                            return;
                        }
                    }

                    onNewImage({
                        id: newMedia.id,
                        src: newMedia.path,
                        storagePath: newMedia.path,
                        afterWordIndex: newMedia.after_word_index,
                        caption: newMedia.metadata?.caption || 'Illustration',
                        alt: newMedia.metadata?.alt || '',
                        isPlaceholder: false
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [bookId, onNewImage]);
}

/**
 * Hook to subscribe to story status updates for notifications.
 */
export function useStoryStatusSubscription(userId: string | undefined, onStatusChange: (story: any) => void) {
    useEffect(() => {
        if (!userId) return;

        const supabase = createClient();

        const channel = supabase
            .channel(`story_status:${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'stories',
                    filter: `owner_user_id=eq.${userId}`,
                },
                (payload) => {
                    console.log('Realtime story update detected:', payload);
                    const updatedStory = payload.new;
                    if (updatedStory.status !== payload.old.status) {
                        onStatusChange(updatedStory);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, onStatusChange]);
}

/**
 * Hook to subscribe to new audio shards for a specific book.
 */
export function useBookAudioSubscription(bookId: string | undefined, onNewShard: (shard: any) => void) {
    useEffect(() => {
        if (!bookId) return;

        const supabase = createClient();

        const channel = supabase
            .channel(`book_audios:${bookId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'book_audios',
                    filter: `book_id=eq.${bookId}`,
                },
                async (payload) => {
                    if (!payload.new) return;
                    console.log('Realtime audio shard change detected:', payload);
                    const newShard = payload.new as any;

                    // Generate signed URL if needed
                    if (newShard.audio_path && !newShard.audio_path.startsWith('http')) {
                        const { data } = await supabase.storage
                            .from('book-assets')
                            .createSignedUrl(newShard.audio_path, 3600);

                        if (data?.signedUrl) {
                            onNewShard({
                                ...newShard,
                                audio_path: data.signedUrl
                            });
                            return;
                        }
                    }

                    onNewShard(newShard);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [bookId, onNewShard]);
}

/**
 * Hook to subscribe to book metadata updates (for image status tracking).
 */
export function useBookStatusSubscription(bookId: string | undefined, onUpdate: (metadata: any) => void) {
    useEffect(() => {
        if (!bookId) return;

        const supabase = createClient();

        const channel = supabase
            .channel(`book_status:${bookId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'books',
                    filter: `id=eq.${bookId}`,
                },
                (payload) => {
                    console.log('Realtime book update detected:', payload);
                    if (payload.new && (payload.new as any).metadata) {
                        onUpdate((payload.new as any).metadata);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [bookId, onUpdate]);
}
