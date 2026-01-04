"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import SupabaseReaderShell, { type SupabaseBook } from "@/components/reader/supabase-reader-shell";
import { bookCache } from "@/lib/core/cache";
import { ttsCache } from "@/lib/features/narration/tts-cache";

interface ReaderPageProps {
    params: { id: string };
}

function ReaderContent({ params }: ReaderPageProps) {
    const bookId = params.id;
    const [books, setBooks] = useState<SupabaseBook[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadBooks = useCallback(async () => {
        let cachedBooks: SupabaseBook[] = [];
        try {
            cachedBooks = await bookCache.getAll();
            if (cachedBooks.length > 0) {
                // Strip stale progress
                const booksWithoutStaleProgress = cachedBooks.map(b => ({ ...b, initialProgress: undefined }));
                setBooks(booksWithoutStaleProgress);
                setIsLoading(false);
            }
        } catch (err) {
            console.error("Cache load failed:", err);
        }

        if (cachedBooks.length === 0) setIsLoading(true);
        setError(null);

        try {
            const booksRes = await fetch('/api/books');
            if (!booksRes.ok) throw new Error('Failed to fetch books');
            const manifest: Partial<SupabaseBook>[] = await booksRes.json();

            const now = Date.now();
            const EXPIRY_MS = 50 * 60 * 1000;

            const listToFetch = manifest.filter(remote => {
                const cached = cachedBooks.find(b => b.id === remote.id);
                if (!cached) return true;
                // Always fetch the current book to ensure it's fresh, 
                // especially for newly generated ones with async images
                if (remote.id === bookId) return true;

                if ((remote.updated_at && cached.updated_at && remote.updated_at !== cached.updated_at) ||
                    (remote.voice_id !== cached.voice_id)) return true;
                if (cached.cached_at && (now - cached.cached_at > EXPIRY_MS)) return true;
                return false;
            });

            const fetchedBooks = await Promise.all(
                listToFetch.map(async (book: any) => {
                    try {
                        const [bookRes, narrationRes, progressRes] = await Promise.all([
                            fetch(`/api/books/${book.id}?include=content,images`),
                            fetch(`/api/books/${book.id}/narration`),
                            fetch(`/api/books/${book.id}/progress`)
                        ]);

                        const bookData = await bookRes.json();
                        const shards = narrationRes.ok ? await narrationRes.json() : [];
                        const progress = progressRes.ok ? await progressRes.json() : null;

                        const fullBook: SupabaseBook = {
                            id: book.id,
                            title: book.title || bookData.title,
                            voice_id: bookData.voice_id,
                            text: bookData.text,
                            tokens: bookData.tokens || [],
                            images: bookData.images,
                            shards: Array.isArray(shards) ? shards : [],
                            initialProgress: progress,
                            updated_at: bookData.updated_at,
                            cached_at: Date.now()
                        };

                        await bookCache.put(fullBook);
                        return fullBook;
                    } catch (err) {
                        console.error(`Failed to load book ${book.id}:`, err);
                        return null;
                    }
                })
            );

            const validFetched = fetchedBooks.filter((b): b is SupabaseBook => b !== null);

            const mergedBooks = manifest.map(m => {
                const fresh = validFetched.find(f => f.id === m.id);
                if (fresh) return fresh;
                return cachedBooks.find(c => c.id === m.id);
            }).filter((b): b is SupabaseBook => !!b);

            // Fetch fresh progress
            let progressMap: Record<string, any> = {};
            try {
                const progressRes = await fetch('/api/progress');
                if (progressRes.ok) {
                    const progressList = await progressRes.json();
                    progressList.forEach((p: any) => {
                        progressMap[p.book_id] = p;
                    });
                }
            } catch (err) {
                console.error("Failed to fetch global progress:", err);
            }

            const finalBooks = mergedBooks.map(book => ({
                ...book,
                initialProgress: progressMap[book.id] || null
            }));

            // Prune
            const finalIds = new Set(finalBooks.map(b => b.id));
            for (const b of cachedBooks) {
                if (!finalIds.has(b.id)) {
                    await bookCache.delete(b.id);
                }
            }

            setBooks(finalBooks);

        } catch (err) {
            console.error('Failed to load books:', err);
            if (cachedBooks.length === 0) {
                setError(err instanceof Error ? err.message : 'Failed to load books');
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadBooks();
        ttsCache.init().catch(console.error);
    }, [loadBooks]);

    if (isLoading) {
        return (
            <main className="page-story-maker relative h-screen overflow-hidden flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </main>
        );
    }

    if (error) {
        return (
            <main className="page-story-maker relative h-screen overflow-hidden flex items-center justify-center">
                <div className="text-center px-4">
                    <p className="text-red-500 font-bold mb-4">{error}</p>
                    <button onClick={loadBooks} className="px-4 py-2 bg-purple-600 text-white rounded-lg">Retry</button>
                </div>
            </main>
        );
    }

    return (
        <main className="page-story-maker relative h-screen overflow-hidden px-4 py-2 sm:py-4">
            <SupabaseReaderShell
                books={books}
                initialBookId={bookId}
            />
        </main>
    );
}

export default function ReaderDetailPage({ params }: ReaderPageProps) {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-purple-500" /></div>}>
            <ReaderContent params={params} />
        </Suspense>
    );
}
