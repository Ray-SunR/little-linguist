"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FastForward, Sparkles, Loader2, ArrowLeft, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useNarrationEngine, type NarrationShard } from "@/hooks/use-narration-engine";
import { useReaderPersistence } from "@/hooks/use-reader-persistence";
import { useWordInspector } from "@/hooks/use-word-inspector";
import { tokensToWordTokens } from "@/lib/core/books/token-adapter";
import { Token } from "@/lib/core/books/tokenizer";
import { DEFAULT_SPEED, type SpeedOption } from "@/lib/features/narration/internal/speed-options";
import { playSentence } from "@/lib/features/narration";
import { WebSpeechNarrationProvider } from "@/lib/features/narration/implementations/web-speech-provider";
import type { ViewMode } from "@/lib/core";

import BookLayout from "./book-layout";
import ControlPanel from "./control-panel";
import WordInspectorTooltip from "./word-inspector-tooltip";

export interface SupabaseBook {
    id: string;
    title: string;
    voice_id?: string;
    text: string;
    tokens: Token[];
    images?: any[];
    shards: NarrationShard[];
    initialProgress?: {
        last_token_index?: number;
        last_shard_index?: number;
        last_playback_time?: number;
        view_mode?: string;
        playback_speed?: number;
    };
    updated_at?: string;
    cached_at?: number;
    owner_user_id?: string | null;
}

type SupabaseReaderShellProps = {
    books: SupabaseBook[];
    initialBookId?: string;
    onBack?: () => void;
};

