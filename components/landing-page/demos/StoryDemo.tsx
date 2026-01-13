"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, Wand2, Rocket, Waves, Trees, ImageIcon, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/core/utils/cn";
import { STORY_DEMO_THEMES, type StoryTheme } from "./demo-data";

type DemoStep = "theme" | "name" | "generating" | "result";

export function StoryDemo() {
    const [step, setStep] = useState<DemoStep>("theme");
    const [selectedTheme, setSelectedTheme] = useState<StoryTheme | null>(null);
    const [heroName, setHeroName] = useState("");
    const [isHovered, setIsHovered] = useState<string | null>(null);

    const handleThemeSelect = (theme: StoryTheme) => {
        setSelectedTheme(theme);
        setStep("name");
    };

    const handleGenerate = () => {
        if (!heroName.trim()) return;
        setStep("generating");
        // Simulate generation time
        setTimeout(() => {
            setStep("result");
        }, 2000);
    };

    const resetDemo = () => {
        setStep("theme");
        setSelectedTheme(null);
        setHeroName("");
    };

    return (
        <div className="w-full max-w-4xl mx-auto px-4 py-8 md:py-12">
            <div className="text-center mb-6 md:mb-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 text-amber-700 font-fredoka font-bold text-sm mb-4"
                >
                    <Wand2 className="w-4 h-4" />
                    Interactive Story Maker
                </motion.div>
                <h2 className="text-3xl md:text-4xl font-fredoka font-bold text-ink mb-4">
                    Create a Story in Seconds
                </h2>
                <p className="text-ink-muted text-lg max-w-2xl mx-auto">
                    Pick a world, name your hero, and watch Lumo build a magical adventure just for you.
                </p>
            </div>

            <div className="glass-card relative overflow-hidden min-h-[500px] flex flex-col">
                {/* Progress Indicators */}
                <div className="flex justify-center gap-2 p-6 border-b border-white/20">
                    {(["theme", "name", "result"] as const).map((s, i) => (
                        <div
                            key={s}
                            className={cn(
                                "h-2 rounded-full transition-all duration-500",
                                step === s || (step === "generating" && s === "result")
                                    ? "w-8 bg-amber-400"
                                    : "w-2 bg-white/30"
                            )}
                        />
                    ))}
                </div>

                <div className="flex-1 p-6 sm:p-10">
                    <AnimatePresence mode="wait">
                        {step === "theme" && (
                            <motion.div
                                key="theme"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="h-full"
                            >
                                <h3 className="text-2xl font-fredoka font-bold text-ink mb-8 text-center">
                                    Step 1: Pick a World
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                    {STORY_DEMO_THEMES.map((theme) => (
                                        <motion.button
                                            key={theme.id}
                                            whileHover={{ y: -5, scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => handleThemeSelect(theme)}
                                            onMouseEnter={() => setIsHovered(theme.id)}
                                            onMouseLeave={() => setIsHovered(null)}
                                            className={cn(
                                                "relative group p-6 rounded-3xl transition-all duration-300 flex flex-col items-center gap-4 border-2",
                                                selectedTheme?.id === theme.id
                                                    ? "bg-white border-amber-400 shadow-clay-amber"
                                                    : "bg-white/50 border-white/50 hover:bg-white hover:border-white shadow-soft"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-20 h-20 rounded-2xl flex items-center justify-center text-5xl transition-transform duration-500 group-hover:rotate-12",
                                                theme.id === "space" ? "bg-purple-100" :
                                                    theme.id === "ocean" ? "bg-blue-100" : "bg-green-100"
                                            )}>
                                                {theme.icon}
                                            </div>
                                            <span className="text-xl font-fredoka font-bold text-ink">
                                                {theme.label}
                                            </span>
                                        </motion.button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {step === "name" && (
                            <motion.div
                                key="name"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex flex-col items-center justify-center h-full max-w-md mx-auto"
                            >
                                <h3 className="text-2xl font-fredoka font-bold text-ink mb-2 text-center">
                                    Step 2: Name Your Hero
                                </h3>
                                <p className="text-ink-muted mb-8 text-center">
                                    Who will go on this {selectedTheme?.label.toLowerCase()}?
                                </p>

                                <div className="w-full relative group">
                                    <input
                                        autoFocus
                                        type="text"
                                        value={heroName}
                                        onChange={(e) => setHeroName(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                                        placeholder="Hero's name..."
                                        className="w-full px-8 py-5 rounded-3xl bg-white border-2 border-white/50 focus:border-amber-400 transition-all outline-none font-fredoka text-2xl text-ink shadow-soft group-hover:shadow-clay-amber"
                                    />
                                    <motion.div
                                        animate={{ opacity: heroName ? 1 : 0, scale: heroName ? 1 : 0.8 }}
                                        className="absolute right-3 top-3"
                                    >
                                        <button
                                            onClick={handleGenerate}
                                            className="p-3 rounded-2xl bg-amber-400 text-white shadow-clay-amber hover:scale-105 active:scale-95 transition-all"
                                        >
                                            <Wand2 className="w-6 h-6" />
                                        </button>
                                    </motion.div>
                                </div>
                                <button
                                    onClick={() => setStep("theme")}
                                    className="mt-6 text-ink-muted hover:text-ink font-fredoka font-bold transition-colors"
                                >
                                    ← Back to worlds
                                </button>
                            </motion.div>
                        )}

                        {step === "generating" && (
                            <motion.div
                                key="generating"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.1 }}
                                className="flex flex-col items-center justify-center h-full"
                            >
                                <div className="relative mb-8">
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                        className="w-32 h-32 rounded-full border-4 border-dashed border-amber-400/50 flex items-center justify-center"
                                    />
                                    <motion.div
                                        animate={{ y: [0, -10, 0] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                        className="absolute inset-0 flex items-center justify-center text-6xl"
                                    >
                                        ✨
                                    </motion.div>
                                </div>
                                <h3 className="text-2xl font-fredoka font-bold text-ink mb-2 text-center">
                                    Working Magic...
                                </h3>
                                <p className="text-ink-muted text-center animate-pulse">
                                    Lumo is weaving {heroName}&apos;s journey in the {selectedTheme?.label.toLowerCase()}
                                </p>
                            </motion.div>
                        )}

                        {step === "result" && selectedTheme && (
                            <motion.div
                                key="result"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="h-full flex flex-col md:flex-row gap-8 items-center"
                            >
                                <div className="max-w-2xl mx-auto flex flex-col gap-6 items-center text-center">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="inline-flex items-center gap-2 text-amber-600 font-fredoka font-bold text-sm">
                                            <Sparkles className="w-4 h-4 fill-current" />
                                            Your Personalized Preview
                                        </div>
                                        <h3 className="text-2xl sm:text-3xl font-fredoka font-bold text-ink leading-tight">
                                            {selectedTheme.label}: {heroName}&apos;s Adventure
                                        </h3>
                                    </div>

                                    <p className="text-xl font-nunito text-ink-muted italic leading-relaxed">
                                        &quot;{selectedTheme.preview.replace("{heroName}", heroName)}&quot;
                                    </p>

                                    <motion.div
                                        initial={{ scale: 0.9, rotate: -1 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ delay: 0.2, type: "spring" }}
                                        className="relative group cursor-pointer w-full max-w-lg"
                                    >
                                        <div className="absolute inset-0 bg-amber-400 rounded-[2.5rem] rotate-2 group-hover:rotate-4 transition-transform duration-500 opacity-20" />
                                        <div className="relative aspect-[4/3] rounded-[2.5rem] overflow-hidden border-4 border-white shadow-clay backdrop-blur-sm">
                                            <Image
                                                src={selectedTheme.image}
                                                alt={selectedTheme.label}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                    </motion.div>

                                    {/* Pitch Section */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-y border-amber-100/50 my-2 w-full">
                                        <div className="flex items-start gap-3 text-left">
                                            <div className="p-2 rounded-xl bg-purple-100 text-purple-600">
                                                <ImageIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-fredoka font-bold text-ink text-sm">AI Illustrations</h4>
                                                <p className="text-xs text-ink-muted">Every page is uniquely brought to life.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3 text-left">
                                            <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
                                                <Users className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-fredoka font-bold text-ink text-sm">Your Child, The Hero</h4>
                                                <p className="text-xs text-ink-muted">Create avatars that look just like them!</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-4 mt-2 w-full sm:w-auto">
                                        <Link
                                            href="/story-maker"
                                            className="px-8 py-4 rounded-2xl bg-amber-400 text-white font-fredoka font-bold text-lg shadow-clay-amber hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                                        >
                                            Create Full Story <ArrowRight className="w-5 h-5" />
                                        </Link>
                                        <button
                                            onClick={resetDemo}
                                            className="px-8 py-4 rounded-2xl bg-white border-2 border-slate-100 text-ink-muted font-fredoka font-bold text-lg hover:border-amber-200 transition-all whitespace-nowrap"
                                        >
                                            Try Again
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Background Blobs */}
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-amber-100/50 blur-3xl rounded-full -z-10" />
                <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-100/50 blur-3xl rounded-full -z-10" />
            </div>
        </div>
    );
}
