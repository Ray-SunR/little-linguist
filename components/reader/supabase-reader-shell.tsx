"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FastForward, Sparkles, Loader2 } from "lucide-react";
import { useNarrationEngine, type NarrationShard } from "@/hooks/use-narration-engine";
import { useReaderPersistence } from "@/hooks/use-reader-persistence";
import { useWordInspector } from "@/hooks/use-word-inspector";
import { tokensToWordTokens } from "@/lib/core/books/token-adapter";
import { Token } from "@/lib/core/books/tokenizer";
import { DEFAULT_SPEED, type SpeedOption } from "@/lib/features/narration/internal/speed-options";
import { playWordOnly, playSentence } from "@/lib/features/narration";
import { WebSpeechNarrationProvider } from "@/lib/features/narration/implementations/web-speech-provider";
import type { ViewMode } from "@/lib/core";
import BookSelect from "./book-select";
import BookLayout from "./book-layout";
import ControlPanel from "./control-panel";
import WordInspectorTooltip from "./word-inspector-tooltip";

export interface SupabaseBook {
    id: string;
    title: string;
    text: string;
    tokens: Token[];
    images?: any[];
    shards: NarrationShard[];
    initialProgress?: {
        last_token_index?: number;
        last_shard_index?: number;
        last_playback_time?: number;
    };
}

type SupabaseReaderShellProps = {
    books: SupabaseBook[];
    initialBookId?: string;
};

