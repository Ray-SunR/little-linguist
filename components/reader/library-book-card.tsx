"use client";

import { motion } from "framer-motion";
import { Play, BookOpen, Star, Clock, Trash2, Compass, Heart, Hash, Sparkles, Check, Calendar } from "lucide-react";
import { type LibraryBookCard } from "@/lib/core/books/library-types";
import React, { useState, memo, useCallback, useMemo, useEffect } from "react";
import { CachedImage } from "@/components/ui/cached-image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/core";
import { useTutorial } from "@/components/tutorial/tutorial-context";

interface LibraryBookCardProps {
    book: LibraryBookCard;
    index: number;
    isOwned?: boolean;
    onDelete?: (id: string) => void;
    activeChildId?: string;
    dataTourTarget?: string;
    onNavigate?: () => void;
}

const LEVEL_MAP: Record<string, string> = {
    "G1-2": "Grades 1-2",
    "G3-5": "Grades 3-5",
    "K": "Kindergarten",
    "Kindergarten": "Kindergarten"
};

const LevelBadge = ({ level }: { level: string | number }) => {
    const levelStr = String(level);
    const displayText = LEVEL_MAP[levelStr] || levelStr;
    
    return (
        <div className={cn(
            "px-3 py-1.5 rounded-full backdrop-blur-md shadow-lg border font-fredoka text-[10px] font-black uppercase tracking-tighter transition-all group-hover:scale-105",
            levelStr === "Pre-K" ? "bg-purple-100/90 text-purple-600 border-purple-200" :
                (levelStr === "K" || levelStr === "Kindergarten") ? "bg-blue-100/90 text-blue-600 border-blue-200" :
                    (levelStr === "G1-2" || levelStr === "Grades 1-2") ? "bg-emerald-100/90 text-emerald-600 border-emerald-200" :
                        "bg-orange-100/90 text-orange-600 border-orange-200"
        )}>
            {displayText}
        </div>
    );
};

