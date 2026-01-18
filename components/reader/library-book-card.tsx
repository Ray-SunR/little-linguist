"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Play, BookOpen, Star, Clock, Trash2, Compass, Heart, Hash, Sparkles, Check } from "lucide-react";
import { type LibraryBookCard } from "@/lib/core/books/library-types";
import React, { MouseEvent, useRef, useState, memo, useCallback, useMemo, useEffect } from "react";
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

const LibraryBookCard = memo(({
    book,
    index,
    isOwned,
    onDelete,
    activeChildId,
    dataTourTarget,
    onNavigate
}: LibraryBookCardProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const [isFavorite, setIsFavorite] = useState(book.isFavorite);
    const [isHovered, setIsHovered] = useState(false);
    const router = useRouter();

    // Sync state with props
    useEffect(() => {
        setIsFavorite(book.isFavorite);
    }, [book.isFavorite]);

    // Mouse tracking for Parallax - Gated for performance
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseX = useSpring(x, { stiffness: 300, damping: 40 });
    const mouseY = useSpring(y, { stiffness: 300, damping: 40 });

    // Inner Parallax Transforms - Subtle internal shifting for "window" effect
    const imageX = useTransform(mouseX, [-0.5, 0.5], ["-4%", "4%"]);
    const imageY = useTransform(mouseY, [-0.5, 0.5], ["-4%", "4%"]);
    const badgeX = useTransform(mouseX, [-0.5, 0.5], ["2%", "-2%"]);
    const badgeY = useTransform(mouseY, [-0.5, 0.5], ["2%", "-2%"]);

    // Glass-shine sweep transform
    const sweepX = useTransform(mouseX, [-0.5, 0.5], ["-100%", "200%"]);

    // Deterministic palette generation
    const style = useMemo(() => {
        const str = book.title;
        const hash = str.split("").reduce((acc, char) => char.charCodeAt(0) + acc, 0);

        const palettes = [
            { bg: "from-blue-400 to-indigo-600", text: "text-blue-50", accent: "bg-blue-300", border: "border-blue-200" },
            { bg: "from-emerald-400 to-teal-600", text: "text-emerald-50", accent: "bg-emerald-300", border: "border-emerald-200" },
            { bg: "from-orange-400 to-red-500", text: "text-orange-50", accent: "bg-orange-200", border: "border-orange-200" },
            { bg: "from-pink-400 to-rose-600", text: "text-pink-50", accent: "bg-pink-300", border: "border-pink-200" },
            { bg: "from-violet-400 to-purple-600", text: "text-purple-50", accent: "bg-purple-300", border: "border-purple-200" },
            { bg: "from-amber-400 to-yellow-500", text: "text-amber-50", accent: "bg-yellow-200", border: "border-yellow-200" },
        ];

        return palettes[hash % palettes.length];
    }, [book.title]);

    const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
        if (!ref.current || window.innerWidth < 768) return;
        const rect = ref.current.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const mouseXRel = e.clientX - rect.left;
        const mouseYRel = e.clientY - rect.top;
        x.set(mouseXRel / rect.width - 0.5);
        y.set(mouseYRel / rect.height - 0.5);
        if (!isHovered) setIsHovered(true);
    }, [x, y, isHovered]);

    const handleMouseLeave = useCallback(() => {
        x.set(0);
        y.set(0);
        setIsHovered(false);
    }, [x, y]);

    const handleMouseEnter = useCallback(() => {
        router.prefetch(`/reader/${book.id}`);
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

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                delay: Math.min(index, 12) * 0.05,
                type: "spring",
                stiffness: 100,
                damping: 20
            }}
            className="group relative h-[420px] md:h-[460px] w-full will-change-transform"
            data-tour-target={dataTourTarget}
        >
            <Link
                href={`/reader/${book.id}`}
                className="block h-full w-full"
                onMouseEnter={handleMouseEnter}
                onClick={handleClick}
            >
                <div
                    ref={ref}
                    className="h-full w-full cursor-pointer"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                >
                    <motion.div
                        animate={isHovered ? {
                            y: -12,
                            scale: 1.04,
                            transition: { type: "spring", stiffness: 300, damping: 20 }
                        } : {
                            y: 0,
                            scale: 1,
                            transition: { type: "spring", stiffness: 300, damping: 20 }
                        }}
                        className="relative h-full w-full transition-shadow duration-500 ease-out will-change-transform"
                    >
                        {/* Visual Depth Card (The "Clay" Body) */}
                        <div className={cn(
                            "absolute inset-0 rounded-[2.5rem] border-[5px] bg-white/95 backdrop-blur-2xl transition-all duration-300",
                            "shadow-clay shadow-clay-inset group-hover:shadow-magic-glow",
                            style.border
                        )}>
                            {/* Interactive Glass Shine Sweep */}
                            <motion.div
                                style={{
                                    left: sweepX,
                                    background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)`,
                                }}
                                className="absolute inset-0 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-[50%] skew-x-[-20deg]"
                            />

                            {/* Content Section */}
                            <div className="relative h-full w-full p-4 flex flex-col gap-3 md:gap-4 overflow-visible">
                                {/* Cover Image Area */}
                                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[1.8rem] border-4 border-white shadow-clay-inset group-hover:shadow-2xl transition-all duration-500 bg-slate-50">
                                    {book.coverImageUrl ? (
                                        <motion.div
                                            style={{
                                                x: imageX,
                                                y: imageY,
                                                scale: 1.15
                                            }}
                                            className="absolute inset-0"
                                        >
                                            <CachedImage
                                                src={book.coverImageUrl}
                                                storagePath={book.coverPath}
                                                alt={book.title}
                                                fill
                                                className="object-cover transition-transform duration-700"
                                                sizes="(max-width: 768px) 100vw, 300px"
                                                bucket="book-assets"
                                            />
                                        </motion.div>
                                    ) : (
                                        <div className={cn("h-full w-full bg-gradient-to-br flex items-center justify-center p-6 text-center", style.bg)}>
                                            <BookOpen className="absolute -top-4 -right-4 h-24 w-24 text-white/10 rotate-12" />
                                            <h3 className="font-fredoka text-2xl font-black text-white leading-tight line-clamp-3">
                                                {book.title}
                                            </h3>
                                        </div>
                                    )}

                                    {/* Badges - Parallax offset */}
                                    <motion.div
                                        style={{ x: badgeX, y: badgeY }}
                                        className="absolute top-3 left-3 flex flex-col gap-2 z-20"
                                    >
                                        {isOwned ? (
                                            <div className="px-3 py-1.5 rounded-full bg-cyan-500/90 backdrop-blur-md shadow-lg border border-cyan-400/50 flex items-center gap-1.5">
                                                <Compass className="h-4 w-4 text-white" />
                                                <span className="text-[10px] font-black text-white uppercase tracking-tighter">My Story</span>
                                            </div>
                                        ) : (
                                            <div className="px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md shadow-lg border border-gray-100 flex items-center gap-1.5 transform transition-all group-hover:scale-110">
                                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                                <span className="text-[10px] font-black text-slate-700 uppercase tracking-tighter">Lumo&apos;s Pick</span>
                                            </div>
                                        )}

                                        {(book.isRead || Math.round(progressPercent) >= 99) ? (
                                            <div className="px-3 py-1.5 rounded-full bg-emerald-500/90 backdrop-blur-md shadow-lg border border-emerald-400/50 flex items-center gap-1.5 w-fit">
                                                <div className="bg-white rounded-full p-0.5">
                                                    <Check className="h-3 w-3 text-emerald-500" />
                                                </div>
                                                <span className="text-[10px] font-black text-white uppercase tracking-tighter">Read</span>
                                            </div>
                                        ) : progressPercent > 0 ? (
                                            <div className="px-3 py-1.5 rounded-full bg-orange-500/90 backdrop-blur-md shadow-lg border border-orange-400/50 flex items-center gap-1.5 w-fit">
                                                <BookOpen className="h-3 w-3 text-white" />
                                                <span className="text-[10px] font-black text-white uppercase tracking-tighter">{Math.round(progressPercent)}% Read</span>
                                            </div>
                                        ) : (
                                            <div className="px-3 py-1.5 rounded-full bg-blue-500/90 backdrop-blur-md shadow-lg border border-blue-400/50 flex items-center gap-1.5 w-fit">
                                                <Sparkles className="h-3 w-3 text-white" />
                                                <span className="text-[10px] font-black text-white uppercase tracking-tighter">New</span>
                                            </div>
                                        )}
                                    </motion.div>

                                    {book.level && (
                                        <motion.div
                                            style={{ x: badgeX, y: badgeY }}
                                            className="absolute top-3 right-14 z-20"
                                        >
                                            <div className={cn(
                                                "px-3 py-1.5 rounded-full backdrop-blur-md shadow-lg border shadow-clay-inset font-fredoka text-[10px] font-black uppercase tracking-tighter transition-all group-hover:scale-110",
                                                book.level === "Pre-K" ? "bg-purple-100/90 text-purple-600 border-purple-200" :
                                                    (book.level === "K" || book.level === "Kindergarten") ? "bg-blue-100/90 text-blue-600 border-blue-200" :
                                                        (book.level === "G1-2" || book.level === "Grades 1-2") ? "bg-emerald-100/90 text-emerald-600 border-emerald-200" :
                                                            "bg-orange-100/90 text-orange-600 border-orange-200"
                                            )}>
                                                {book.level === "G1-2" ? "Grades 1-2" :
                                                    book.level === "G3-5" ? "Grades 3-5" :
                                                        book.level === "K" ? "Kindergarten" :
                                                            book.level}
                                            </div>
                                        </motion.div>
                                    )}

                                    <div className="absolute bottom-3 left-3 z-20">
                                        <div className="px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md shadow-lg border border-gray-100 font-fredoka text-[9px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-1 shadow-clay-inset transition-all group-hover:-translate-y-1">
                                            {book.isNonFiction ? (
                                                <><Clock className="w-3 h-3 text-emerald-400" /> Fact</>
                                            ) : (
                                                <><Sparkles className="w-3 h-3 text-pink-400" /> Story</>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Text Info Area */}
                                <div className="flex-1 flex flex-col px-2 py-3 gap-2">
                                    <h3 className="font-fredoka text-xl font-black text-slate-800 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                                        {book.title}
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-black text-slate-400 uppercase tracking-wider mt-auto">
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3 text-blue-400" />
                                            {Math.max(1, Math.round(Number(book.estimatedReadingTime) || 0))}m
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Hash className="w-3 h-3 text-blue-400" />
                                            {book.totalTokens || book.progress?.total_tokens || 0} words
                                        </span>
                                    </div>
                                </div>

                                {/* Play Button Hover FX */}
                                <div className="absolute inset-0 z-30 flex items-center justify-center opacity-0 transition-all duration-500 group-hover:opacity-100 backdrop-blur-[6px] bg-white/10 rounded-[2.5rem]">
                                    <motion.div
                                        whileHover={{ scale: 1.2, rotate: 10 }}
                                        whileTap={{ scale: 0.8 }}
                                        className="bg-white p-6 rounded-full shadow-clay border-[5px] border-white transform translate-y-8 group-hover:translate-y-0 transition-all duration-500 flex items-center justify-center"
                                    >
                                        <Play className="h-10 w-10 text-blue-500 fill-blue-500 translate-x-1" />
                                    </motion.div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </Link>

            {/* Favorite Button - Absolute outside the scroll container to avoid unmounting issues */}
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
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className={cn(
                        "absolute top-7 right-7 z-40 p-2.5 rounded-full shadow-lg border-2 border-white transition-colors cursor-pointer",
                        isFavorite ? "bg-pink-500 hover:bg-pink-600" : "bg-white/90 hover:bg-white text-slate-400"
                    )}
                    aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                >
                    <Heart className={cn("h-4 w-4", isFavorite ? "fill-white text-white" : "text-slate-400")} />
                </motion.button>
            )}

            {/* Delete Button */}
            {isOwned && onDelete && (
                <div className="absolute top-[68px] right-7 z-40">
                    <motion.button
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onDelete(book.id);
                        }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="bg-red-500 p-2.5 rounded-full shadow-lg border-2 border-white hover:bg-red-600 transition-colors cursor-pointer"
                        aria-label="Delete story"
                    >
                        <Trash2 className="h-4 w-4 text-white" />
                    </motion.button>
                </div>
            )}
        </motion.div>
    );
});

LibraryBookCard.displayName = "LibraryBookCard";

export default LibraryBookCard;