export default function SupabaseReaderShell({ books, initialBookId }: SupabaseReaderShellProps) {
    const [selectedBookId, setSelectedBookId] = useState(initialBookId || books[0]?.id || "");
    const [playbackSpeed, setPlaybackSpeed] = useState<SpeedOption>(DEFAULT_SPEED);
    const [isListening, setIsListening] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>("scroll");
    const [isMounted, setIsMounted] = useState(false);
    const [controlsExpanded, setControlsExpanded] = useState(false);
    const [theme, setTheme] = useState<"light" | "dark">("light");
    const [isMaximized, setIsMaximized] = useState(false);

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const controlsRef = useRef<HTMLDivElement>(null);
    const toggleButtonRef = useRef<HTMLButtonElement>(null);
    const lastScrolledBookIdRef = useRef<string | null>(null);

    // Load persistence on mount
    useEffect(() => {
        const savedBookId = localStorage.getItem("reader_selectedBookId");
        const savedViewMode = localStorage.getItem("reader_viewMode");

        if (!initialBookId && savedBookId && books.some(b => b.id === savedBookId)) {
            setSelectedBookId(savedBookId);
        }
        if (savedViewMode) {
            setViewMode(savedViewMode as ViewMode);
        }
        setIsMounted(true);
    }, [books, initialBookId]);

    // Save persistence on change
    useEffect(() => {
        if (!isMounted) return;
        localStorage.setItem("reader_selectedBookId", selectedBookId);
    }, [selectedBookId, isMounted]);

    useEffect(() => {
        if (!isMounted) return;
        localStorage.setItem("reader_viewMode", viewMode);
    }, [viewMode, isMounted]);

    const selectedBook = books.find((book) => book.id === selectedBookId) ?? null;

    // Convert Supabase tokens to WordToken format for BookText compatibility
    const wordTokens = useMemo(() => {
        if (!selectedBook?.tokens) return [];
        const tokens = tokensToWordTokens(selectedBook.tokens);
        console.log(`[SupabaseReader] Book: ${selectedBook.title}, Raw tokens: ${selectedBook.tokens?.length || 0}, Word tokens: ${tokens.length}`);
        return tokens;
    }, [selectedBook?.tokens, selectedBook?.title]);

    // Debug: Log images count
    useEffect(() => {
        if (selectedBook) {
            console.log(`[SupabaseReader] Images: ${selectedBook.images?.length || 0}`);
        }
    }, [selectedBook]);

    // Narration Engine
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
        initialTokenIndex: selectedBook?.initialProgress?.last_token_index || 0,
        initialShardIndex: selectedBook?.initialProgress?.last_shard_index || 0,
        initialTime: selectedBook?.initialProgress?.last_playback_time || 0,
        speed: playbackSpeed
    });

    // Sync speed changes
    useEffect(() => {
        setSpeed(playbackSpeed);
    }, [playbackSpeed, setSpeed]);

    // Persistence Hook
    const { saveProgress } = useReaderPersistence({
        bookId: selectedBook?.id || "",
        tokenIndex: currentWordIndex,
        shardIndex: currentShardIndex,
        time: currentTime,
        playbackState
    });

    // Tooltip provider for word inspector
    const tooltipProvider = useMemo(() => new WebSpeechNarrationProvider(), []);
    const wordInspector = useWordInspector();

    const isEmpty = books.length === 0;

    const goNextBook = useCallback(() => {
        if (!books.length) return;
        saveProgress(); // Ensure progress is saved before switching
        const currentIndex = books.findIndex((book) => book.id === selectedBookId);
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % books.length;
        setSelectedBookId(books[nextIndex].id);
    }, [books, selectedBookId, saveProgress]);

    const handleWordClick = useCallback(async (word: string, element: HTMLElement, wordIndex: number) => {
        // Pause main narration when inspecting word
        if (playbackState === "playing") {
            pause();
        }
        await wordInspector.openWord(word, element, wordIndex);
    }, [playbackState, pause, wordInspector]);

    const handleTooltipListen = useCallback(async () => {
        if (!wordInspector.insight || isListening) return;
        setIsListening(true);
        try {
            await playWordOnly(wordInspector.insight.word, tooltipProvider);
        } catch (error) {
            console.error("Failed to play word TTS:", error);
        } finally {
            setIsListening(false);
        }
    }, [wordInspector.insight, isListening, tooltipProvider]);

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
        saveProgress(); // explicit save for jump
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

    // Click away to dismiss controls
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

    // Auto-scroll to highlighted word
    useEffect(() => {
        if (currentWordIndex === null) return;

        const isPlaying = playbackState === "playing";
        const isNewBook = lastScrolledBookIdRef.current !== selectedBookId;

        if (!isPlaying && !isNewBook) return;

        const scrollContainer = scrollContainerRef.current;
        if (!scrollContainer) return;

        const rafId = requestAnimationFrame(() => {
            const wordElement = scrollContainer.querySelector(
                `[data-word-index="${currentWordIndex}"]`
            ) as HTMLElement;

            if (!wordElement) return;

            const behavior = isNewBook ? "instant" : "smooth";

            if (viewMode === "spread") {
                const horizontalContainer = scrollContainer.querySelector(".book-spread-scroll-container") as HTMLElement;
                if (horizontalContainer) {
                    const containerWidth = horizontalContainer.clientWidth;
                    const wordOffset = wordElement.offsetLeft;
                    const currentScrollLeft = horizontalContainer.scrollLeft;
                    const targetSpreadIndex = Math.floor(wordOffset / containerWidth);
                    const targetScrollLeft = targetSpreadIndex * containerWidth;
                    const isVisible = wordOffset >= currentScrollLeft && wordOffset < currentScrollLeft + containerWidth;

                    if (!isVisible || behavior === "instant") {
                        horizontalContainer.scrollTo({
                            left: targetScrollLeft,
                            behavior,
                        });
                    }
                }
            } else {
                wordElement.scrollIntoView({
                    behavior,
                    block: "center",
                });
            }

            if (isNewBook) {
                lastScrolledBookIdRef.current = selectedBookId;
            }
        });

        return () => cancelAnimationFrame(rafId);
    }, [currentWordIndex, playbackState, viewMode, selectedBookId]);

    const isLoading = !selectedBook;
    const isPreparing = playbackState === 'buffering';

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
                    {/* Book Title as Selector */}
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                        <Sparkles className="hidden sm:flex h-4 w-4 sm:h-5 sm:w-5 text-pink-400 flex-shrink-0" aria-hidden />
                        <div className="flex-1 min-w-0">
                            <BookSelect
                                books={books.map(b => ({ id: b.id, title: b.title, text: b.text }))}
                                selectedBookId={selectedBookId}
                                onSelect={setSelectedBookId}
                                label=""
                            />
                        </div>
                    </div>

                    {/* Inline Play/Pause Button */}
                    <button
                        type="button"
                        onClick={playbackState === "playing" ? pause : play}
                        disabled={isEmpty || isPreparing}
                        className="inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #8B4BFF, #7C3AED)' }}
                        aria-label={playbackState === "playing" ? "Pause" : "Play"}
                        title={playbackState === "playing" ? "Pause (Space)" : "Play (Space)"}
                    >
                        {isPreparing ? (
                            <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                        ) : playbackState === "playing" ? (
                            <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                            </svg>
                        ) : (
                            <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
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
                        title="Toggle controls"
                    >
                        <svg
                            className={`h-4 w-4 sm:h-5 sm:w-5 transition-transform ${controlsExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    <button
                        type="button"
                        className="inline-flex items-center gap-1 sm:gap-2 text-sm font-bold px-3 py-2 sm:px-4 sm:py-2 rounded-xl bg-white/80 dark:bg-card text-ink shadow-md hover:shadow-lg hover:scale-105 transition-all flex-shrink-0 border border-purple-100 dark:border-transparent disabled:opacity-50"
                        onClick={goNextBook}
                        disabled={isEmpty}
                        aria-label="Next story"
                        title="Next story (N)"
                    >
                        <span className="hidden sm:inline">Next</span>
                        <FastForward className="h-4 w-4" aria-hidden />
                    </button>
                </header>

                {/* Expandable Controls Panel - Overlay */}
                {!isEmpty && controlsExpanded && (
                    <div
                        ref={controlsRef}
                        className="absolute right-4 top-[5.2rem] z-50 w-[calc(100%-2rem)] max-w-sm animate-slide-down overflow-visible"
                    >
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

                {isLoading ? (
                    <div className="text-ink-muted">Loading your books...</div>
                ) : isEmpty ? (
                    <div className="text-ink-muted">No books yet. Add one to get started.</div>
                ) : null}

                {/* Book Content Area */}
                <div ref={scrollContainerRef} className="flex-1 min-h-0 flex flex-col pt-1">
                    <div className="relative h-full overflow-hidden rounded-[1.8rem] bg-card/60 dark:bg-card/40 shadow-soft">
                        <div className="pointer-events-none absolute -left-8 -top-6 h-20 w-20 rounded-full bg-accent-soft blur-3xl" />
                        <div className="pointer-events-none absolute right-4 top-4 h-14 w-14 rounded-full bg-cta/30 blur-2xl" />
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
                onListen={handleTooltipListen}
                onRetry={wordInspector.retry}
                isListening={isListening}
                onPlaySentence={handlePlaySentence}
                onPlayFromWord={handlePlayFromWord}
            />
        </section>
    );
}
