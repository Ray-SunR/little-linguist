"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, Sparkles, X, BookOpen, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/core/utils/cn";
import {
    DEMO_TOKENS,
    DEMO_WORD_INSIGHTS,
    MAGIC_WORD_INDICES,
    DEMO_BOOK_ID,
    DEMO_WORD_TIMINGS,
} from "./demo-data";

interface WordInsight {
    word: string;
    definition: string;
    example: string;
    emoji: string;
}

export function ReaderDemo() {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentWordIndex, setCurrentWordIndex] = useState<number | null>(null);
    const [selectedWord, setSelectedWord] = useState<WordInsight | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [coverUrl, setCoverUrl] = useState<string | null>(null);
    const [isAudioLoading, setIsAudioLoading] = useState(true);
    const [audioError, setAudioError] = useState<string | null>(null);
    const audioTimings = DEMO_WORD_TIMINGS;
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    // Last word index in demo text ("fall" at index 38)
    const DEMO_LAST_WORD_INDEX = 38;

    // Fetch audio and cover URLs from the book API
    useEffect(() => {
        const fetchAssets = async () => {
            try {
                setIsAudioLoading(true);
                setAudioError(null);

                // Fetch book data with audio included
                const res = await fetch(`/api/books/${DEMO_BOOK_ID}?include=audio`);
                if (!res.ok) {
                    throw new Error("Failed to fetch book");
                }
                const book = await res.json();

                // Get cover URL
                if (book.coverImageUrl) {
                    setCoverUrl(book.coverImageUrl);
                }

                // Get audio URL from the first shard
                if (book.audios && book.audios.length > 0 && book.audios[0].audio_path) {
                    setAudioUrl(book.audios[0].audio_path);
                } else {
                    setAudioError("Audio unavailable");
                }
            } catch (err) {
                console.error("Failed to fetch demo assets:", err);
                setAudioError("Failed to load audio");
            } finally {
                setIsAudioLoading(false);
            }
        };
        fetchAssets();
    }, []);

    // Sync word highlighting with audio playback (same approach as use-narration-engine)
    const syncHighlight = useCallback(() => {
        if (!audioRef.current || !isPlaying || audioTimings.length === 0) return;

        const currentTimeMs = audioRef.current.currentTime * 1000;

        // Find the current word based on timing (same logic as narration engine)
        const mark = audioTimings.reduce<{ start: number; end: number; absIndex: number } | null>((prev, curr, idx) => {
            return (curr.start <= currentTimeMs && curr.start > (prev?.start ?? -1)) ? { ...curr, absIndex: idx } : prev;
        }, null);

        if (mark) {
            // Stop playback when we reach past the demo text
            if (mark.absIndex > DEMO_LAST_WORD_INDEX) {
                audioRef.current.pause();
                setIsPlaying(false);
                setCurrentWordIndex(DEMO_LAST_WORD_INDEX); // Keep last word highlighted
                return;
            }
            setCurrentWordIndex(mark.absIndex);
        }

        animationFrameRef.current = requestAnimationFrame(syncHighlight);
    }, [isPlaying, audioTimings]);

    // Start/stop animation frame loop
    useEffect(() => {
        if (isPlaying) {
            animationFrameRef.current = requestAnimationFrame(syncHighlight);
        } else {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        }
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isPlaying, syncHighlight]);

    const handlePlay = async () => {
        if (!audioUrl) {
            setAudioError("Audio not available");
            return;
        }

        try {
            if (!audioRef.current) {
                const audio = new Audio(audioUrl);
                audio.addEventListener("ended", () => {
                    setIsPlaying(false);
                    setCurrentWordIndex(null);
                });
                audio.addEventListener("error", () => {
                    setAudioError("Failed to play audio");
                    setIsPlaying(false);
                });
                audioRef.current = audio;
            }

            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                audioRef.current.currentTime = 0;
                await audioRef.current.play();
                setIsPlaying(true);
            }
        } catch (err) {
            console.error("Play error:", err);
            setAudioError("Failed to play audio");
        }
    };

    const handleWordClick = (wordText: string, wordIndex: number) => {
        // Only show insight for magic words
        if (!MAGIC_WORD_INDICES.has(wordIndex)) return;

        const insight = DEMO_WORD_INSIGHTS[wordText.toLowerCase()];
        if (insight) {
            setSelectedWord(insight);
        }
    };

    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    // Determine button state
    const isButtonDisabled = isAudioLoading || (!audioUrl && !audioError);
    const buttonText = isAudioLoading
        ? "Loading..."
        : audioError
            ? audioError
            : isPlaying
                ? "Stop"
                : "Listen to Lumo Read";

    return (
        <section className="relative py-12 md:py-16 px-6 lg:px-16 bg-gradient-to-b from-white/60 to-amber-50/30">
            <div className="max-w-4xl mx-auto">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-6 md:mb-10"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 text-amber-700 font-fredoka font-bold text-sm mb-4">
                        <Sparkles className="w-4 h-4" />
                        Try It Now
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black font-fredoka text-ink mb-3">
                        Words Come <span className="text-amber-500">Alive</span>
                    </h2>
                    <p className="text-lg text-ink-muted font-nunito max-w-xl mx-auto">
                        Tap play to hear Lumo read. Tap any{" "}
                        <span className="text-purple-600 font-bold">glowing word</span> to
                        discover its meaning!
                    </p>
                </motion.div>

                {/* Demo Reader Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="relative bg-white rounded-[2rem] shadow-xl border-4 border-amber-100 overflow-hidden"
                >
                    {/* Reader Content */}
                    <div className="p-6 md:p-10">
                        {/* Book Title Bar with Cover */}
                        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-amber-100">
                            {coverUrl ? (
                                <div className="relative w-16 h-20 rounded-xl overflow-hidden shadow-md flex-shrink-0">
                                    <Image
                                        src={coverUrl}
                                        alt="Steve's Blocky Building Adventure cover"
                                        fill
                                        className="object-cover"
                                        sizes="64px"
                                        unoptimized
                                    />
                                </div>
                            ) : (
                                <div className="w-16 h-20 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                                    <BookOpen className="w-6 h-6 text-amber-600" />
                                </div>
                            )}
                            <div>
                                <h3 className="font-fredoka font-bold text-ink text-lg leading-tight">
                                    Steve&apos;s Blocky Building Adventure
                                </h3>
                                <p className="text-xs text-ink-muted font-nunito">PreK Level • Minecraft Theme</p>
                            </div>
                        </div>

                        {/* Text Display */}
                        <div className="text-xl md:text-2xl leading-relaxed font-nunito font-medium text-ink select-none">
                            {DEMO_TOKENS.map((token, idx) => {
                                if (token.type === "w" && token.i !== undefined) {
                                    const isMagicWord = MAGIC_WORD_INDICES.has(token.i);
                                    const isHighlighted = currentWordIndex === token.i;

                                    return (
                                        <motion.span
                                            key={idx}
                                            onClick={() => handleWordClick(token.t, token.i!)}
                                            className={cn(
                                                "relative inline-block cursor-pointer rounded-md px-0.5 transition-all duration-150",
                                                isMagicWord && "text-purple-600 font-bold",
                                                isMagicWord && !isHighlighted && "hover:bg-purple-100",
                                                isHighlighted && "bg-amber-300 text-amber-900 scale-105"
                                            )}
                                            animate={
                                                isHighlighted
                                                    ? { scale: 1.05, y: -2 }
                                                    : { scale: 1, y: 0 }
                                            }
                                        >
                                            {token.t}
                                            {isMagicWord && !isHighlighted && (
                                                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                                            )}
                                        </motion.span>
                                    );
                                }

                                if (token.type === "s") {
                                    return token.t === "\n" ? (
                                        <br key={idx} />
                                    ) : (
                                        <span key={idx}>{token.t}</span>
                                    );
                                }

                                return <span key={idx}>{token.t}</span>;
                            })}
                        </div>
                    </div>

                    {/* Play Controls */}
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 md:p-6 flex items-center justify-between border-t border-amber-100">
                        <button
                            onClick={handlePlay}
                            disabled={isButtonDisabled}
                            className={cn(
                                "flex items-center gap-3 px-6 py-3 rounded-2xl font-fredoka font-bold text-white shadow-lg transition-all",
                                isPlaying
                                    ? "bg-red-500 hover:bg-red-600"
                                    : audioError
                                        ? "bg-gray-400"
                                        : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600",
                                isButtonDisabled && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            {isAudioLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Loading...
                                </>
                            ) : isPlaying ? (
                                <>
                                    <VolumeX className="w-5 h-5" />
                                    Stop
                                </>
                            ) : (
                                <>
                                    <Volume2 className="w-5 h-5" />
                                    {buttonText}
                                </>
                            )}
                        </button>

                        <Link
                            href={`/reader/${DEMO_BOOK_ID}`}
                            className="hidden md:flex items-center gap-2 px-5 py-3 rounded-2xl bg-white border-2 border-amber-200 text-amber-700 font-fredoka font-bold hover:bg-amber-50 transition-all"
                        >
                            Read Full Story
                            <span className="text-lg">→</span>
                        </Link>
                    </div>
                </motion.div>

                {/* CTA Below */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="text-center mt-6 md:mt-8"
                >
                    <Link
                        href="/library"
                        className="inline-flex items-center gap-2 text-purple-600 font-fredoka font-bold hover:underline"
                    >
                        Explore 50+ more books in the library
                        <span>→</span>
                    </Link>
                </motion.div>
            </div>

            {/* Word Insight Popup */}
            <AnimatePresence>
                {selectedWord && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
                        onClick={() => setSelectedWord(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.8, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.8, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full border-4 border-purple-100"
                        >
                            <button
                                onClick={() => setSelectedWord(null)}
                                className="absolute top-3 right-3 p-2 rounded-full hover:bg-slate-100 text-slate-400"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="text-center">
                                <div className="text-5xl mb-3">{selectedWord.emoji}</div>
                                <h3 className="text-2xl font-fredoka font-black text-purple-600 mb-2">
                                    {selectedWord.word}
                                </h3>
                                <p className="text-lg text-ink font-nunito font-medium mb-4">
                                    {selectedWord.definition}
                                </p>
                                <div className="bg-purple-50 rounded-xl p-4">
                                    <p className="text-sm text-purple-700 font-nunito italic">
                                        &quot;{selectedWord.example}&quot;
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}
