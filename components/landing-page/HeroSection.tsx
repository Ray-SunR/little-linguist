"use client";

import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Sparkles, Cloud, Star, Music } from "lucide-react";
import { LumoCharacter } from "@/components/ui/lumo-character";
import { CachedImage } from "@/components/ui/cached-image";
import { safeHaptics, ImpactStyle } from "@/lib/core";
import { cn } from "@/lib/utils";

interface HeroSectionProps {
    isInteracting: boolean;
    messageList: string[];
    messageIndex: number;
    handleLumoClick: (e: React.MouseEvent) => void;
    isNative: boolean;
}

export function HeroSection({
    isInteracting,
    messageList,
    messageIndex,
    handleLumoClick,
    isNative
}: HeroSectionProps) {
    return (
        <section className={cn(
            "relative flex items-center px-6 lg:pl-28 py-12 md:py-8 lg:py-0 overflow-hidden",
            isNative ? "min-h-[100dvh] pb-12" : "min-h-[85vh] pb-32"
        )}>
            {/* Slot for BackgroundEffects will be passed or rendered separately in LandingPageContent */}
            {/* For now, this component only contains the main content grid */}
            
            <div className="container max-w-7xl mx-auto grid lg:grid-cols-2 gap-8 lg:gap-16 items-center relative z-10 px-4 md:px-8">
                {/* Left: Text Content */}
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-left relative z-10"
                >
                    <div className="relative">
                        {/* Floating 3D Letter A */}
                        <motion.div
                            animate={{ y: [0, -15, 0], rotate: [0, 10, 0] }}
                            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                            className="absolute -top-12 -left-8 md:-left-16 text-6xl md:text-8xl font-black text-purple-200/20 md:text-purple-500/10 font-fredoka pointer-events-none select-none -z-10"
                        >
                            Aa
                        </motion.div>

                        {/* Floating Decor Icons (New) */}
                        <motion.div
                            animate={{ y: [0, -10, 0], rotate: [0, 5, 0] }}
                            transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
                            className="absolute -top-16 left-10 md:-top-20 md:left-20 text-blue-300/40 pointer-events-none -z-10"
                        >
                            <Cloud className="w-12 h-12 md:w-16 md:h-16 fill-current" />
                        </motion.div>
                        <motion.div
                            animate={{ y: [0, 10, 0], rotate: [0, -10, 0] }}
                            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 2 }}
                            className="absolute top-0 -right-4 md:top-10 md:-right-10 text-amber-300/40 pointer-events-none -z-10"
                        >
                            <Star className="w-8 h-8 md:w-12 md:h-12 fill-current" />
                        </motion.div>
                        <motion.div
                            animate={{ y: [0, -8, 0], rotate: [0, 15, 0] }}
                            transition={{ repeat: Infinity, duration: 6, ease: "easeInOut", delay: 0.5 }}
                            className="absolute -bottom-16 left-20 md:-bottom-10 md:left-40 text-pink-300/40 pointer-events-none -z-10"
                        >
                            <Music className="w-10 h-10 md:w-14 md:h-14 fill-current" />
                        </motion.div>


                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 border border-orange-200 text-orange-600 font-bold font-fredoka text-sm mb-6 shadow-sm"
                        >
                            <Sparkles className="w-4 h-4 fill-current" />
                            <span>AI-Powered Language Learning</span>
                        </motion.div>
                    </div>

                    <h1 className="text-5xl lg:text-7xl font-black text-ink mb-6 font-fredoka tracking-tight leading-[1.1]">
                        Your Child&apos;s <br />
                        <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500">
                            AI Companion
                            <motion.span
                                className="absolute -top-6 -right-8 text-4xl"
                                animate={{ rotate: [0, 15, 0], scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                            >
                                ✨
                            </motion.span>
                        </span>
                    </h1>

                    <p className="text-xl text-ink-muted font-medium font-nunito leading-relaxed max-w-lg mb-8">
                        Meet <span className="font-bold text-purple-600">LumoMind</span>, the magical AI reading buddy that grows with your child. Personalized stories, interactive goals, and language adventures await.
                    </p>

                    <div className="flex flex-wrap items-center gap-4">
                        <motion.a
                            href="/library"
                             onClick={() => {
                                safeHaptics.impact({ style: ImpactStyle.Heavy });
                            }}
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex items-center gap-3 px-8 py-4 rounded-[2rem] bg-gradient-to-r from-orange-400 to-amber-500 text-white shadow-clay-orange border-2 border-white/30 text-lg font-black font-fredoka transition-all cursor-pointer no-underline"
                        >
                            <BookOpen className="w-5 h-5" />
                            Start Adventure
                        </motion.a>

                        <motion.a
                            href="/library"
                            whileHover={{ scale: 1.05, border: "2px solid rgba(147, 51, 234, 0.5)" }}
                            whileTap={{ scale: 0.98 }}
                            className="flex items-center gap-3 px-8 py-4 rounded-[2rem] bg-white text-purple-600 shadow-sm border-2 border-transparent text-lg font-black font-fredoka transition-all cursor-pointer no-underline"
                        >
                            <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                                <span className="ml-0.5 text-xs text-purple-600">✨</span>
                            </div>
                            Explore Library
                        </motion.a>
                    </div>

                    {/* Quick Stats */}
                    <div className="flex items-center gap-8 mt-12 pt-8 border-t border-ink/5">
                        {[
                            { label: "AI Companion", value: "24/7" },
                            { label: "Vocabulary", value: "Adaptive" },
                            { label: "Stories", value: "Infinite" }
                        ].map((stat, i) => (
                            <div key={i} className="flex flex-col">
                                <div className="text-2xl font-black text-amber-500 font-fredoka">{stat.value}</div>
                                <div className="text-xs font-bold text-ink-muted uppercase tracking-wider">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Right: Hero Image & Lumo Integration */}
                <motion.div
                    initial={{ opacity: 0, x: 30, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ duration: 1, type: "spring" }}
                    className="relative block mt-12 lg:mt-0"
                >
                    {/* Floating Image Container - SCALED UP */}
                    <motion.div
                        animate={{ y: [0, -20, 0] }}
                        transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                        className="relative z-10"
                    >
                        <div
                            className="relative aspect-square w-full max-w-[700px] mx-auto scale-110"
                            style={{
                                maskImage: "radial-gradient(circle at center, black 30%, transparent 70%)",
                                WebkitMaskImage: "radial-gradient(circle at center, black 30%, transparent 70%)"
                            }}
                        >
                            <CachedImage
                                src="/images/hero-book.png"
                                alt="Magical flying book emitting stories"
                                fill
                                className="object-contain drop-shadow-2xl"
                                priority={true}
                            />
                        </div>
                    </motion.div>

                    {/* Lumo Floating Character - Hero */}
                    <motion.div
                        className="absolute bottom-10 right-0 md:bottom-20 md:right-10 z-20 cursor-pointer"
                        initial={{ scale: 0, opacity: 0, rotate: -20 }}
                        animate={{
                            scale: isInteracting ? 1.2 : 1,
                            opacity: 1,
                            rotate: isInteracting ? [0, -10, 10, -10, 0] : 0
                        }}
                        transition={{
                            delay: isInteracting ? 0 : 0.8,
                            type: isInteracting ? "tween" : "spring", // Use tween/keyframes for interaction
                            stiffness: isInteracting ? undefined : 200,
                            duration: isInteracting ? 0.5 : undefined
                        }}
                        onClick={handleLumoClick}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <motion.div
                            animate={{
                                y: isInteracting ? [0, -30, 0] : [0, -15, 0],
                                rotate: isInteracting ? 0 : [0, 5, 0]
                            }}
                            transition={{ repeat: Infinity, duration: isInteracting ? 0.5 : 3, ease: "easeInOut" }}
                            className="relative"
                        >
                            <LumoCharacter className="w-32 h-32 md:w-56 md:h-56" priority={true} />

                            {/* Speech Bubble */}
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={`${isInteracting}-${messageIndex}`}
                                    initial={{ scale: 0, opacity: 0, y: 10 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0, opacity: 0, y: -10 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                    className="absolute -top-12 -left-20 md:-top-16 md:-left-24 bg-white px-3 py-2 md:px-4 md:py-3 rounded-2xl rounded-tr-none shadow-xl border-2 border-purple-100 z-30 transform -rotate-6 min-w-[120px] md:min-w-[140px] flex items-center justify-center"
                                >
                                    <p className="text-xs md:text-sm font-bold text-purple-600 whitespace-nowrap font-fredoka">{messageList[messageIndex]}</p>
                                </motion.div>
                            </AnimatePresence>
                        </motion.div>
                    </motion.div>

                    {/* Floating 3D Letters B & C */}
                    <motion.div
                        animate={{ y: [0, 20, 0], rotate: [0, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
                        className="absolute top-0 right-10 text-9xl font-black text-blue-500/10 font-fredoka pointer-events-none select-none -z-10"
                    >
                        Bb
                    </motion.div>
                    <motion.div
                        animate={{ y: [0, 15, 0], rotate: [0, 5, 0] }}
                        transition={{ repeat: Infinity, duration: 6, ease: "easeInOut", delay: 2 }}
                        className="absolute bottom-20 -left-10 text-8xl font-black text-pink-500/10 font-fredoka pointer-events-none select-none -z-10"
                    >
                        Cc
                    </motion.div>

                    {/* Background Glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] bg-amber-200/20 blur-[90px] rounded-full -z-10" />
                </motion.div>
            </div>
        </section>
    );
}
