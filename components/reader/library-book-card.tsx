"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Play, BookOpen } from "lucide-react";
import { SupabaseBook } from "./supabase-reader-shell";
import { MouseEvent, useRef } from "react";
import Image from "next/image";

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

    // Subtle tilt relative to mouse position
    const rotateX = useTransform(mouseY, [-0.5, 0.5], ["8deg", "-8deg"]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-8deg", "8deg"]);

    const coverImage = book.images?.[0]?.src || book.images?.[0]?.url;

    // Deterministic pattern and color generation
    const getCoverStyle = (str: string) => {
        const hash = str.split("").reduce((acc, char) => char.charCodeAt(0) + acc, 0);

        const palettes = [
            { bg: "from-blue-600 to-indigo-700", text: "text-blue-50", accent: "bg-blue-400" },
            { bg: "from-emerald-500 to-teal-700", text: "text-emerald-50", accent: "bg-emerald-400" },
            { bg: "from-orange-400 to-red-500", text: "text-orange-50", accent: "bg-orange-300" },
            { bg: "from-pink-500 to-rose-600", text: "text-pink-50", accent: "bg-pink-400" },
            { bg: "from-violet-500 to-purple-700", text: "text-purple-50", accent: "bg-purple-400" },
            { bg: "from-amber-400 to-yellow-500", text: "text-amber-50", accent: "bg-yellow-300" },
        ];

        const patterns = [
            "radial-gradient(circle, rgba(255,255,255,0.15) 2px, transparent 2.5px)", // Dots
            "repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 2px, transparent 2px, transparent 8px)", // Stripes
            "radial-gradient(circle at 100% 0, rgba(255,255,255,0.1) 0, transparent 40%)", // Corner Fade
            "none"
        ];

        return {
            palette: palettes[hash % palettes.length],
            pattern: patterns[hash % patterns.length],
            patternSize: (hash % 2 === 0) ? "16px 16px" : "100% 100%"
        };
    };

    const style = getCoverStyle(book.title);

    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseXRel = e.clientX - rect.left;
        const mouseYRel = e.clientY - rect.top;
        x.set(mouseXRel / width - 0.5);
        y.set(mouseYRel / height - 0.5);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    const progressPercent = book.initialProgress
        ? Math.min(
            100,
            Math.max(
                5,
                ((book.initialProgress.last_token_index || 0) / (book.tokens?.length || 100)) *
                100
            )
        )
        : 0;

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05, duration: 0.4 }}
            className="group relative h-[420px] w-full cursor-pointer perspective-[1200px]"
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
                className="relative h-full w-full transition-transform duration-300 ease-out"
            >
                {/* Dynamic Shadow */}
                <div className="absolute inset-x-8 bottom-0 h-16 translate-z-[-60px] rounded-[50%] bg-black/20 blur-xl transition-all duration-500 group-hover:bg-black/40 group-hover:blur-2xl" />

                {/* BOOK CONTAINER */}
                <div className="relative mx-auto h-full w-[280px] preserve-3d">

                    {/* === BACK STRUCTURE (Stationary Spine + Pages) === */}

                    {/* Back Cover / Base */}
                    <div className="absolute inset-x-2 inset-y-0 translate-z-[-20px] rounded-l-sm rounded-r-2xl bg-white shadow-md"
                        style={{ backgroundColor: `color-mix(in srgb, var(--accent) 5%, white)` }}
                    />

                    {/* Page Block (Thickness) - Right/Top/Bottom Edges */}
                    {/* Right Edge */}
                    <div className="absolute top-[8px] bottom-[8px] right-[4px] w-[32px] translate-x-[16px] translate-z-[-10px] rotate-y-90 bg-[#fdfaf0] shadow-inner border-l border-black/5"
                        style={{
                            backgroundImage: "repeating-linear-gradient(90deg, transparent 0px, rgba(0,0,0,0.03) 1px, transparent 2px)",
                            backgroundSize: "4px 100%"
                        }}
                    />

                    {/* Top Edge */}
                    <div className="absolute top-[4px] left-[8px] right-[8px] h-[32px] -translate-y-[16px] translate-z-[-10px] rotate-x-90 bg-[#fdfaf0] border-b border-black/5"
                        style={{
                            backgroundImage: "repeating-linear-gradient(0deg, transparent 0px, rgba(0,0,0,0.03) 1px, transparent 2px)",
                            backgroundSize: "100% 4px"
                        }}
                    />

                    {/* FIXED SPINE (Left side) - Match to theme */}
                    <div className={`absolute top-0 bottom-0 left-0 w-[44px] origin-right -translate-x-full rotate-y-[-94deg] rounded-l-sm bg-gradient-to-l ${style.palette.bg} brightness-75 shadow-2xl border-r border-white/10`} />



                    {/* === INNER PAGE (Revealed on Open) === */}
                    <div className="absolute inset-y-[6px] inset-x-[6px] translate-z-[-2px] rounded-r-xl bg-white p-6 shadow-md flex flex-col justify-between">
                        <div className="space-y-4 pt-8 opacity-60">
                            <div className="h-1 w-full rounded-full bg-gray-100" />
                            <div className="h-1 w-5/6 rounded-full bg-gray-100" />
                            <div className="h-1 w-full rounded-full bg-gray-100" />
                            <div className="h-1 w-4/6 rounded-full bg-gray-100" />
                        </div>

                        {progressPercent > 0 && (
                            <div className="w-full">
                                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                                    <span>Progress</span>
                                    <span>{Math.round(progressPercent)}%</span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                                    <div className="h-full rounded-full bg-green-400" style={{ width: `${progressPercent}%` }} />
                                </div>
                            </div>
                        )}
                    </div>


                    {/* === HINGED FRONT COVER === */}
                    <motion.div
                        className="absolute inset-x-0 inset-y-0 origin-left preserve-3d z-30"
                        transition={{ type: "spring", stiffness: 100, damping: 20 }}
                        whileHover={{ rotateY: -28, x: 2 }}
                    >
                        <div className={`absolute inset-0 z-10 overflow-hidden rounded-l-sm rounded-r-2xl bg-gradient-to-br ${style.palette.bg} shadow-xl`}
                            style={{ backfaceVisibility: "hidden" }}>

                            {coverImage ? (
                                <>
                                    <div className="relative h-full w-full">
                                        <Image
                                            src={coverImage}
                                            alt={book.title}
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 768px) 100vw, 300px"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-80" />
                                    </div>

                                    {/* Title Overlay (Only for Image covers) */}
                                    <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
                                        <h3 className="font-fredoka text-2xl font-bold text-white drop-shadow-md leading-tight mb-2 line-clamp-3">
                                            {book.title}
                                        </h3>
                                    </div>
                                </>
                            ) : (
                                <div className="relative h-full w-full flex flex-col items-center justify-center p-6 text-center">
                                    {/* Pattern Overlay */}
                                    <div className="absolute inset-0 opacity-30 pointer-events-none"
                                        style={{ backgroundImage: style.pattern, backgroundSize: style.patternSize }}
                                    />

                                    {/* Decorative Watermark */}
                                    <div className="absolute -top-10 -right-10 opacity-10 rotate-12">
                                        <BookOpen size={180} />
                                    </div>

                                    {/* Border Inset */}
                                    <div className="absolute inset-4 border-2 border-white/20 rounded-lg pointer-events-none" />

                                    {/* Centered Typography Title */}
                                    <h3 className={`relative z-10 font-fredoka text-3xl font-extrabold leading-tight tracking-tight drop-shadow-sm ${style.palette.text} line-clamp-4`}>
                                        {book.title}
                                    </h3>

                                    {/* Decorative Separator */}
                                    <div className={`relative z-10 mt-4 h-1 w-12 rounded-full bg-white/40`} />

                                    <p className={`relative z-10 mt-2 text-sm font-semibold uppercase tracking-widest opacity-80 ${style.palette.text}`}>
                                        Story
                                    </p>
                                </div>
                            )}

                            {/* Common Texture & Shine (Applied to both) */}
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] opacity-20 mix-blend-overlay pointer-events-none" />
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none" />

                            {/* Spine Fold Line */}
                            <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-black/30 to-transparent pointer-events-none" />
                        </div>

                        {/* BACK FACE (Inside Cover) */}
                        <div className="absolute inset-0 z-0 origin-right rotate-y-180 rounded-l-2xl rounded-r-sm bg-[#f8f8f8] p-8 shadow-inner"
                            style={{ backfaceVisibility: "hidden" }}>
                            <div className="h-full w-full rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-300">
                                <BookOpen size={32} />
                                <span className="font-fredoka mt-2 font-bold text-sm uppercase tracking-widest">Ex Libris</span>
                            </div>
                        </div>

                        {/* HOVER PLAY BUTTON (Floating above cover) */}
                        <div className="absolute inset-0 z-30 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                            style={{ transform: "translateZ(20px)" }}>
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-xl backdrop-blur-sm transform transition-transform group-hover:scale-110">
                                <Play className="h-7 w-7 text-accent fill-accent translate-x-0.5" />
                            </div>
                        </div>

                    </motion.div>

                </div>
            </motion.div>
        </motion.div>
    );
}
