"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FastForward, ArrowLeft, RotateCcw, Heart } from "lucide-react";
import { LumoCharacter } from "@/components/ui/lumo-character";
import { useRouter, useSearchParams } from "next/navigation";
import Link from 'next/link';
import { useNarrationEngine, type NarrationShard } from "@/hooks/use-narration-engine";
import { useReaderPersistence } from "@/hooks/use-reader-persistence";
import { useWordInspector } from "@/hooks/use-word-inspector";
import { tokensToWordTokens } from "@/lib/core/books/token-adapter";
import { Token } from "@/lib/core/books/tokenizer";
import { DEFAULT_SPEED, type SpeedOption } from "@/lib/features/narration/internal/speed-options";
import { playSentence } from "@/lib/features/narration";
import { WebSpeechNarrationProvider } from "@/lib/features/narration/implementations/web-speech-provider";
import type { ViewMode } from "@/lib/core";
import { cn } from "@/lib/core";
import { useTutorial } from "@/components/tutorial/tutorial-context";
import { useWakeLock } from "@/hooks/use-wake-lock";

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
        is_favorite?: boolean;
    };
    updated_at?: string;
    cached_at?: number;
    owner_user_id?: string | null;
    assetTimestamps?: {
        metadata: string | null;
        text: string | null;
        tokens: string | null;
        images: string | null;
        audios: string | null;
    };
}

type SupabaseReaderShellProps = {
    books: SupabaseBook[];
    initialBookId?: string;
    childId: string | null;
    onBack?: () => void;
};

