"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
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
import BookSelect from "./book-select";
import BookText from "./book-text";
import PlaybackControls from "./playback-controls";
import WordInspectorTooltip from "./word-inspector-tooltip";

type Book = {
  id: string;
  title: string;
  text: string;
  audioUrl?: string;
};

type ReaderShellProps = {
  books: Book[];
};

export default function ReaderShell({ books }: ReaderShellProps) {
  const [selectedBookId, setSelectedBookId] = useState(books[0]?.id ?? "");
  const [playbackSpeed, setPlaybackSpeed] = useState<SpeedOption>(DEFAULT_SPEED);
  const [isListening, setIsListening] = useState(false);
  const selectedBook = books.find((book) => book.id === selectedBookId) ?? null;
  const isLoading = false;

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

  const handleWordClick = useCallback(async (word: string, element: HTMLElement) => {
    // Pause main narration when inspecting word
    if (narration.state === "PLAYING") {
      await narration.pause();
    }
    
    await wordInspector.openWord(word, element);
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

  return (
    <section className="relative mx-auto flex h-full w-full max-w-5xl flex-col gap-4 sm:gap-5">
      <div className="pointer-events-none absolute -left-6 top-6 h-28 w-28 blob blob-1" />
      <div className="pointer-events-none absolute right-8 top-16 h-20 w-20 blob blob-2" />
      <div className="pointer-events-none absolute -right-6 bottom-10 h-24 w-24 blob blob-3" />

      <div className="card-frame rounded-card card-glow p-4 sm:p-5 flex flex-col overflow-hidden">
        <header className="flex items-center gap-3 mb-4">
          <Link
            href="/"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-ink shadow-soft hover:shadow-lg transition-shadow flex-shrink-0"
            aria-label="Back to home"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </Link>
          
          {/* Book Title as Selector - Center */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Sparkles className="h-5 w-5 text-accent flex-shrink-0" aria-hidden />
            <div className="flex-1 min-w-0">
              <BookSelect
                books={books}
                selectedBookId={selectedBookId}
                onSelect={setSelectedBookId}
                label=""
              />
            </div>
          </div>

          <button
            type="button"
            className="ghost-btn inline-flex items-center gap-2 text-sm font-bold px-3 py-2 flex-shrink-0"
            onClick={goNextBook}
            disabled={isEmpty}
            aria-label="Next story"
            title="Next story (N)"
          >
            Next
            <FastForward className="h-4 w-4" aria-hidden />
          </button>
        </header>

        {narration.error ? (
          <div className="mb-4 rounded-card bg-cta px-4 py-3 text-base font-semibold text-cta-ink">
            {narration.error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="text-ink-muted">Loading your books...</div>
        ) : isEmpty ? (
          <div className="text-ink-muted">No books yet. Add one to get started.</div>
        ) : null}

        {/* Playback Controls - Sticky */}
        {!isEmpty && (
          <div className="mb-4 flex-shrink-0">
            <PlaybackControls
              state={narration.state}
              onPlay={narration.play}
              onPause={narration.pause}
              onStop={narration.stop}
              speed={playbackSpeed}
              onSpeedChange={setPlaybackSpeed}
              isPreparing={narration.isPreparing}
              isDisabled={isEmpty}
              currentProgress={narration.durationMs && narration.durationMs > 0 ? (narration.currentTimeSec / (narration.durationMs / 1000)) * 100 : 0}
              durationMs={narration.durationMs ?? 0}
              currentTimeSec={narration.currentTimeSec}
            />
          </div>
        )}

        {/* Scrollable Book Content */}
        <div className="flex-1 overflow-y-auto space-y-4">
          <div className="relative overflow-hidden rounded-[1.8rem] bg-white/90 shadow-soft">
            <div className="pointer-events-none absolute -left-8 -top-6 h-20 w-20 rounded-full bg-accent-soft blur-3xl" />
            <div className="pointer-events-none absolute right-4 top-4 h-14 w-14 rounded-full bg-cta/30 blur-2xl" />
            <BookText 
              tokens={tokens} 
              currentWordIndex={currentWordIndex}
              onWordClick={handleWordClick}
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
      />
    </section>
  );
}
