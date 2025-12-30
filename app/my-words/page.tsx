"use client";

import Link from "next/link";
import { ArrowLeft, Trash2, BookOpen, Sparkles } from "lucide-react";
import { useWordList } from "@/lib/features/word-insight";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/core";
import type { WordInsight } from "@/lib/features/word-insight";
import { WordInsightView } from "@/components/reader/word-insight-view";

export default function MyWordsPage() {
    const { words, removeWord, isLoading } = useWordList();
    const router = useRouter();

    if (isLoading) {
        return (
            <div className="min-h-screen page-story-maker flex items-center justify-center p-8">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="min-h-screen page-story-maker p-6 md:p-10">
            <header className="mx-auto mb-10 flex max-w-5xl items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 rounded-full bg-white/80 backdrop-blur-sm px-5 py-2.5 font-bold text-ink shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95 border border-white/50"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        Back
                    </button>
                    <h1 className="text-3xl font-extrabold text-accent md:text-4xl flex items-center gap-2">
                        My Collection <span className="text-3xl">⭐</span>
                    </h1>
                </div>
                <div className="px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm font-bold text-accent shadow-sm">
                    {words.length} {words.length === 1 ? 'Word' : 'Words'}
                </div>
            </header>

            <main className="mx-auto max-w-5xl">
                {words.length === 0 ? (
                    <div className="glass-card flex flex-col items-center justify-center p-12 text-center md:p-20">
                        <div className="mb-6 w-20 h-20 rounded-3xl bg-gradient-to-br from-yellow-300 to-orange-400 flex items-center justify-center shadow-lg">
                            <BookOpen className="h-10 w-10 text-white" />
                        </div>
                        <h2 className="mb-2 text-2xl font-bold text-ink">Your collection is empty</h2>
                        <p className="mb-8 max-w-sm text-lg text-ink-muted">
                            Explore stories and click on starry words to add them here!
                        </p>
                        <Link
                            href="/reader"
                            className="next-step-btn"
                        >
                            <Sparkles className="h-5 w-5" />
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
    const [isListening, setIsListening] = useState(false);

    // Stop propagation for delete button
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        onRemove();
    };

    // Flip handler - only flip on card click, not on buttons
    const handleCardClick = (e: React.MouseEvent) => {
        // Don't flip if clicking on a button or inside WordInsightView interactive elements
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('[data-no-flip]')) {
            return;
        }
        setIsFlipped(!isFlipped);
    };

    const handleListen = async () => {
        setIsListening(true);
        const utterance = new SpeechSynthesisUtterance(word.word);
        utterance.onend = () => setIsListening(false);
        window.speechSynthesis.speak(utterance);
    };

    // No-op for save toggle since this is already saved
    const handleToggleSave = () => {
        // Word is already in collection, nothing to do here
    };

    return (
        <div
            className="group relative h-[28rem] cursor-pointer perspective-1000"
            onClick={handleCardClick}
        >
            <div
                className={cn(
                    "relative h-full w-full transition-all duration-500 preserve-3d",
                    isFlipped ? "rotate-y-180" : ""
                )}
            >
                {/* Front - shows the word */}
                <div className="absolute h-full w-full backface-hidden">
                    <div className="glass-card flex h-full w-full flex-col items-center justify-center transition-all hover:scale-[1.02] hover:shadow-2xl">
                        <h3 className="text-3xl font-black text-accent">{word.word}</h3>
                        <p className="mt-2 text-sm font-medium text-ink-muted">Tap to flip ✨</p>

                        {/* Delete button (Front) */}
                        <button
                            onClick={handleDelete}
                            className="absolute right-4 top-4 rounded-full p-2 text-red-300 hover:bg-red-100 hover:text-red-500 transition-colors"
                            title="Remove word"
                        >
                            <Trash2 className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Back - shows WordInsightView identical to popover */}
                <div className="absolute h-full w-full rotate-y-180 backface-hidden overflow-hidden">
                    <div
                        className="glass-card h-full w-full p-4 overflow-y-auto"
                        data-no-flip
                    >
                        <WordInsightView
                            insight={word}
                            isSaved={true}
                            onToggleSave={handleToggleSave}
                            onListen={handleListen}
                            isListening={isListening}
                        // Don't pass onPlayFromWord to hide that button
                        // Don't pass onClose since we use tap to flip back
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