export default function SupabaseReaderShell({ books, initialBookId, onBack }: SupabaseReaderShellProps) {
    const router = useRouter();
    const [selectedBookId, setSelectedBookId] = useState(initialBookId || "");
    const [playbackSpeed, setPlaybackSpeed] = useState<SpeedOption>(DEFAULT_SPEED);
    const [viewMode, setViewMode] = useState<ViewMode>("scroll");
    const [isMounted, setIsMounted] = useState(false);
    const [controlsExpanded, setControlsExpanded] = useState(false);
    const [theme, setTheme] = useState<"light" | "dark">("light");
    const [isMaximized, setIsMaximized] = useState(false);

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const controlsRef = useRef<HTMLDivElement>(null);
    const toggleButtonRef = useRef<HTMLButtonElement>(null);
    const lastScrolledBookIdRef = useRef<string | null>(null);

    // Initialize state on mount
    useEffect(() => {
        setIsMounted(true);
    }, []);

    const selectedBook = useMemo(() => books.find((book) => book.id === selectedBookId) ?? null, [books, selectedBookId]);

    useEffect(() => {
        if (selectedBook?.initialProgress) {
            const { view_mode, playback_speed } = selectedBook.initialProgress;
            if (view_mode) setViewMode(view_mode as ViewMode);
            if (playback_speed) setPlaybackSpeed(playback_speed as SpeedOption);
        }
    }, [selectedBook]);

    const wordTokens = useMemo(() => {
        if (!selectedBook?.tokens) return [];
        return tokensToWordTokens(selectedBook.tokens);
    }, [selectedBook?.tokens]);

    const {
        state: playbackState,
        currentShardIndex,
        currentWordIndex,
        currentTime,
        play,
        pause,
        seekToWord,
        setSpeed
    } = useNarrationEngine({
        bookId: selectedBook?.id || "",
        shards: selectedBook?.shards || [],
        initialTokenIndex: selectedBook?.initialProgress ? (selectedBook.initialProgress.last_token_index ?? 0) : null,
        initialShardIndex: selectedBook?.initialProgress?.last_shard_index ?? 0,
        initialTime: selectedBook?.initialProgress?.last_playback_time ?? 0,
        speed: playbackSpeed
    });

    useEffect(() => {
        setSpeed(playbackSpeed);
    }, [playbackSpeed, setSpeed]);

    const { saveProgress } = useReaderPersistence({
        bookId: selectedBook?.id || "",
        tokenIndex: currentWordIndex,
        shardIndex: currentShardIndex,
        time: currentTime,
        playbackState,
        viewMode,
        speed: playbackSpeed
    });

    const tooltipProvider = useMemo(() => new WebSpeechNarrationProvider(), []);
    const wordInspector = useWordInspector();

    const isEmpty = books.length === 0;

    const goNextBook = useCallback(() => {
        if (!books.length) return;
        saveProgress(true, true);
        const currentIndex = books.findIndex((book) => book.id === selectedBookId);
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % books.length;
        const nextBookId = books[nextIndex].id;
        router.push(`/reader/${nextBookId}`);
    }, [books, selectedBookId, saveProgress, router]);

    const handleRestart = useCallback(async () => {
        if (!selectedBookId) return;
        pause();
        await seekToWord(0);
        saveProgress(true);
        lastScrolledBookIdRef.current = null;
    }, [selectedBookId, pause, seekToWord, saveProgress]);

    const handleWordClick = useCallback(async (word: string, element: HTMLElement, wordIndex: number) => {
        if (playbackState === "playing") pause();
        await wordInspector.openWord(word, element, wordIndex);
        await seekToWord(wordIndex);
    }, [playbackState, pause, wordInspector, seekToWord]);


    const handlePlaySentence = useCallback(async (sentence: string) => {
        try {
            await playSentence(sentence, tooltipProvider);
        } catch (error) {
            console.error("Failed to play sentence TTS:", error);
        }
    }, [tooltipProvider]);

    const handlePlayFromWord = useCallback(async () => {
        const wordIndex = wordInspector.selectedWordIndex;
        if (wordIndex === null) return;
        wordInspector.close();
        await seekToWord(wordIndex);
        saveProgress(true);
        await play();
    }, [wordInspector, seekToWord, play, saveProgress]);

    const toggleTheme = useCallback(() => {
        const newTheme = theme === "light" ? "dark" : "light";
        setTheme(newTheme);
        if (newTheme === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }, [theme]);

    const toggleMaximized = useCallback(() => {
        const nextMaximized = !isMaximized;
        setIsMaximized(nextMaximized);
        try {
            if (nextMaximized) {
                if (document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen();
                }
            } else {
                if (document.fullscreenElement && document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        } catch (err) {
            console.error("Fullscreen API error:", err);
        }
    }, [isMaximized]);

    useEffect(() => {
        if (!controlsExpanded) return;
        const handleClickAway = (event: MouseEvent) => {
            if (
                controlsRef.current &&
                !controlsRef.current.contains(event.target as Node) &&
                toggleButtonRef.current &&
                !toggleButtonRef.current.contains(event.target as Node)
            ) {
                setControlsExpanded(false);
            }
        };
        document.addEventListener("mousedown", handleClickAway);
        return () => document.removeEventListener("mousedown", handleClickAway);
    }, [controlsExpanded]);

    useEffect(() => {
        if (currentWordIndex === null) return;
        const isPlaying = playbackState === "playing";
        const isNewBook = lastScrolledBookIdRef.current !== selectedBookId;
        if (!isPlaying && !isNewBook) return;
        const scrollContainer = scrollContainerRef.current;
        if (!scrollContainer) return;

        const rafId = requestAnimationFrame(() => {
            const wordElement = scrollContainer.querySelector(`[data-word-index="${currentWordIndex}"]`) as HTMLElement;
            if (!wordElement) return;
            const behavior = isNewBook ? "instant" : "smooth";
            if (viewMode === "spread") {
                const horizontalContainer = scrollContainer.querySelector(".book-spread-scroll-container") as HTMLElement;
                if (horizontalContainer) {
                    const containerWidth = horizontalContainer.clientWidth;
                    const wordOffset = wordElement.offsetLeft;
                    const targetScrollLeft = Math.floor(wordOffset / containerWidth) * containerWidth;
                    horizontalContainer.scrollTo({ left: targetScrollLeft, behavior: isNewBook ? "instant" : "smooth" });
                }
            } else {
                wordElement.scrollIntoView({ behavior, block: "center" });
            }
            if (isNewBook) lastScrolledBookIdRef.current = selectedBookId;
        });
        return () => cancelAnimationFrame(rafId);
    }, [currentWordIndex, playbackState, viewMode, selectedBookId]);

    const isLoadingBook = !selectedBook && !isEmpty;
    const isPreparing = playbackState === 'buffering';

    if (!selectedBookId && !isEmpty) {
        return <div className="p-8 text-center text-ink-muted">No story selected</div>;
    }

    return (
        <section className={`relative mx-auto flex h-full w-full flex-1 min-h-0 flex-col transition-all duration-500 ease-in-out md:pl-28 ${isMaximized ? 'max-w-none px-0 py-0 gap-0' : 'max-w-7xl gap-4 sm:gap-5'}`}>
            {!isMaximized && (
                <>
                    <div className="pointer-events-none absolute -left-6 top-6 h-28 w-28 blob blob-1" />
                    <div className="pointer-events-none absolute right-8 top-16 h-20 w-20 blob blob-2" />
                    <div className="pointer-events-none absolute -right-6 bottom-10 h-24 w-24 blob blob-3" />
                </>
            )}

            <div className={`glass-card flex flex-col flex-1 min-h-0 transition-all duration-500 ${isMaximized ? 'p-2 sm:p-4 rounded-none border-none bg-white dark:bg-[#0b0c14]' : 'p-4 sm:p-5'}`}>
                <header className="flex items-center gap-1.5 sm:gap-3 mb-3">
                    <button
                        type="button"
                        onClick={() => {
                            saveProgress(true, true);
                            if (onBack) {
                                onBack();
                            } else {
                                router.push("/library");
                            }
                        }}
                        className="inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white/80 dark:bg-card text-ink shadow-md hover:shadow-lg hover:scale-105 transition-all flex-shrink-0 border border-purple-100 dark:border-transparent"
                        aria-label="Back to Library"
                        title="Back to Library"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>

                    <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                        <Sparkles className="hidden sm:flex h-4 w-4 sm:h-5 sm:w-5 text-pink-400 flex-shrink-0" aria-hidden />
                        <div className="flex-1 min-w-0">
                            <h1 className="text-lg sm:text-xl font-fredoka font-bold text-ink truncate leading-none">
                                {selectedBook?.title || "Book Reader"}
                            </h1>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleRestart}
                        disabled={isEmpty || isPreparing}
                        className="inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 flex-shrink-0 border border-emerald-400/30"
                        style={{ background: 'linear-gradient(135deg, #34D399, #10B981)' }}
                        aria-label="Restart story"
                        title="Restart story from beginning"
                    >
                        <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>

                    <button
                        type="button"
                        onClick={playbackState === "playing" ? pause : play}
                        disabled={isEmpty || isPreparing}
                        className="inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #8B4BFF, #7C3AED)' }}
                        aria-label={playbackState === "playing" ? "Pause" : "Play"}
                        title={playbackState === "playing" ? "Pause (Space)" : "Play (Space)"}
                    >
                        {isPreparing ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> :
                            playbackState === "playing" ? (
                                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
                            ) : (
                                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                            )}
                    </button>

                    <button
                        ref={toggleButtonRef}
                        type="button"
                        onClick={() => setControlsExpanded(!controlsExpanded)}
                        disabled={isEmpty}
                        className="inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white/80 dark:bg-card text-ink shadow-md hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 flex-shrink-0 border border-purple-100 dark:border-transparent"
                        aria-label={controlsExpanded ? "Hide controls" : "Show controls"}
                        aria-expanded={controlsExpanded}
                    >
                        <svg className={`h-4 w-4 sm:h-5 sm:w-5 transition-transform ${controlsExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>

                    <button
                        type="button"
                        className="inline-flex items-center gap-1 sm:gap-2 text-sm font-fredoka font-bold px-3 py-2 sm:px-4 sm:py-2 rounded-xl bg-white/80 dark:bg-card text-ink shadow-md hover:shadow-lg hover:scale-105 transition-all flex-shrink-0 border border-purple-100 dark:border-transparent disabled:opacity-50"
                        onClick={goNextBook}
                        disabled={isEmpty}
                        aria-label="Next story"
                        title="Next story (N)"
                    >
                        <span className="hidden sm:inline">Next</span>
                        <FastForward className="h-4 w-4" aria-hidden />
                    </button>
                </header>

                {controlsExpanded && !isEmpty && (
                    <div ref={controlsRef} className="absolute right-4 top-[5.2rem] z-50 w-[calc(100%-2rem)] max-w-sm animate-slide-down">
                        <ControlPanel
                            speed={playbackSpeed}
                            onSpeedChange={setPlaybackSpeed}
                            viewMode={viewMode}
                            onViewModeChange={setViewMode}
                            theme={theme}
                            onThemeToggle={toggleTheme}
                            isMaximized={isMaximized}
                            onToggleMaximized={toggleMaximized}
                            isDisabled={isEmpty || isPreparing}
                        />
                    </div>
                )}

                <div ref={scrollContainerRef} className="flex-1 min-h-0 flex flex-col pt-1">
                    <div className="relative h-full overflow-hidden rounded-[1.8rem] bg-card/60 dark:bg-card/40 shadow-soft">
                        <BookLayout
                            tokens={wordTokens}
                            images={selectedBook?.images}
                            currentWordIndex={currentWordIndex}
                            onWordClick={handleWordClick}
                            viewMode={viewMode}
                            isPlaying={playbackState === "playing"}
                        />
                    </div>
                </div>
            </div>

            <WordInspectorTooltip
                insight={wordInspector.insight}
                isLoading={wordInspector.isLoading}
                error={wordInspector.error}
                isOpen={wordInspector.isOpen}
                position={wordInspector.position}
                onClose={wordInspector.close}
                onRetry={wordInspector.retry}
                onPlaySentence={handlePlaySentence}
                onPlayFromWord={handlePlayFromWord}
                provider={tooltipProvider}
            />
        </section>
    );
}
