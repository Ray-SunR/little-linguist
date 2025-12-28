"use client";

import Link from "next/link";
import { ArrowLeft, Volume2, Trash2, BookOpen } from "lucide-react";
import { useWordList } from "../../lib/word-list-context";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "../../lib/utils";
import type { WordInsight } from "../../lib/word-insight";

export default function MyWordsPage() {
    const { words, removeWord, isLoading } = useWordList();
    const router = useRouter();

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center p-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-shell p-6 md:p-10">
            <header className="mx-auto mb-10 flex max-w-5xl items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 font-bold text-ink shadow-sm transition-transform hover:scale-105 active:scale-95"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        Back
                    </button>
                    <h1 className="text-3xl font-extrabold text-ink md:text-4xl">
                        My Collection 🌟
                    </h1>
                </div>
                <div className="text-lg font-bold text-accent">
                    {words.length} {words.length === 1 ? 'Word' : 'Words'}
                </div>
            </header>

            <main className="mx-auto max-w-5xl">
                {words.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-3xl bg-white p-12 text-center shadow-lg md:p-20">
                        <div className="mb-6 rounded-full bg-accent/10 p-6">
                            <BookOpen className="h-16 w-16 text-accent" />
                        </div>
                        <h2 className="mb-2 text-2xl font-bold text-ink">Your collection is empty</h2>
                        <p className="mb-8 max-w-sm text-lg text-ink-muted">
                            Explore stories and click on starry words to add them here!
                        </p>
                        <Link
                            href="/reader"
                            className="primary-btn text-lg"
                        >
                            Start Reading
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {words.map((word) => (
                            <Flashcard key={word.word} word={word} onRemove={() => removeWord(word.word)} />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

function Flashcard({ word, onRemove }: { word: WordInsight; onRemove: () => void }) {
    const [isFlipped, setIsFlipped] = useState(false);

    // Stop propagation for delete button
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        onRemove();
    };

    const handlePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        const utterance = new SpeechSynthesisUtterance(word.word);
        window.speechSynthesis.speak(utterance);
    };

    return (
        <div
            className="group relative h-64 cursor-pointer perspective-1000"
            onClick={() => setIsFlipped(!isFlipped)}
        >
            <div
                className={cn(
                    "relative h-full w-full transition-all duration-500 preserve-3d",
                    isFlipped ? "rotate-y-180" : ""
                )}
            >
                {/* Front */}
                <div className="absolute h-full w-full backface-hidden">
                    <div className="flex h-full w-full flex-col items-center justify-center rounded-3xl border-2 border-transparent bg-white shadow-xl transition-all hover:border-accent/30 hover:shadow-2xl">
                        <h3 className="text-3xl font-black text-accent">{word.word}</h3>
                        <p className="mt-2 text-sm font-medium text-ink-muted">Tap to flip</p>

                        {/* Delete button (Front) */}
                        <button
                            onClick={handleDelete}
                            className="absolute right-4 top-4 rounded-full p-2 text-red-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                            title="Remove word"
                        >
                            <Trash2 className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Back */}
                <div className="absolute h-full w-full rotate-y-180 backface-hidden">
                    <div className="flex h-full w-full flex-col justify-between rounded-3xl border-2 border-accent bg-accent/5 p-6 shadow-xl">
                        <div className="flex items-start justify-between">
                            <h3 className="text-xl font-bold text-accent">{word.word}</h3>
                            <button
                                onClick={handlePlay}
                                className="rounded-full bg-white p-2 text-accent shadow-sm hover:scale-110 active:scale-95 transition-transform"
                            >
                                <Volume2 className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto py-4">
                            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-ink-muted">Meaning</p>
                            <p className="mb-4 font-medium text-ink">{word.definition}</p>

                            {word.pronunciation && (
                                <>
                                    <p className="mb-1 text-xs font-bold uppercase tracking-wider text-ink-muted">Pronunciation</p>
                                    <p className="font-mono text-sm text-ink-muted">{word.pronunciation}</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
