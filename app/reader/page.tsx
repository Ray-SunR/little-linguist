"use client";

import { Suspense } from "react";
import staticBooks from "../../data/books.json";
import ReaderShell from "../../components/reader/reader-shell";
import { getStoryService } from "@/lib/features/story";
import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { Book } from "@/lib/core";

function ReaderContent() {
  const searchParams = useSearchParams();
  const storyId = searchParams.get("storyId");
  const bookId = searchParams.get("bookId");

  const [generatedBooks, setGeneratedBooks] = useState<Book[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadStories = async () => {
      const service = getStoryService();
      const stories = await service.getStories();
      const books = stories.map(s => service.convertStoryToBook(s));
      setGeneratedBooks(books);
      setIsLoaded(true);
    };
    loadStories();
  }, []);

  const allBooks = useMemo(() => {
    return [...(staticBooks as Book[]), ...generatedBooks];
  }, [generatedBooks]);

  const initialBookId = storyId || bookId || undefined;
  const narrationProvider = (process.env.NEXT_PUBLIC_NARRATION_PROVIDER || "web_speech") as any;

  if (!isLoaded) {
    return (
      <main className="page-sky relative h-screen overflow-hidden flex items-center justify-center">
        <div className="text-ink-muted font-bold animate-pulse">Loading library...</div>
      </main>
    );
  }

  return (
    <main className="page-sky relative h-screen overflow-hidden px-4 py-2 sm:py-4">
      <ReaderShell
        books={allBooks}
        initialINarrationProvider={narrationProvider}
        initialBookId={initialBookId}
      />
    </main>
  );
}

export default function ReaderPage() {
  return (
    <Suspense fallback={
      <main className="page-sky relative h-screen overflow-hidden flex items-center justify-center">
        <div className="text-ink-muted font-bold animate-pulse">Loading library...</div>
      </main>
    }>
      <ReaderContent />
    </Suspense>
  );
}
