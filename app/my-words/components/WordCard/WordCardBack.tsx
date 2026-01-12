import { motion } from "framer-motion";
import Link from "next/link";
import { Trash2, BookOpen } from "lucide-react";
import { cn } from "@/lib/core/utils/cn";
import { type SavedWord } from "@/lib/features/word-insight/provider";
import { WordInsightView } from "@/components/reader/word-insight-view"; // Assuming this is reusable
import { CachedImage } from "@/components/ui/cached-image";

interface WordCardBackProps {
    word: SavedWord;
    onFlip: () => void;
    onRemove: () => void;
    theme: { bg: string; shadow: string; accent: string; light: string };
    // We might need to pass the provider or just use the View component which handles it?
    // The original code passed `ttsProvider`.
    ttsProvider: any;
}

export function WordCardBack({ word, onFlip, onRemove, theme, ttsProvider }: WordCardBackProps) {
    return (
        <div className="glass-card h-full w-full p-6 md:p-8 overflow-hidden group/back border-none bg-white relative flex flex-col rounded-[2.5rem]">
            {/* Header with Close and Remove */}
            <div className="flex justify-between items-center mb-2 shrink-0">
                <button
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                    className="w-10 h-10 rounded-full bg-rose-50 text-rose-300 hover:text-white hover:bg-rose-500 transition-all flex items-center justify-center border border-rose-100"
                    aria-label="Remove word from collection"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
                <div className="w-12 h-1.5 bg-slate-100 rounded-full" />
                <div className="w-10" /> {/* Spacer for balance */}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2" data-no-flip>
                <WordInsightView
                    insight={word}
                    isSaved={true}
                    onToggleSave={() => { }} // No-op here implies we just view it
                    onClose={() => onFlip()}
                    provider={ttsProvider}
                    compact={true}
                />

                {/* Book Context Link - Moved inside scroll area if needed, or kept at bottom */}
                {word.bookTitle && word.bookId && (
                    <div className="mt-6 pt-4 border-t border-slate-100">
                        <Link
                            href={`/reader/${word.bookId}`}
                            className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors group/book"
                        >
                            <div className="w-10 h-14 rounded-lg bg-white shadow-sm flex-shrink-0 overflow-hidden relative border border-slate-200">
                                {word.coverImageUrl ? (
                                    <CachedImage
                                        src={word.coverImageUrl}
                                        storagePath={word.coverImagePath}
                                        alt={word.bookTitle}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                        <BookOpen className="h-5 w-5" />
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0 flex-1 text-left">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Found in</p>
                                <p className="text-sm font-bold text-ink truncate group-hover/book:text-accent transition-colors">{word.bookTitle}</p>
                            </div>
                        </Link>
                    </div>
                )}
            </div>

            <div className="mt-4 md:mt-6 text-center pb-2 shrink-0">
                <button
                    onClick={(e) => { e.stopPropagation(); onFlip(); }}
                    className={cn("w-full py-3.5 md:py-4 rounded-[1.2rem] md:rounded-3xl font-black font-fredoka text-xs uppercase tracking-widest transition-all text-white shadow-xl hover:scale-[1.02] active:scale-[0.98]", theme.bg, theme.shadow)}
                >
                    Got it! 🚀
                </button>
            </div>
        </div>
    );
}
