"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import LibraryView from "@/components/reader/library-view";
import { type LibraryBookCard } from "@/lib/core/books/library-types";
import { bookCache } from "@/lib/core/cache";
import { ttsCache } from "@/lib/features/narration/tts-cache";
import { createBrowserClient } from "@supabase/ssr";

function LibraryContent() {
    const router = useRouter();
    const [books, setBooks] = useState<LibraryBookCard[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Fetch current user on mount
    useEffect(() => {
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        supabase.auth.getUser().then(({ data }) => {
            setCurrentUserId(data.user?.id ?? null);
        });
    }, []);

    const loadBooks = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Fetch books with covers and progress in parallel (just 2 API calls!)
            const [booksRes, progressRes] = await Promise.all([
                fetch('/api/books?mode=library'),
                fetch('/api/progress')
            ]);

            if (!booksRes.ok) throw new Error('Failed to fetch books');

            // Type definitions for API responses
            interface BookApiResponse {
                id: string;
                title: string;
                coverImageUrl?: string;
                updated_at?: string;
                voice_id?: string;
                owner_user_id?: string | null;
                totalTokens?: number;
                estimatedReadingTime?: number;
                isRead?: boolean;
                lastOpenedAt?: string;
            }

            interface ProgressApiResponse {
                book_id: string;
                last_token_index?: number;
                last_shard_index?: number;
                last_playback_time?: number;
            }

            const booksData: BookApiResponse[] = await booksRes.json();
            const progressList: ProgressApiResponse[] = progressRes.ok ? await progressRes.json() : [];

            // Validate required fields
            const validBooks = booksData.filter(book => book.id && book.title);

            // Build progress map
            const progressMap: Record<string, ProgressApiResponse> = {};
            progressList.forEach((p) => {
                if (p.book_id) {
                    progressMap[p.book_id] = p;
                }
            });

            // Merge books with their progress
            const libraryBooks: LibraryBookCard[] = validBooks.map((book) => ({
                id: book.id,
                title: book.title,
                coverImageUrl: book.coverImageUrl,
                updated_at: book.updated_at,
                voice_id: book.voice_id,
                owner_user_id: book.owner_user_id,
                progress: progressMap[book.id] ? {
                    last_token_index: progressMap[book.id].last_token_index,
                    total_tokens: book.totalTokens
                } : undefined,
                estimatedReadingTime: book.estimatedReadingTime,
                isRead: book.isRead,
                lastOpenedAt: book.lastOpenedAt
            }));

            setBooks(libraryBooks);

        } catch (err) {
            console.error('Failed to load books:', err);
            setError(err instanceof Error ? err.message : 'Failed to load books');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadBooks();
        ttsCache.init().catch(console.error);
    }, [loadBooks]);

    const handleSelectBook = (id: string) => {
        router.push(`/reader/${id}`);
    };

    const handleDeleteBook = useCallback(async (id: string) => {
        try {
            const res = await fetch(`/api/books/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to delete');
            }
            // Remove from local state
            setBooks(prev => prev.filter(b => b.id !== id));
            // Also remove from cache if it exists there
            await bookCache.delete(id);
        } catch (err) {
            console.error('Delete book failed:', err);
            alert(err instanceof Error ? err.message : 'Failed to delete book');
        }
    }, []);

    if (isLoading) {
        return (
            <main className="page-story-maker relative min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </main>
        );
    }

    if (error) {
        return (
            <main className="page-story-maker relative min-h-screen flex items-center justify-center px-4">
                <div className="text-center">
                    <p className="text-red-500 font-bold mb-4">{error}</p>
                    <button onClick={loadBooks} className="px-4 py-2 bg-purple-600 text-white rounded-lg">Retry</button>
                </div>
            </main>
        );
    }

    return (
        <LibraryView
            books={books}
            onSelectBook={handleSelectBook}
            onDeleteBook={handleDeleteBook}
            currentUserId={currentUserId}
        />
    );
}

export default function LibraryPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin" /></div>}>
            <LibraryContent />
        </Suspense>
    );
}
