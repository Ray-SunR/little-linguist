"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Play, BookOpen, Rocket, Star, Clock } from "lucide-react";
import { SupabaseBook } from "./supabase-reader-shell";
import { MouseEvent, useRef } from "react";
import Image from "next/image";
import { cn } from "@/lib/core";

interface LibraryBookCardProps {
    book: SupabaseBook;
    onClick: (id: string) => void;
    index: number;
}

export default function LibraryBookCard({ book, onClick, index }: LibraryBookCardProps) {
    const ref = useRef<HTMLDivElement>(null);

    // Mouse tracking for 3D tilt effect
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseX = useSpring(x, { stiffness: 400, damping: 90 });
    const mouseY = useSpring(y, { stiffness: 400, damping: 90 });

    const rotateX = useTransform(mouseY, [-0.5, 0.5], ["10deg", "-10deg"]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-10deg", "10deg"]);

    const coverImage = book.images?.[0]?.src || book.images?.[0]?.url;

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

    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        x.set(e.clientX - rect.left / rect.width - 0.5);
        y.set(e.clientY - rect.top / rect.height - 0.5);
        // Corrected calculation for proper centered tilt
        const mouseXRel = e.clientX - rect.left;
        const mouseYRel = e.clientY - rect.top;
        x.set(mouseXRel / rect.width - 0.5);
        y.set(mouseYRel / rect.height - 0.5);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    const progressPercent = book.initialProgress
        ? Math.min(
            100,
            Math.max(
                0,
                ((book.initialProgress.last_token_index || 0) / (book.tokens?.length || 100)) *
                100
            )
        )
        : 0;

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, type: "spring", stiffness: 100 }}
            className="group relative h-[460px] w-full cursor-pointer perspective-[1500px]"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={() => onClick(book.id)}
        >
            {/* 3D Wrapper */}
            <motion.div
                style={{
                    rotateX,
                    rotateY,
                    transformStyle: "preserve-3d",
                }}
                className="relative h-full w-full transition-transform duration-500 ease-out"
            >
                {/* Visual Depth Card (The "Clay" Body) */}
                <div className={cn(
                    "absolute inset-0 rounded-[2.5rem] border-[6px] bg-white transition-all duration-300",
                    "shadow-[0_20px_50px_rgba(0,0,0,0.1),inset_0_-8px_0_rgba(0,0,0,0.05)]",
                    "group-hover:shadow-[0_40px_80px_rgba(0,0,0,0.15),inset_0_-8px_0_rgba(0,0,0,0.05)]",
                    style.border
                )}>
                    {/* Content Section */}
                    <div className="relative h-full w-full p-4 flex flex-col gap-4">

                        {/* Cover Image Area */}
                        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[1.8rem] border-4 border-white shadow-inner">
                            {coverImage ? (
                                <Image
                                    src={coverImage}
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

                            {/* Tags Overlay */}
                            <div className="absolute top-3 right-3 flex flex-col gap-2">
                                <div className="px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md shadow-sm border border-gray-100 flex items-center gap-1.5 transform translate-y-0 opacity-100 transition-all group-hover:scale-105">
                                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-tighter">Gold</span>
                                </div>
                            </div>
                        </div>

                        {/* Text Info Area */}
                        <div className="flex-1 flex flex-col justify-between px-2 py-1">
                            <div className="space-y-1">
                                <h3 className="font-fredoka text-xl font-bold text-ink dark:text-slate-800 line-clamp-2 leading-tight group-hover:text-accent transition-colors">
                                    {book.title}
                                </h3>
                                <div className="flex items-center gap-3 text-xs font-bold text-ink-muted">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        8m
                                    </span>
                                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                                    <span>Adventure</span>
                                </div>
                            </div>

                            {/* Rocket Progress Area */}
                            <div className="relative pt-6">
                                {progressPercent > 0 ? (
                                    <>
                                        <div className="flex justify-between items-end mb-2">
                                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Adventure Progress</span>
                                            <span className="text-xs font-black text-emerald-600">{Math.round(progressPercent)}%</span>
                                        </div>
                                        <div className="h-3 w-full bg-slate-100 rounded-full overflow-visible relative">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${progressPercent}%` }}
                                                className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full relative"
                                            >
                                                {/* The Rocket Icon tracking the progress */}
                                                <div className="absolute -right-3 -top-3 h-8 w-8 flex items-center justify-center bg-white rounded-full shadow-lg border-2 border-emerald-100">
                                                    <Rocket className="h-4 w-4 text-emerald-500 -rotate-45" />
                                                </div>
                                            </motion.div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-center justify-center py-2 px-4 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Story • Start Reading</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Play Button Hover FX */}
                    <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 transition-all duration-500 group-hover:opacity-100 backdrop-blur-[2px] rounded-[2.5rem]">
                        <motion.div
                            whileHover={{ scale: 1.1 }}
                            whileActive={{ scale: 0.9 }}
                            className="bg-white/90 p-5 rounded-full shadow-[0_15px_30px_rgba(0,0,0,0.15)] transform translate-y-4 group-hover:translate-y-0 transition-all duration-500"
                        >
                            <Play className="h-10 w-10 text-accent fill-accent translate-x-1" />
                        </motion.div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
