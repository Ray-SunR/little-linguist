"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Wand2, X, Image as ImageIcon, Lock, LogIn } from "lucide-react";
import { cn } from "@/lib/core/utils/cn";
import Link from "next/link";

interface UsageStatus {
    current: number;
    limit: number;
    isLimitReached: boolean;
}

interface MagicSentenceActionBarProps {
    selectedCount: number;
    onClear: () => void;
    onGenerate: (generateImage?: boolean) => void;
    isGenerating: boolean;
    usage?: UsageStatus;
    imageUsage?: UsageStatus;
    isLoggedIn: boolean;
    activeChild: any | null;
}

export function MagicSentenceActionBar({
    selectedCount,
    onClear,
    onGenerate,
    isGenerating,
    usage,
    imageUsage,
    isLoggedIn,
    activeChild
}: MagicSentenceActionBarProps) {
    const [withImage, setWithImage] = useState(false);

    if (selectedCount === 0) return null;

    const isMagicLimitReached = usage?.isLimitReached || false;
    const isImageLimitReached = imageUsage?.isLimitReached || false;
    const canGenerateImage = isLoggedIn && activeChild && !isImageLimitReached;
    const canGenerate = isLoggedIn && activeChild && !isMagicLimitReached;

    return (
        <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 inset-x-4 md:left-1/2 md:right-auto md:-translate-x-1/2 z-[80] md:w-full md:max-w-2xl"
        >
            <div className="clay-card bg-white/90 backdrop-blur-md rounded-[2.5rem] p-4 md:p-6 border-4 border-purple-100/50 shadow-2xl flex flex-col md:flex-row items-center gap-4 md:gap-6">
                
                {/* Info & Close */}
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <button 
                        onClick={onClear}
                        className="p-3 rounded-2xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                        title="Clear Selection"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-black font-fredoka text-purple-600">
                                {selectedCount}
                            </span>
                            <span className="font-fredoka font-bold text-ink text-sm uppercase tracking-wide">
                                {selectedCount === 1 ? "Word picked" : "Words picked"}
                            </span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            Max 5 words for best magic
                        </p>
                    </div>
                </div>

                {/* Options & Action */}
                <div className="flex items-center gap-3 w-full md:flex-1 justify-end">
                    
                    {/* Image Toggle */}
                    <button
                        onClick={() => isLoggedIn && !isImageLimitReached && setWithImage(!withImage)}
                        disabled={!isLoggedIn || isImageLimitReached}
                        className={cn(
                            "relative flex items-center gap-3 px-4 py-3 rounded-2xl transition-all border-2 select-none active:scale-95",
                            !isLoggedIn || isImageLimitReached
                                ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
                                : withImage 
                                    ? "bg-blue-500 border-blue-600 text-white shadow-clay-blue" 
                                    : "bg-white border-slate-200 text-slate-400 hover:border-blue-200 hover:bg-blue-50/50"
                        )}
                    >
                        {isLoggedIn ? (
                            <>
                                <div className="relative">
                                    {withImage ? (
                                        <ImageIcon className="w-5 h-5 animate-in zoom-in-50 duration-300" />
                                    ) : (
                                        <div className="relative">
                                            <ImageIcon className="w-5 h-5 opacity-40" />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-full h-[2px] bg-slate-400 rotate-45 transform" />
                                            </div>
                                        </div>
                                    )}
                                    <AnimatePresence>
                                        {withImage && (
                                            <motion.div 
                                                initial={{ scale: 0, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                exit={{ scale: 0, opacity: 0 }}
                                                className="absolute -top-3 -right-3 bg-amber-400 text-amber-950 text-[9px] font-black px-1.5 py-0.5 rounded-full border-2 border-white shadow-sm flex items-center justify-center shrink-0"
                                            >
                                                -1
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <div className="flex flex-col items-start text-left min-w-[80px]">
                                    <span className="font-fredoka font-black text-[10px] uppercase tracking-wider block">
                                        {withImage ? "Include Art" : "No Picture"}
                                    </span>
                                    <span className={cn(
                                        "text-[9px] font-bold block",
                                        withImage ? "text-blue-100" : "text-slate-400"
                                    )}>
                                        {isImageLimitReached ? "Limit Reached" : withImage ? "Costs 1 Credit" : "Saves Credit"}
                                    </span>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Lock className="w-5 h-5 text-slate-300" />
                                <span className="font-fredoka font-black text-[10px] uppercase text-slate-300">Image Locked</span>
                            </div>
                        )}
                    </button>

                    {/* Main Action */}
                    {isLoggedIn ? (
                        <button
                            onClick={() => onGenerate(withImage)}
                            disabled={isGenerating || !canGenerate}
                            className={cn(
                                "flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-3 rounded-2xl transition-all shadow-lg active:scale-95",
                                canGenerate 
                                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-200" 
                                    : "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                            )}
                        >
                            {isGenerating ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Wand2 className="w-5 h-5" />
                            )}
                            <span className="font-fredoka font-black uppercase tracking-wider">
                                {isGenerating 
                                    ? "Casting..." 
                                    : !activeChild 
                                        ? "Pick a Profile" 
                                        : isMagicLimitReached 
                                            ? "Out of Magic" 
                                            : "Make Magic!"}
                            </span>
                        </button>
                    ) : (
                        <Link
                            href="/login"
                            className="flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-3 rounded-2xl bg-emerald-500 text-white shadow-lg active:scale-95"
                        >
                            <LogIn className="w-5 h-5" />
                            <span className="font-fredoka font-black uppercase tracking-wider">Sign in for Magic</span>
                        </Link>
                    )}
                </div>

                {/* Quota Hints (Desktop) */}
                {isLoggedIn && (
                    <div className="hidden lg:flex flex-col gap-1 border-l border-slate-100 pl-6 shrink-0">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-purple-500" />
                            <span className="text-[10px] font-black text-slate-400 uppercase">Magic: {usage?.current ?? 0}/{usage?.limit ?? 0}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="text-[10px] font-black text-slate-400 uppercase">Image: {imageUsage?.current ?? 0}/{imageUsage?.limit ?? 0}</span>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
