"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, Sparkles, X, BookOpen, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/core/utils/cn";
import {
    DEMO_BOOKS,
    DemoBook,
} from "./demo-data";
import { ArrowRight, Sparkles as SparklesIcon, Wand2 } from "lucide-react";

interface WordInsight {
    word: string;
    definition: string;
    example: string;
    emoji: string;
}

export function ReaderDemo() {
    const [activeIndex, setActiveIndex] = useState(0);
    const book = DEMO_BOOKS[activeIndex];

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentWordIndex, setCurrentWordIndex] = useState<number | null>(null);
    const [selectedWord, setSelectedWord] = useState<WordInsight | null>(null);
    const [isMagicLoading, setIsMagicLoading] = useState(false);
    const [magicResult, setMagicResult] = useState<{ sentence: string; emoji: string } | null>(null);

    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [coverUrl, setCoverUrl] = useState<string | null>(null);
    const [isAudioLoading, setIsAudioLoading] = useState(true);
    const [audioError, setAudioError] = useState<string | null>(null);
    const audioTimings = book.timings;
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    // Last word index in current demo book
    const lastWordIndex = book.tokens.length - 1;

    // Fetch audio and cover URLs from the book API
    useEffect(() => {
        const fetchAssets = async () => {
            try {
                setIsAudioLoading(true);
                setAudioError(null);

                // Stop any current audio
                if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current = null;
                }
                setIsPlaying(false);
                setCurrentWordIndex(null);

                // Fetch book data with audio included
                const res = await fetch(`/api/books/${book.id}?include=audio`);
                if (!res.ok) {
                    throw new Error("Failed to fetch book");
                }
                const bookData = await res.json();

                // Get cover URL
                if (bookData.coverImageUrl) {
                    setCoverUrl(bookData.coverImageUrl);
                }

                // Get audio URL from the first shard
                if (bookData.audios && bookData.audios.length > 0 && bookData.audios[0].audio_path) {
                    setAudioUrl(bookData.audios[0].audio_path);
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
    }, [book.id]);

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
            if (mark.absIndex > lastWordIndex) {
                audioRef.current.pause();
                setIsPlaying(false);
                setCurrentWordIndex(lastWordIndex); // Keep last word highlighted
                return;
            }
            setCurrentWordIndex(mark.absIndex);
        }

        animationFrameRef.current = requestAnimationFrame(syncHighlight);
    }, [isPlaying, audioTimings, lastWordIndex]);

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
        if (!book.magicWordIndices.has(wordIndex)) return;

        const insight = book.insights[wordText.toLowerCase()];
        if (insight) {
            setSelectedWord(insight);
            setMagicResult(null); // Reset magic sentence when clicking a new word
        }
    };

    const handleNextBook = () => {
        const nextIdx = (activeIndex + 1) % DEMO_BOOKS.length;
        setActiveIndex(nextIdx);
    };

    const handleMagicSentence = async () => {
        if (!selectedWord) return;
        setIsMagicLoading(true);
        // Simulate magic sentence generation for the demo
        await new Promise((r) => setTimeout(r, 1500));

        const mockMagicSentences: Record<string, { sentence: string, emoji: string }> = {
            "blocky": {
                sentence: "Lumo built a blocky house for his pet robot!",
                emoji: "🤖"
            },
            "square": {
                sentence: "The square pizza was cut into tiny blocky pieces!",
                emoji: "🍕"
            },
            "stacks": {
                sentence: "She stacks the colorful blocks into a giant castle!",
                emoji: "🏰"
            },
            "tall": {
                sentence: "A tall giraffe peeked over the blocky wall!",
                emoji: "🦒"
            },
            "fluffy": {
                sentence: "The fluffy clouds looked like sweet cotton candy!",
                emoji: "🍭"
            },
            "climbs": {
                sentence: "Alex climbs the mountain to high-five a comet!",
                emoji: "☄️"
            }
        };

        const result = mockMagicSentences[selectedWord.word.toLowerCase()] || {
            sentence: `A magical story about ${selectedWord.word.toLowerCase()} started here!`,
            emoji: "✨"
        };

        setMagicResult(result);
        setIsMagicLoading(false);
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
                                    {book.title}
                                </h3>
                                <p className="text-xs text-ink-muted font-nunito">Level {activeIndex + 1} • {activeIndex === 0 ? "Minecraft" : "Discovery"} Theme</p>
                            </div>
                        </div>

                        {/* Text Display */}
                        <div className="text-xl md:text-2xl leading-relaxed font-nunito font-medium text-ink select-none min-h-[160px]">
                            {book.tokens.map((token, idx) => {
                                if (token.type === "w" && token.i !== undefined) {
                                    const isMagicWord = book.magicWordIndices.has(token.i);
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
                        <div className="flex items-center gap-3">
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

                            <button
                                onClick={handleNextBook}
                                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-100 text-amber-700 font-fredoka font-bold hover:bg-amber-200 transition-all shadow-sm"
                                title="Load Next Demo"
                            >
                                Next
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>

                        <Link
                            href="/library"
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
                        Explore 300+ more books in the library
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
                                <div className="bg-purple-50 rounded-xl p-4 mb-4">
                                    <p className="text-xs text-purple-300 font-fredoka font-black uppercase tracking-wider mb-2">Example</p>
                                    <p className="text-sm text-purple-700 font-nunito italic">
                                        &quot;{selectedWord.example}&quot;
                                    </p>
                                </div>

                                {/* Magic Sentence Button */}
                                <div className="space-y-3">
                                    {!magicResult && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleMagicSentence();
                                            }}
                                            disabled={isMagicLoading}
                                            className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-2xl font-fredoka font-black flex items-center justify-center gap-2 shadow-lg shadow-purple-200 active:scale-95 transition-all disabled:opacity-50"
                                        >
                                            {isMagicLoading ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    Casting Spell...
                                                </>
                                            ) : (
                                                <>
                                                    <Wand2 className="w-5 h-5" />
                                                    Magic Spark ✨
                                                </>
                                            )}
                                        </button>
                                    )}

                                    {magicResult && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            className="p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl relative"
                                        >
                                            <div className="absolute -top-3 -left-2 bg-amber-400 text-white p-1.5 rounded-lg shadow-sm">
                                                <SparklesIcon className="w-3 h-3" />
                                            </div>
                                            <div className="flex gap-3">
                                                <span className="text-2xl mt-1">{magicResult.emoji}</span>
                                                <p className="text-sm text-amber-900 font-nunito font-bold text-left leading-relaxed">
                                                    {magicResult.sentence}
                                                </p>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}