export default function SupabaseReaderShell({ books, initialBookId, childId, onBack }: SupabaseReaderShellProps) {
    const router = useRouter();
    const [selectedBookId, setSelectedBookId] = useState(initialBookId || "");
    const [playbackSpeed, setPlaybackSpeed] = useState<SpeedOption>(DEFAULT_SPEED);
    const [viewMode, setViewMode] = useState<ViewMode>("scroll");
    const [isMounted, setIsMounted] = useState(false);
    const [controlsExpanded, setControlsExpanded] = useState(false);
    const [theme, setTheme] = useState<"light" | "dark">("light");
    const [isMaximized, setIsMaximized] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);

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
            const { view_mode, playback_speed, is_favorite } = selectedBook.initialProgress;
            if (view_mode) setViewMode(view_mode as ViewMode);
            if (playback_speed) setPlaybackSpeed(playback_speed as SpeedOption);
            setIsFavorite(!!is_favorite);
        } else {
            setIsFavorite(false);
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

    const searchParams = useSearchParams();
    const isMission = searchParams.get('mission') === 'true';

    const isCompleted = wordTokens.length > 0 && currentWordIndex !== null && currentWordIndex >= Math.floor(wordTokens.length * 0.95);

    const { saveProgress } = useReaderPersistence({
        bookId: selectedBook?.id || "",
        childId,
        tokenIndex: currentWordIndex,
        shardIndex: currentShardIndex,
        time: currentTime,
        playbackState,
        viewMode,
        speed: playbackSpeed,
        isMission,
        // Mark as completed when user has reached >= 95% of the book
        isCompleted,
        title: selectedBook?.title || ""
    });

    // Use a custom event to notify the global navigation (ClayNav) about XP rewards
    const dispatchXpEvent = useCallback((reward: any) => {
        if (reward?.xp_earned > 0) {
            window.dispatchEvent(new CustomEvent('xp-earned', { detail: reward }));
        }
    }, []);

    // Watch for completion status to trigger reward check
    const lastCompletedRef = useRef(false);

    useEffect(() => {
        if (isCompleted && !lastCompletedRef.current) {
            // Transitions to completed! Trigger a forced save to get the reward
            saveProgress({ force: true }).then((res: any) => {
                dispatchXpEvent(res?.reward);
            }).catch(error => {
                console.error("Failed to save progress on completion:", error);
            });
        }
        lastCompletedRef.current = isCompleted;
    }, [isCompleted, saveProgress, dispatchXpEvent]);

    // Handle opening reward too
    useEffect(() => {
        if (selectedBookId && isMounted) {
            saveProgress({ force: true, isOpening: true }).then((res: any) => {
                dispatchXpEvent(res?.reward);
            }).catch(error => {
                console.error("Failed to save progress on opening:", error);
            });
        }
    }, [selectedBookId, isMounted, saveProgress, dispatchXpEvent]);

    const tooltipProvider = useMemo(() => new WebSpeechNarrationProvider(), []);
    const {
        openWord: openWordInspector,
        close: closeWordInspector,
        selectedWordIndex: inspectorSelectedWordIndex,
        insight: inspectorInsight,
        isLoading: isInspectorLoading,
        error: inspectorError,
        isOpen: isInspectorOpen,
        position: inspectorPosition,
        retry: retryInspector
    } = useWordInspector();

    const isEmpty = books.length === 0;

    const goNextBook = useCallback(async () => {
        if (!books.length) return;
        try {
            await saveProgress({ force: true, isExiting: true });
        } catch (error) {
            console.error("Failed to save progress before next book:", error);
        }
        const currentIndex = books.findIndex((book) => book.id === selectedBookId);
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % books.length;
        const nextBookId = books[nextIndex].id;
        router.push(`/reader/${nextBookId}`);
    }, [books, selectedBookId, saveProgress, router]);

    const handleRestart = useCallback(async () => {
        if (!selectedBookId) return;
        pause();
        await seekToWord(0);
        saveProgress({ force: true }).catch(error => {
            console.error("Failed to save progress on restart:", error);
        });
        lastScrolledBookIdRef.current = null;
    }, [selectedBookId, pause, seekToWord, saveProgress]);

    // Use a ref for playbackState to keep handeWordClick stable
    const playbackStateRef = useRef(playbackState);
    useEffect(() => {
        playbackStateRef.current = playbackState;
    }, [playbackState]);

    const { completeStep } = useTutorial();

    // Wake Lock Integration
    const { request: requestWakeLock, release: releaseWakeLock } = useWakeLock();

    useEffect(() => {
        if (playbackState === "playing" || playbackState === "buffering") {
            requestWakeLock();
        } else {
            releaseWakeLock();
        }
    }, [playbackState, requestWakeLock, releaseWakeLock]);

    const handleWordClick = useCallback(async (word: string, element: HTMLElement, wordIndex: number) => {
        if (playbackStateRef.current === "playing") pause();
        await openWordInspector(word, element, wordIndex);
        await seekToWord(wordIndex);
        completeStep('reader-text-content'); // Tutorial Step: Click Word
    }, [pause, openWordInspector, seekToWord, completeStep]);
    // Note: removed playbackState from dependencies


    const handlePlaySentence = useCallback(async (sentence: string) => {
        try {
            await playSentence(sentence, tooltipProvider);
        } catch (error) {
            console.error("Failed to play sentence TTS:", error);
        }
    }, [tooltipProvider]);

    const handlePlayFromWord = useCallback(async () => {
        const wordIndex = inspectorSelectedWordIndex;
        if (wordIndex === null) return;
        closeWordInspector();
        await seekToWord(wordIndex);
        saveProgress({ force: true }).catch(error => {
            console.error("Failed to save progress on play from word:", error);
        });
        await play();
    }, [inspectorSelectedWordIndex, closeWordInspector, seekToWord, play, saveProgress]);

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

    const toggleFavorite = useCallback(async () => {
        if (!selectedBookId || !childId) return;

        const newFavState = !isFavorite;
        setIsFavorite(newFavState); // Optimistic UI

        try {
            const res = await fetch(`/api/books/${selectedBookId}/favorite`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    childId: childId,
                    isFavorite: newFavState
                })
            });

            if (!res.ok) {
                // Rollback on error
                setIsFavorite(!newFavState);
                console.error('Failed to toggle favorite');
            }
        } catch (err) {
            setIsFavorite(!newFavState);
            console.error('Failed to toggle favorite:', err);
        }
    }, [selectedBookId, childId, isFavorite]);

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
            const behavior = isNewBook ? "auto" : "smooth";
            if (viewMode === "spread") {
                const horizontalContainer = scrollContainer.querySelector(".book-spread-scroll-container") as HTMLElement;
                if (horizontalContainer) {
                    const containerWidth = horizontalContainer.clientWidth;
                    const wordOffset = wordElement.offsetLeft;
                    const targetScrollLeft = Math.floor(wordOffset / containerWidth) * containerWidth;
                    horizontalContainer.scrollTo({ left: targetScrollLeft, behavior: isNewBook ? "auto" : "smooth" });
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
        <section className={cn(
            "relative mx-auto flex h-full w-full flex-1 flex-col overflow-hidden overscroll-contain transition-all duration-500 ease-in-out",
            isMaximized ? "max-w-none px-0 py-0 gap-0" : "max-w-7xl px-4 py-2 sm:py-4 gap-4 sm:gap-5"
        )}>
            {!isMaximized && (
                <>
                    <div className="pointer-events-none absolute -left-6 top-6 h-28 w-28 blob blob-1" />
                    <div className="pointer-events-none absolute right-8 top-16 h-20 w-20 blob blob-2" />
                    <div className="pointer-events-none absolute -right-6 bottom-10 h-24 w-24 blob blob-3" />
                </>
            )}

            <div className={`glass-card flex flex-col flex-1 min-h-0 overflow-hidden transition-all duration-500 ${isMaximized ? 'rounded-none border-none bg-white dark:bg-[#0b0c14]' : ''}`}>
                <header className={cn(
                    "relative z-[60] flex items-center flex-shrink-0 gap-1.5 sm:gap-3 transition-all duration-300",
                    isMaximized ? "p-2 sm:p-4" : "p-4 sm:px-5 sm:pt-5 sm:pb-3",
                    "bg-white/95 dark:bg-[#1c1f2f]/95 backdrop-blur-md border-b border-purple-100/20 dark:border-white/5"
                )}>
                    <button
                        id="reader-back-to-library"
                        data-tour-target="reader-back-to-library"
                        onClick={async () => {
                            try {
                                await saveProgress({ force: true, isExiting: true });
                            } catch (error) {
                                console.error("Failed to save progress on exit:", error);
                            }

                            if (window.history.length > 1) {
                                router.back();
                            } else {
                                const lastUrl = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('lastLibraryUrl') : null;
                                router.push(lastUrl || '/library');
                            }
                        }}
                        className="inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white/80 dark:bg-card text-ink shadow-md hover:shadow-lg hover:scale-105 transition-all flex-shrink-0 border border-purple-100 dark:border-transparent"
                        aria-label="Back to Library"
                        title="Back to Library"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>

                    <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                        <div className="relative">
                            <LumoCharacter size="sm" className="flex flex-shrink-0" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-lg sm:text-xl font-fredoka font-bold text-ink truncate leading-none">
                                {selectedBook?.title || "Book Reader"}
                            </h1>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={toggleFavorite}
                        disabled={isEmpty || !childId || !selectedBookId}
                        className={cn(
                            "inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all flex-shrink-0 border disabled:opacity-50",
                            isFavorite
                                ? "bg-pink-500 border-pink-400 text-white"
                                : "bg-white/80 dark:bg-card text-slate-400 border-purple-100 dark:border-transparent"
                        )}
                        aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                        title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                    >
                        <Heart className={cn("h-4 w-4 sm:h-5 sm:w-5", isFavorite && "fill-white")} />
                    </button>

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
                        id="reader-play-btn"
                        data-tour-target="reader-play-btn"
                        type="button"
                        onClick={() => {
                            if (playbackState === "playing") {
                                pause();
                            } else {
                                play();
                                completeStep('reader-play-btn');
                            }
                        }}
                        disabled={isEmpty || isPreparing}
                        className="inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #8B4BFF, #7C3AED)' }}
                        aria-label={playbackState === "playing" ? "Pause" : "Play"}
                        title={playbackState === "playing" ? "Pause (Space)" : "Play (Space)"}
                    >
                        {isPreparing ? (
                            <motion.img
                                src="/logo.png"
                                className="h-5 w-5 sm:h-6 sm:w-6"
                                animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            />
                        ) :
                            playbackState === "playing" ? (
                                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
                            ) : (
                                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                            )}
                    </button>

                    <button
                        id="reader-settings-btn"
                        data-tour-target="reader-settings-btn"
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
                    <div ref={controlsRef} className={cn(
                        "absolute z-[70] animate-slide-down shadow-2xl",
                        isMaximized ? "right-4 top-[4.5rem] w-[calc(100%-2rem)]" : "right-8 top-[5.5rem] w-[calc(100%-4rem)]",
                        "max-w-sm"
                    )}>
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

                <div ref={scrollContainerRef} className={cn(
                    "flex-1 min-h-0 flex flex-col",
                    !isMaximized && "px-4 pb-4 sm:px-5 sm:pb-5"
                )}>
                    <div id="reader-text-content" data-tour-target="reader-text-content" className={cn(
                        "relative h-full overflow-hidden bg-card/60 dark:bg-card/40 shadow-soft",
                        isMaximized ? "rounded-none" : "rounded-b-[2rem] sm:rounded-b-[2.2rem]"
                    )}>
                        <BookLayout
                            bookId={selectedBookId}
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
                insight={inspectorInsight}
                isLoading={isInspectorLoading}
                error={inspectorError}
                isOpen={isInspectorOpen}
                position={inspectorPosition}
                onClose={closeWordInspector}
                onRetry={retryInspector}
                onPlaySentence={handlePlaySentence}
                onPlayFromWord={handlePlayFromWord}
                provider={tooltipProvider}
                bookId={selectedBookId}
            />
        </section>
    );
}
