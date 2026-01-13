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
        <div className="h-full w-full bg-white rounded-[2rem] shadow-xl border border-white/50 flex flex-col overflow-hidden relative">
            {/* Header */}
            <div className="flex justify-between items-center p-4 pb-2 shrink-0 z-20 bg-white/80 backdrop-blur-sm">
                <button
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                    className="w-8 h-8 rounded-full bg-rose-50 text-rose-400 hover:text-white hover:bg-rose-500 transition-all flex items-center justify-center"
                    aria-label="Remove word"
                >
                    <Trash2 className="h-4 w-4" />
                </button>

                <button
                    onClick={(e) => { e.stopPropagation(); onFlip(); }}
                    className="text-xs font-bold text-slate-400 uppercase hover:text-slate-600 transition-colors"
                >
                    Close
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-4">
                <WordInsightView
                    insight={word}
                    isSaved={true}
                    onToggleSave={() => { }}
                    onClose={() => onFlip()}
                    provider={ttsProvider}
                    compact={true}
                />

                {/* Book Context Link - Compact */}
                {word.bookTitle && word.bookId && (
                    <div className="mt-4 pt-3 border-t border-slate-100">
                        <Link
                            href={`/reader/${word.bookId}`}
                            className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors group/book"
                        >
                            <div className="w-8 h-10 rounded-md bg-white shadow-sm flex-shrink-0 overflow-hidden relative border border-slate-200">
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
                                        <BookOpen className="h-4 w-4" />
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0 flex-1 text-left">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Found in</p>
                                <p className="text-xs font-bold text-ink truncate group-hover/book:text-indigo-600 transition-colors">{word.bookTitle}</p>
                            </div>
                        </Link>
                    </div>
                )}
            </div>

            {/* Bottom Decor */}
            <div className={cn("h-1 w-full shrink-0 opacity-50", theme.bg)} />
        </div>
    );
}
