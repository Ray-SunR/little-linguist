"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, FastForward, Sparkles, Wand2 } from "lucide-react";
import { tokenizeText } from "../../lib/tokenization";
import { RemoteTtsNarrationProvider } from "../../lib/narration/remote-tts-provider";
import { WebSpeechNarrationProvider } from "../../lib/narration/web-speech-provider";
import { PollyNarrationProvider } from "../../lib/narration/polly-provider";
import { useAudioNarration } from "../../hooks/use-audio-narration";
import { useWordHighlighter } from "../../hooks/use-word-highlighter";
import { useWordInspector } from "../../hooks/use-word-inspector";
import { DEFAULT_SPEED, type SpeedOption } from "../../lib/speed-options";
import { playWordOnly, playSentence } from "../../lib/tts/tooltip-tts";
import type { Book, ViewMode } from "../../lib/types";
import BookSelect from "./book-select";
import BookLayout from "./book-layout";
import ControlPanel from "./control-panel";
import WordInspectorTooltip from "./word-inspector-tooltip";

type ReaderShellProps = {
  books: Book[];
};

export default function ReaderShell({ books }: ReaderShellProps) {
  const [selectedBookId, setSelectedBookId] = useState(books[0]?.id ?? "");
  const [playbackSpeed, setPlaybackSpeed] = useState<SpeedOption>(DEFAULT_SPEED);
  const [isListening, setIsListening] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("scroll");
  const [controlsExpanded, setControlsExpanded] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const selectedBook = books.find((book) => book.id === selectedBookId) ?? null;
  const isLoading = false;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);

  const tokens = useMemo(() => {
    if (!selectedBook) return [];
    return tokenizeText(selectedBook.text);
  }, [selectedBook]);

  const provider = useMemo(() => {
    const providerType = process.env.NEXT_PUBLIC_NARRATION_PROVIDER ?? "web_speech";
    if (providerType === "remote_tts") {
      return new RemoteTtsNarrationProvider(selectedBook?.audioUrl);
    }
    if (providerType === "polly") {
      const creds = {
        accessKeyId: process.env.NEXT_PUBLIC_POLLY_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.NEXT_PUBLIC_POLLY_SECRET_ACCESS_KEY ?? "",
        region: process.env.NEXT_PUBLIC_POLLY_REGION ?? "us-east-1",
        voiceId: process.env.NEXT_PUBLIC_POLLY_VOICE_ID ?? "Joanna",
      };
      return new PollyNarrationProvider(creds);
    }
    return new WebSpeechNarrationProvider();
  }, [selectedBook?.audioUrl]);

  // Separate provider for tooltip TTS to avoid conflicts with main narration
  const tooltipProvider = useMemo(() => {
    const providerType = process.env.NEXT_PUBLIC_NARRATION_PROVIDER ?? "web_speech";
    if (providerType === "polly") {
      const creds = {
        accessKeyId: process.env.NEXT_PUBLIC_POLLY_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.NEXT_PUBLIC_POLLY_SECRET_ACCESS_KEY ?? "",
        region: process.env.NEXT_PUBLIC_POLLY_REGION ?? "us-east-1",
        voiceId: process.env.NEXT_PUBLIC_POLLY_VOICE_ID ?? "Joanna",
      };
      return new PollyNarrationProvider(creds);
    }
    // For web_speech and remote_tts, use Web Speech as it's simpler for short audio
    return new WebSpeechNarrationProvider();
  }, []);

  const narration = useAudioNarration({
    provider,
    bookId: selectedBook?.id ?? "",
    rawText: selectedBook?.text ?? "",
    tokens,
    speed: playbackSpeed,
  });

  const currentWordIndex = useWordHighlighter({
    state: narration.state,
    currentTimeSec: narration.currentTimeSec,
    wordTimings: narration.wordTimings,
    tokensCount: tokens.length,
    durationMs: narration.durationMs,
    boundaryWordIndex: narration.boundaryWordIndex,
  });

  const wordInspector = useWordInspector();

  const isEmpty = books.length === 0;
  const goNextBook = useCallback(() => {
    if (!books.length) return;
    const currentIndex = books.findIndex((book) => book.id === selectedBookId);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % books.length;
    setSelectedBookId(books[nextIndex].id);
  }, [books, selectedBookId]);

  const handleWordClick = useCallback(async (word: string, element: HTMLElement, wordIndex: number) => {
    // Pause main narration when inspecting word
    if (narration.state === "PLAYING") {
      await narration.pause();
    }

    await wordInspector.openWord(word, element, wordIndex);
  }, [narration, wordInspector]);

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

    // Close the popover
    wordInspector.close();

    // Start playback from the selected word
    await narration.playFromWord(wordIndex);
  }, [wordInspector, narration]);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

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

  // Auto-scroll to highlighted word during playback
  useEffect(() => {
    if (currentWordIndex === null || narration.state !== "PLAYING") return;

    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    // Find the highlighted word element
    const wordElement = scrollContainer.querySelector(
      `[data-word-index="${currentWordIndex}"]`
    ) as HTMLElement;

    if (!wordElement) return;

    if (viewMode === "spread") {
      // In spread mode, find the horizontal scroll container
      const horizontalContainer = scrollContainer.querySelector(".book-spread-scroll-container") as HTMLElement;
      if (horizontalContainer) {
        const containerWidth = horizontalContainer.clientWidth;
        // Word offset relative to the scrollable content
        const wordOffset = wordElement.offsetLeft;
        const currentScrollLeft = horizontalContainer.scrollLeft;

        // Determine which spread (2 columns) the word belongs to
        // We add some buffer to avoid flickering at the very edge of a page
        const targetSpreadIndex = Math.floor(wordOffset / containerWidth);
        const targetScrollLeft = targetSpreadIndex * containerWidth;

        // Only scroll if the word is not in the current visible spread
        const isVisible = wordOffset >= currentScrollLeft && wordOffset < currentScrollLeft + containerWidth;

        if (!isVisible) {
          horizontalContainer.scrollTo({
            left: targetScrollLeft,
            behavior: "smooth",
          });
        }
      }
    } else {
      // Continuous mode - standard scrollIntoView works best
      wordElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentWordIndex, narration.state, viewMode]);

  return (
    <section className="relative mx-auto flex h-full w-full max-w-5xl flex-col gap-4 sm:gap-5">
      <div className="pointer-events-none absolute -left-6 top-6 h-28 w-28 blob blob-1" />
      <div className="pointer-events-none absolute right-8 top-16 h-20 w-20 blob blob-2" />
      <div className="pointer-events-none absolute -right-6 bottom-10 h-24 w-24 blob blob-3" />

      <div className="card-frame rounded-card card-glow p-4 sm:p-5 flex flex-col overflow-hidden">
        <header className="flex items-center gap-2 sm:gap-3 mb-3">
          <Link
            href="/"
            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white text-ink shadow-soft hover:shadow-lg transition-shadow flex-shrink-0"
            aria-label="Back to home"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
          </Link>

          {/* Book Title as Selector */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-accent flex-shrink-0" aria-hidden />
            <div className="flex-1 min-w-0">
              <BookSelect
                books={books}
                selectedBookId={selectedBookId}
                onSelect={setSelectedBookId}
                label=""
              />
            </div>
          </div>

          {/* Inline Play/Pause Button */}
          <button
            type="button"
            onClick={narration.state === "PLAYING" ? narration.pause : narration.play}
            disabled={isEmpty || narration.isPreparing}
            className="inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-cta text-cta-ink shadow-soft hover:shadow-lg transition-all disabled:opacity-50 flex-shrink-0"
            aria-label={narration.state === "PLAYING" ? "Pause" : "Play"}
            title={narration.state === "PLAYING" ? "Pause (Space)" : "Play (Space)"}
          >
            {narration.state === "PLAYING" ? (
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
            className="inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white text-ink shadow-soft hover:shadow-lg transition-all disabled:opacity-50 flex-shrink-0"
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
            className="ghost-btn inline-flex items-center gap-1 sm:gap-2 text-sm font-bold px-2 py-1.5 sm:px-3 sm:py-2 flex-shrink-0"
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
              isDisabled={isEmpty || narration.isPreparing}
            />
          </div>
        )}

        {narration.error ? (
          <div className="mb-3 rounded-card bg-cta px-4 py-3 text-base font-semibold text-cta-ink">
            {narration.error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="text-ink-muted">Loading your books...</div>
        ) : isEmpty ? (
          <div className="text-ink-muted">No books yet. Add one to get started.</div>
        ) : null}

        {/* Standardized Book Content Area */}
        <div ref={scrollContainerRef} className="flex-1 min-h-0 flex flex-col pt-1">
          <div className="relative h-full overflow-hidden rounded-[1.8rem] bg-white/90 shadow-soft">
            <div className="pointer-events-none absolute -left-8 -top-6 h-20 w-20 rounded-full bg-accent-soft blur-3xl" />
            <div className="pointer-events-none absolute right-4 top-4 h-14 w-14 rounded-full bg-cta/30 blur-2xl" />
            <BookLayout
              tokens={tokens}
              images={selectedBook?.images}
              currentWordIndex={currentWordIndex}
              onWordClick={handleWordClick}
              viewMode={viewMode}
              isPlaying={narration.state === "PLAYING"}
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