const LibraryBookCard = memo(({
    book,
    index,
    isOwned,
    onDelete,
    activeChildId,
    dataTourTarget,
    onNavigate
}: LibraryBookCardProps) => {
    const [isFavorite, setIsFavorite] = useState(book.isFavorite);
    const router = useRouter();

    // Sync state with props
    useEffect(() => {
        setIsFavorite(book.isFavorite);
    }, [book.isFavorite]);

    const handleMouseEnter = useCallback(() => {
        // Only prefetch if we're likely on a desktop/hover-capable device
        if (window.matchMedia('(hover: hover)').matches) {
            router.prefetch(`/reader/${book.id}`);
        }
    }, [router, book.id]);

    const { completeStep } = useTutorial();

    const handleClick = useCallback((e: React.MouseEvent) => {
        if (e.metaKey || e.ctrlKey) return;
        onNavigate?.();
        completeStep('library-book-list');
    }, [completeStep, onNavigate]);

    const totalTokens = book.totalTokens ?? book.progress?.total_tokens ?? 0;
    const progressPercent = (book.progress && totalTokens > 0)
        ? Math.min(100, Math.max(0, ((book.progress.last_token_index || 0) / totalTokens) * 100))
        : 0;

    // Deterministic palette generation
    const style = useMemo(() => {
        const str = book.title;
        const hash = str.split("").reduce((acc, char) => char.charCodeAt(0) + acc, 0);

        const palettes = [
            { bg: "from-blue-400 to-indigo-600", text: "text-blue-50", accent: "bg-blue-300", border: "border-blue-200/50", glow: "shadow-blue-500/20" },
            { bg: "from-emerald-400 to-teal-600", text: "text-emerald-50", accent: "bg-emerald-300", border: "border-emerald-200/50", glow: "shadow-emerald-500/20" },
            { bg: "from-orange-400 to-red-500", text: "text-orange-50", accent: "bg-orange-200", border: "border-orange-200/50", glow: "shadow-orange-500/20" },
            { bg: "from-pink-400 to-rose-600", text: "text-pink-50", accent: "bg-pink-300", border: "border-pink-200/50", glow: "shadow-pink-500/20" },
            { bg: "from-violet-400 to-purple-600", text: "text-purple-50", accent: "bg-purple-300", border: "border-purple-200/50", glow: "shadow-purple-500/20" },
            { bg: "from-amber-400 to-yellow-500", text: "text-amber-50", accent: "bg-yellow-200", border: "border-yellow-200/50", glow: "shadow-amber-500/20" },
        ];

        return palettes[hash % palettes.length];
    }, [book.title]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.98, opacity: 0.9 }}
            transition={{
                delay: Math.min(index, 12) * 0.05,
                type: "spring",
                stiffness: 100,
                damping: 20
            }}
            className="group relative h-[420px] md:h-[460px] w-full"
            data-tour-target={dataTourTarget}
        >
            <Link
                href={`/reader/${book.id}`}
                className="block h-full w-full"
                onMouseEnter={handleMouseEnter}
                onClick={handleClick}
            >
                <div className="h-full w-full cursor-pointer">
                    <motion.div
                        whileHover={{
                            y: -8,
                            scale: 1.02,
                            transition: { type: "spring", stiffness: 400, damping: 25 }
                        }}
                        className="relative h-full w-full will-change-transform"
                    >
                        {/* Visual Depth Card (The Premium Bento Glass Body) */}
                        <div className={cn(
                            "absolute inset-0 rounded-[2.5rem] border-[4px] backdrop-blur-3xl transition-all duration-500",
                            "bg-white/90 shadow-clay-md group-hover:shadow-magic-glow",
                            style.border,
                            style.glow
                        )}>
                            {/* Subtle Permanent Glass Shine */}
                            <div className="absolute inset-0 z-10 opacity-30 bg-gradient-to-tr from-white/0 via-white/40 to-white/0 pointer-events-none rounded-[2.5rem]" />

                            {/* Dynamic Glow Aura */}
                            <div className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 bg-gradient-to-br from-white/0 via-white/20 to-white/0 transition-opacity duration-700 blur-2xl" />

                            {/* Content Section */}
                            <div className="relative z-10 h-full w-full p-4 flex flex-col gap-3 md:gap-4 overflow-hidden">
                                {/* Cover Image Area (Bento Frame) */}
                                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[2rem] border-2 border-white/80 shadow-clay-inset group-hover:shadow-2xl transition-all duration-700 bg-slate-50">
                                    {book.coverImageUrl ? (
                                        <div className="absolute inset-0 overflow-hidden">
                                            <CachedImage
                                                src={book.coverImageUrl}
                                                storagePath={book.coverPath}
                                                alt={book.title}
                                                fill
                                                className="object-cover transition-transform duration-1000 ease-out group-hover:scale-110"
                                                sizes="(max-width: 768px) 100vw, 300px"
                                                bucket="book-assets"
                                            />
                                            {/* Iridescent Overlay Flow */}
                                            <div className="absolute inset-0 z-10 opacity-0 group-hover:opacity-40 bg-gradient-to-tr from-purple-500/20 via-transparent to-blue-500/20 transition-opacity duration-700 pointer-events-none" />
                                        </div>
                                    ) : (
                                        <div className={cn("h-full w-full bg-gradient-to-br flex items-center justify-center p-6 text-center", style.bg)}>
                                            <BookOpen className="absolute -top-4 -right-4 h-24 w-24 text-white/10 rotate-12" />
                                            <h3 className="font-fredoka text-2xl font-black text-white leading-tight line-clamp-3">
                                                {book.title}
                                            </h3>
                                        </div>
                                    )}

                                    {/* Badges - Floating Style */}
                                    <div className="absolute top-3 left-3 flex flex-col gap-2 z-20">
                                        {isOwned ? (
                                            <div className="px-3 py-1.5 rounded-full bg-cyan-500/90 backdrop-blur-md shadow-lg border border-white/20 flex items-center gap-1.5">
                                                <Compass className="h-4 w-4 text-white" />
                                                <span className="text-[10px] font-black text-white uppercase tracking-tighter">My Story</span>
                                            </div>
                                        ) : (
                                            <div className="px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md shadow-lg border border-gray-100 flex items-center gap-1.5 transform transition-all group-hover:scale-105">
                                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                                <span className="text-[10px] font-black text-slate-700 uppercase tracking-tighter">Lumo&apos;s Pick</span>
                                            </div>
                                        )}

                                        {(book.isRead || Math.round(progressPercent) >= 99) ? (
                                            <div className="px-3 py-1.5 rounded-full bg-emerald-500/90 backdrop-blur-md shadow-lg border border-white/20 flex items-center gap-1.5 w-fit">
                                                <div className="bg-white rounded-full p-0.5">
                                                    <Check className="h-3 w-3 text-emerald-500" />
                                                </div>
                                                <span className="text-[10px] font-black text-white uppercase tracking-tighter">Read</span>
                                            </div>
                                        ) : progressPercent > 0 ? (
                                            <div className="px-3 py-1.5 rounded-full bg-orange-500/90 backdrop-blur-md shadow-lg border border-white/20 flex items-center gap-1.5 w-fit">
                                                <BookOpen className="h-3 w-3 text-white" />
                                                <span className="text-[10px] font-black text-white uppercase tracking-tighter">{Math.round(progressPercent)}% Read</span>
                                            </div>
                                        ) : (
                                            <div className="px-3 py-1.5 rounded-full bg-blue-500/90 backdrop-blur-md shadow-lg border border-white/20 flex items-center gap-1.5 w-fit">
                                                <Sparkles className="h-3 w-3 text-white" />
                                                <span className="text-[10px] font-black text-white uppercase tracking-tighter">New</span>
                                            </div>
                                        )}
                                    </div>

                                    {book.level && (
                                        <div className="absolute bottom-3 right-3 z-20">
                                            <LevelBadge level={book.level} />
                                        </div>
                                    )}

                                    <div className="absolute bottom-3 left-3 z-20">
                                        <div className="px-3 py-1.5 rounded-full bg-slate-900/40 backdrop-blur-md border border-white/20 font-fredoka text-[9px] font-black uppercase tracking-widest text-white flex items-center gap-1 transition-all group-hover:-translate-y-1">
                                            {book.isNonFiction ? (
                                                <><Clock className="w-3 h-3 text-emerald-300" /> Fact</>
                                            ) : (
                                                <><Sparkles className="w-3 h-3 text-pink-300" /> Story</>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Text Info Area */}
                                <div className="flex-1 flex flex-col px-1 py-1 gap-2">
                                    <h3 className="font-fredoka text-xl font-black text-slate-800 line-clamp-2 leading-tight transition-colors group-hover:text-blue-600">
                                        {book.title}
                                    </h3>
                                    <div className="flex flex-col gap-1.5 mt-auto px-1">
                                        <div className="flex items-center gap-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">
                                            <span className="flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5 text-blue-500/80" />
                                                {Math.max(1, Math.round(Number(book.estimatedReadingTime) || 0))}M
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Hash className="w-3.5 h-3.5 text-blue-500/80" />
                                                {(book.totalTokens || book.progress?.total_tokens || 0).toLocaleString()} WORDS
                                            </span>
                                        </div>
                                        {book.createdAt && (
                                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                                <Calendar className="w-3 h-3 text-slate-300" />
                                                {new Date(book.createdAt).toLocaleDateString(undefined, {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Static Play Button - More Integrated */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none scale-50 group-hover:scale-100">
                                    <div className="bg-white/95 p-6 rounded-full shadow-clay-lg border-[6px] border-white flex items-center justify-center">
                                        <Play className="h-10 w-10 text-blue-500 fill-blue-500 translate-x-1" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </Link>

            {/* Favorite Button - Polished Glass Style */}
            {activeChildId && (
                <motion.button
                    onClick={async (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const newFavState = !isFavorite;
                        setIsFavorite(newFavState);
                        try {
                            const res = await fetch(`/api/books/${book.id}/favorite`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ childId: activeChildId, isFavorite: newFavState })
                            });
                            if (!res.ok) setIsFavorite(!newFavState);
                        } catch (err) {
                            setIsFavorite(!newFavState);
                        }
                    }}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    className={cn(
                        "absolute top-8 right-8 z-50 p-3 rounded-full shadow-lg border-2 border-white transition-all duration-300",
                        isFavorite ? "bg-pink-500 text-white shadow-pink-200" : "bg-white/80 hover:bg-white text-slate-400"
                    )}
                    aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                >
                    <Heart className={cn("h-4 w-4", isFavorite ? "fill-white" : "")} />
                </motion.button>
            )}

            {/* Delete Button */}
            {isOwned && onDelete && (
                <div className="absolute top-[76px] right-8 z-50">
                    <motion.button
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onDelete(book.id);
                        }}
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        className="bg-red-500/90 hover:bg-red-500 p-3 rounded-full shadow-lg border-2 border-white text-white transition-all shadow-red-200"
                        aria-label="Delete story"
                    >
                        <Trash2 className="h-4 w-4" />
                    </motion.button>
                </div>
            )}
        </motion.div>
    );
});

LibraryBookCard.displayName = "LibraryBookCard";

export default LibraryBookCard;
