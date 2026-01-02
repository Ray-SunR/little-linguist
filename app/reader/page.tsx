"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import SupabaseReaderShell, { type SupabaseBook } from "@/components/reader/supabase-reader-shell";

function ReaderContent() {
  const searchParams = useSearchParams();
  const initialBookId = searchParams.get("bookId") || undefined;

  const [books, setBooks] = useState<SupabaseBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all books with their narration and progress
  const loadBooks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch book list
      const booksRes = await fetch('/api/books');
      if (!booksRes.ok) throw new Error('Failed to fetch books');
      const bookList = await booksRes.json();

      // 2. For each book, fetch full details, narration shards, and progress
      const enrichedBooks: SupabaseBook[] = await Promise.all(
        bookList.map(async (book: any) => {
          try {
            const [bookRes, narrationRes, progressRes] = await Promise.all([
              fetch(`/api/books/${book.id}?include=content,images`),
              fetch(`/api/books/${book.id}/narration`),
              fetch(`/api/books/${book.id}/progress`)
            ]);

            const bookData = await bookRes.json();
            const shards = narrationRes.ok ? await narrationRes.json() : [];
            const progress = progressRes.ok ? await progressRes.json() : null;

            return {
              id: book.id,
              title: book.title || bookData.title,
              text: bookData.text,
              tokens: bookData.tokens || [],
              images: bookData.images,
              shards: Array.isArray(shards) ? shards : [],
              initialProgress: progress
            };
          } catch (err) {
            console.error(`Failed to load book ${book.id}:`, err);
            return null;
          }
        })
      );

      setBooks(enrichedBooks.filter((b): b is SupabaseBook => b !== null));
    } catch (err) {
      console.error('Failed to load books:', err);
      setError(err instanceof Error ? err.message : 'Failed to load books');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  if (isLoading) {
    return (
      <main className="page-story-maker relative h-screen overflow-hidden flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          <div className="text-ink-muted font-bold">Loading library...</div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page-story-maker relative h-screen overflow-hidden flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <div className="text-red-500 font-bold">Error loading books</div>
          <p className="text-ink-muted text-sm">{error}</p>
          <button
            onClick={loadBooks}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  if (books.length === 0) {
    return (
      <main className="page-story-maker relative h-screen overflow-hidden flex items-center justify-center">
        <div className="text-ink-muted font-bold">No books available</div>
      </main>
    );
  }

  return (
    <main className="page-story-maker relative h-screen overflow-hidden px-4 py-2 sm:py-4">
      <SupabaseReaderShell
        books={books}
        initialBookId={initialBookId}
      />
    </main>
  );
}

export default function ReaderPage() {
  return (
    <Suspense fallback={
      <main className="page-story-maker relative h-screen overflow-hidden flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          <div className="text-ink-muted font-bold animate-pulse">Loading library...</div>
        </div>
      </main>
    }>
      <ReaderContent />
    </Suspense>
  );
}

