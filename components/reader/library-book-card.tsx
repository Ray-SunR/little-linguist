"use client";

import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { Play, BookOpen, Rocket, Star, Clock, Trash2, AlertTriangle, Compass, Heart, Hash } from "lucide-react";
import { type LibraryBookCard } from "@/lib/core/books/library-types";
import { MouseEvent, useRef, useState, memo, useCallback } from "react";
import { CachedImage } from "@/components/ui/cached-image";
import Link from "next/link";
import { cn } from "@/lib/core";

interface LibraryBookCardProps {
    book: LibraryBookCard;
    index: number;
    isOwned?: boolean;
    onDelete?: (id: string) => void;
    activeChildId?: string;
}

const LibraryBookCard = memo(({ book, index, isOwned, onDelete, activeChildId }: LibraryBookCardProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isFavorite, setIsFavorite] = useState(book.isFavorite);

    // Mouse tracking for 3D tilt effect
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseX = useSpring(x, { stiffness: 400, damping: 90 });
    const mouseY = useSpring(y, { stiffness: 400, damping: 90 });

    const rotateX = useTransform(mouseY, [-0.5, 0.5], ["15deg", "-15deg"]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-15deg", "15deg"]);
    const liftZ = useSpring(0, { stiffness: 300, damping: 30 });

    // Use coverImageUrl and coverPath from library metadata
    const coverImage = book.coverImageUrl;
    const coverPath = book.coverPath;

    // Shiny spotlight effect
    const spotX = useTransform(mouseX, [-0.5, 0.5], ["0%", "100%"]);
    const spotY = useTransform(mouseY, [-0.5, 0.5], ["0%", "100%"]);

    // Deterministic palette generation
    const getCoverStyle = (str: string) => {
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
    };

    const style = getCoverStyle(book.title);

    const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const mouseXRel = e.clientX - rect.left;
        const mouseYRel = e.clientY - rect.top;
        x.set(mouseXRel / rect.width - 0.5);
        y.set(mouseYRel / rect.height - 0.5);
        liftZ.set(40);
    }, [x, y, liftZ]);

    const handleMouseLeave = useCallback(() => {
        x.set(0);
        y.set(0);
        liftZ.set(0);
    }, [x, y, liftZ]);

    const progressPercent = book.progress
        ? Math.min(
            100,
            Math.max(
                0,
                ((book.progress.last_token_index || 0) / (book.progress.total_tokens || 1)) *
                100
            )
        )
        : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, type: "spring", stiffness: 100 }}
            className="group relative h-[420px] md:h-[460px] w-full perspective-[2000px] will-change-transform"
        >
            <Link
                href={`/reader/${book.id}`}
                className="block h-full w-full"
            >
                <div
                    ref={ref}
                    className="h-full w-full cursor-pointer"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                >
                    {/* 3D Wrapper */}
                    <motion.div
                        style={{
                            rotateX,
                            rotateY,
                            z: liftZ,
                            transformStyle: "preserve-3d",
                        }}
                        className="relative h-full w-full transition-shadow duration-500 ease-out will-change-transform"
                    >
                        {/* Visual Depth Card (The "Clay" Body) */}
                        <div className={cn(
                            "absolute inset-0 rounded-[2.5rem] border-[5px] bg-white/90 backdrop-blur-2xl transition-all duration-300 glass-shine",
                            "shadow-clay shadow-clay-inset group-hover:shadow-magic-glow",
                            style.border
                        )}>
                            {/* Interactive Shine Foil */}
                            <motion.div
                                style={{
                                    background: `radial-gradient(circle at ${spotX} ${spotY}, rgba(255,255,255,0.5) 0%, transparent 70%)`,
                                }}
                                className="absolute inset-0 z-10 pointer-events-none rounded-[2.2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                            />

                            {/* Content Section */}
                            <div className="relative h-full w-full p-4 flex flex-col gap-3 md:gap-4 overflow-visible">

                                {/* Cover Image Area */}
                                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[1.8rem] border-4 border-white shadow-clay-inset group-hover:shadow-2xl transition-all duration-500">
                                    {coverImage ? (
                                        <CachedImage
                                            src={coverImage}
                                            storagePath={coverPath}
                                            alt={book.title}
                                            fill
                                            className="object-cover transition-transform duration-700 group-hover:scale-110"
                                            sizes="(max-width: 768px) 100vw, 300px"
                                        />
                                    ) : (
                                        <div className={cn("h-full w-full bg-gradient-to-br flex items-center justify-center p-6 text-center", style.bg)}>
                                            <BookOpen className="absolute -top-4 -right-4 h-24 w-24 text-white/10 rotate-12" />
                                            <h3 className="font-fredoka text-2xl font-black text-white leading-tight line-clamp-3">
                                                {book.title}
                                            </h3>
                                        </div>
                                    )}

                                    {/* Tags Overlay - Show "My Story" badge for owned books */}
                                    <div className="absolute top-3 left-3 flex flex-col gap-2 z-20">
                                        {isOwned ? (
                                            <div className="px-3 py-1.5 rounded-full bg-cyan-500 shadow-lg border border-cyan-400 flex items-center gap-1.5">
                                                <Compass className="h-4 w-4 text-white" />
                                                <span className="text-[10px] font-black text-white uppercase tracking-tighter">My Story</span>
                                            </div>
                                        ) : (
                                            <div className="px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md shadow-lg border border-gray-100 flex items-center gap-1.5 transform transition-all group-hover:scale-110">
                                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                                <span className="text-[10px] font-black text-slate-700 uppercase tracking-tighter">Gold Edition</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Text Info Area */}
                                <div className="h-[90px] md:h-[110px] flex flex-col justify-between px-2 py-1">
                                    <div className="space-y-1.5">
                                        <h3 className="font-fredoka text-xl font-black text-ink dark:text-slate-800 line-clamp-2 leading-[1.2] group-hover:text-accent transition-colors h-[48px]">
                                            {book.title}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-black text-ink-muted uppercase tracking-wider">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3 text-accent" />
                                                {Math.max(1, Math.round(Number(book.estimatedReadingTime) || 0))}m
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Hash className="w-3 h-3 text-accent" />
                                                {book.totalTokens || book.progress?.total_tokens || 0} words
                                            </span>
                                            {book.lastOpenedAt && (
                                                <span className="flex items-center gap-1">
                                                    <BookOpen className="w-3 h-3 text-accent" />
                                                    {new Date(book.lastOpenedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Rocket Progress Area */}
                                    <div className="relative pt-2 pb-2">
                                        {progressPercent > 0 ? (
                                            <>
                                                <div className="flex justify-between items-end mb-2.5">
                                                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Story Progress</span>
                                                    <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">{Math.round(progressPercent)}%</span>
                                                </div>
                                                <div className="h-4 w-full bg-slate-100/80 rounded-full overflow-visible relative shadow-clay-inset border-[3px] border-white/50">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${progressPercent}%` }}
                                                        className="h-full bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 rounded-full relative shadow-md"
                                                    >
                                                        {/* The Rocket Icon tracking the progress */}
                                                        <motion.div
                                                            animate={{ y: [0, -2, 0] }}
                                                            transition={{ repeat: Infinity, duration: 2 }}
                                                            className="absolute -right-4 -top-4 h-10 w-10 flex items-center justify-center bg-white rounded-full shadow-lg border-[3px] border-emerald-50 z-20"
                                                        >
                                                            <Rocket className="h-5 w-5 text-emerald-500 -rotate-45" />
                                                        </motion.div>

                                                        {/* Progress Trail Particles */}
                                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                                                            <div className="h-1 w-1 bg-white/60 rounded-full animate-pulse" />
                                                            <div className="h-1.5 w-1.5 bg-white/40 rounded-full animate-pulse delay-75" />
                                                        </div>
                                                    </motion.div>
                                                </div>
                                            </>
                                        ) : (
                                            <div
                                                className="flex items-center justify-center py-3 px-4 rounded-[1.2rem] bg-slate-50/50 border-2 border-dashed border-slate-200 group-hover:border-emerald-300 group-hover:bg-emerald-50/30 transition-all cursor-pointer"
                                            >
                                                <span className="text-[10px] font-black text-slate-400 group-hover:text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                                    <Rocket className="w-3.5 h-3.5" /> Start Exploring
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Play Button Hover FX */}
                            <div className="absolute inset-0 z-30 flex items-center justify-center opacity-0 transition-all duration-500 group-hover:opacity-100 backdrop-blur-[6px] bg-white/10 rounded-[2.5rem]">
                                <motion.div
                                    whileHover={{ scale: 1.2, rotate: 10 }}
                                    whileTap={{ scale: 0.8 }}
                                    className="bg-white p-6 rounded-full shadow-clay border-[5px] border-white transform translate-y-8 group-hover:translate-y-0 transition-all duration-500 flex items-center justify-center"
                                >
                                    <Play className="h-10 w-10 text-accent fill-accent translate-x-1" />
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </Link>

            {/* Delete Button - Always visible for owned books, positioned OUTSIDE 3D wrapper */}
            {isOwned && onDelete && (
                <div className="absolute top-[68px] right-7 z-40 flex flex-col gap-2">
                    <motion.button
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setShowDeleteConfirm(true);
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

            {/* Favorite Button - Right side */}
            {activeChildId && (
                <motion.button
                    onClick={async (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        
                        // Redundant check but keeps type safety
                        if (!activeChildId) return;

                        const newFavState = !isFavorite;
                        setIsFavorite(newFavState); // Optimistic UI

                        try {
                            const res = await fetch(`/api/books/${book.id}/favorite`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    childId: activeChildId,
                                    isFavorite: newFavState
                                })
                            });
                            
                            if (!res.ok) {
                                // Rollback on error
                                setIsFavorite(!newFavState);
                                const err = await res.json();
                                console.error('Failed to toggle favorite:', err);
                            }
                        } catch (err) {
                            setIsFavorite(!newFavState);
                            console.error('Failed to toggle favorite:', err);
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

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!isDeleting) setShowDeleteConfirm(false);
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-3xl p-8 max-w-sm mx-4 shadow-2xl border-4 border-red-100"
                        >
                            <div className="flex flex-col items-center text-center gap-4">
                                <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                                    <AlertTriangle className="h-8 w-8 text-red-500" />
                                </div>
                                <h3 className="font-fredoka text-xl font-bold text-slate-800">Delete Story?</h3>
                                <p className="text-slate-600 text-sm">
                                    Are you sure you want to delete <span className="font-bold">"{book.title}"</span>? This action cannot be undone.
                                </p>
                                <div className="flex gap-3 w-full mt-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowDeleteConfirm(false);
                                        }}
                                        disabled={isDeleting}
                                        className="flex-1 py-3 px-4 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            setIsDeleting(true);
                                            try {
                                                await onDelete?.(book.id);
                                            } finally {
                                                setIsDeleting(false);
                                                setShowDeleteConfirm(false);
                                            }
                                        }}
                                        disabled={isDeleting}
                                        className="flex-1 py-3 px-4 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isDeleting ? (
                                            <>
                                                <motion.div
                                                    animate={{ rotate: 360 }}
                                                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                                    className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full"
                                                />
                                                Deleting...
                                            </>
                                        ) : (
                                            "Delete"
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
});

export default LibraryBookCard;
