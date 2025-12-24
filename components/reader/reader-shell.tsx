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
import BookSelect from "./book-select";
import BookText from "./book-text";
import PlaybackControls from "./playback-controls";

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
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
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

  const isEmpty = books.length === 0;
  const goNextBook = useCallback(() => {
    if (!books.length) return;
    const currentIndex = books.findIndex((book) => book.id === selectedBookId);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % books.length;
    setSelectedBookId(books[nextIndex].id);
  }, [books, selectedBookId]);

  return (
    <section className="relative mx-auto flex w-full max-w-5xl flex-col gap-4 sm:gap-5">
      <div className="pointer-events-none absolute -left-6 top-6 h-28 w-28 blob blob-1" />
      <div className="pointer-events-none absolute right-8 top-16 h-20 w-20 blob blob-2" />
      <div className="pointer-events-none absolute -right-6 bottom-10 h-24 w-24 blob blob-3" />

      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-ink shadow-soft"
            aria-label="Back to home"
          >
            <ArrowLeft className="h-6 w-6" aria-hidden />
          </Link>
          <p className="inline-pill text-[11px] font-semibold uppercase tracking-wide">Calm Listening</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 text-center sm:justify-start sm:text-left">
          <div className="emoji-badge" aria-hidden>
            😊
          </div>
          <div className="flex flex-col items-start gap-1">
            <h1 className="text-2xl font-extrabold section-title sm:text-3xl">Story Time</h1>
            <p className="max-w-2xl text-sm text-ink-muted sm:text-base">
              Pick a cozy story, press play, and follow along with the glowing words.
            </p>
          </div>
        </div>
      </header>

      <div className="card-frame rounded-card card-glow p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" aria-hidden />
            <div>
              <p className="text-xs font-semibold text-ink-muted">Now Reading</p>
              <h2 className="text-2xl font-bold section-title">
                {selectedBook?.title ?? "Choose a book"}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="soft-chip text-sm">Kid mode</span>
            <button
              type="button"
              className="ghost-btn touch-target inline-flex items-center gap-2 text-sm"
              onClick={goNextBook}
              disabled={isEmpty}
              aria-label="Next book"
            >
              Next
              <FastForward className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>

        {narration.error ? (
          <div className="mb-4 rounded-card bg-cta px-4 py-3 text-base font-semibold text-cta-ink">
            {narration.error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="text-ink-muted">Loading your books...</div>
        ) : isEmpty ? (
          <div className="text-ink-muted">No books yet. Add one to get started.</div>
        ) : (
          <div className="mb-6 flex flex-col gap-3">
            <BookSelect
              books={books}
              selectedBookId={selectedBookId}
              onSelect={setSelectedBookId}
            />
          </div>
        )}

        <div className="space-y-4">
          <div className="book-illustration">
            <div className="absolute bottom-4 left-6 h-16 w-28 rounded-full bg-gradient-to-t from-green-400 to-lime-300 blur-xl" />
            <div className="absolute bottom-6 right-8 h-16 w-28 rounded-full bg-gradient-to-t from-green-500 to-lime-300 blur-xl" />
            <div className="relative z-10 flex flex-col items-center gap-2 text-white drop-shadow">
              <div className="h-16 w-24 rounded-full bg-white/90 blur-lg" />
              <span className="text-lg font-bold">Story Scene</span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[1.8rem] bg-white/80 shadow-soft">
            <div className="pointer-events-none absolute -left-8 -top-6 h-20 w-20 rounded-full bg-accent-soft blur-3xl" />
            <div className="pointer-events-none absolute right-4 top-4 h-14 w-14 rounded-full bg-cta/30 blur-2xl" />
            <BookText tokens={tokens} currentWordIndex={currentWordIndex} />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
          <span className="inline-pill">
            <Wand2 className="h-4 w-4" aria-hidden />
            Highlight magic on
          </span>
          <span className="inline-pill">Touch-friendly controls</span>
        </div>
      </div>

      <PlaybackControls
        state={narration.state}
        onPlay={narration.play}
        onPause={narration.pause}
        onStop={narration.stop}
        speed={playbackSpeed}
        onSpeedChange={setPlaybackSpeed}
        isPreparing={narration.isPreparing}
        isDisabled={isEmpty}
      />
    </section>
  );
}
