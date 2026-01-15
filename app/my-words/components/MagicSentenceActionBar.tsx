"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Wand2, X, Image as ImageIcon, Lock, LogIn, Trash2 } from "lucide-react";
import { cn } from "@/lib/core/utils/cn";
import Link from "next/link";
import { ConfirmationModal } from "./ConfirmationModal";

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
    onDelete?: () => void;
}

export function MagicSentenceActionBar({
    selectedCount,
    onClear,
    onGenerate,
    isGenerating,
    usage,
    imageUsage,
    isLoggedIn,
    activeChild,
    onDelete
}: MagicSentenceActionBarProps) {
    const [withImage, setWithImage] = useState(true);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    if (selectedCount === 0) return null;

    const isMagicLimitReached = usage?.isLimitReached || false;
    const isImageLimitReached = imageUsage?.isLimitReached || false;
    const isSelectionLimitExceeded = selectedCount > 10;
    const canGenerateImage = isLoggedIn && activeChild && !isImageLimitReached;
    const canGenerate = isLoggedIn && activeChild && !isMagicLimitReached && !isSelectionLimitExceeded;

    return (
        <motion.div
            initial={{ y: 150, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 150, opacity: 0, scale: 0.9 }}
            className="fixed bottom-6 inset-x-4 md:left-1/2 md:right-auto md:-translate-x-1/2 z-[80] md:w-full md:max-w-md pointer-events-none"
        >
            <div className="pointer-events-auto bg-white/80 backdrop-blur-xl rounded-[2rem] p-5 shadow-[0_20px_40px_-10px_rgba(124,58,237,0.3)] border-[3px] border-white ring-1 ring-white/50 flex flex-col gap-4 relative overflow-hidden">
                
                {/* Background Decor */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-200/30 rounded-full blur-2xl" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-200/30 rounded-full blur-2xl" />

                {/* Header: Count & Controls */}
                <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="bg-violet-100 w-10 h-10 rounded-2xl flex items-center justify-center border border-violet-200 shadow-inner">
                             <span className="text-xl font-black font-fredoka text-violet-600">{selectedCount}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="font-fredoka font-black text-slate-700 text-sm uppercase tracking-wide leading-none">
                                {selectedCount === 1 ? "Word Picked" : "Words Picked"}
                            </span>
                            <span className={cn(
                                "text-[10px] font-bold uppercase tracking-widest mt-1",
                                isSelectionLimitExceeded ? "text-rose-500 animate-pulse" : "text-slate-400"
                            )}>
                                {isSelectionLimitExceeded ? "Max 10 Allowed!" : "Max limit: 10"}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {onDelete && isLoggedIn && (
                            <button 
                                onClick={() => setShowDeleteConfirm(true)}
                                className="w-9 h-9 flex items-center justify-center rounded-xl bg-rose-50 text-rose-400 hover:bg-rose-500 hover:text-white transition-all border border-rose-100"
                                title="Delete Selected"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                        <button 
                            onClick={onClear}
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 transition-colors border border-slate-200"
                            title="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Credit Status (New) */}
                {isLoggedIn && (
                    <div className="flex items-center gap-2 px-1 flex-wrap">
                        <div className="flex items-center gap-2 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100">
                            <Sparkles className="w-3 h-3 text-purple-500" />
                            <span className="text-[10px] font-black text-purple-700 uppercase tracking-wide">
                                Magic Sentences: {usage?.current ?? 0}/{usage?.limit ?? 0}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                            <ImageIcon className="w-3 h-3 text-blue-500" />
                            <span className="text-[10px] font-black text-blue-700 uppercase tracking-wide">
                                Images: {imageUsage?.current ?? 0}/{imageUsage?.limit ?? 0}
                            </span>
                        </div>
                    </div>
                )}

                {/* Actions Row */}
                <div className="flex items-stretch gap-3 h-14 relative z-10">
                    {/* Image Toggle Button */}
                    <button
                        onClick={() => isLoggedIn && !isImageLimitReached && setWithImage(!withImage)}
                        disabled={!isLoggedIn || isImageLimitReached}
                        className={cn(
                            "relative w-1/3 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 transition-all duration-300 group",
                            !isLoggedIn || isImageLimitReached 
                                ? "bg-slate-50 border-slate-100 text-slate-300 opacity-80"
                                : withImage 
                                    ? "bg-blue-500 border-blue-400 text-white shadow-clay-blue -translate-y-1"
                                    : "bg-white border-slate-200 text-slate-400 hover:border-blue-300 hover:bg-blue-50"
                        )}
                    >
                         {withImage && (
                            <div className="absolute -top-2 -right-2 bg-amber-400 text-amber-900 text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-sm border border-white z-20">
                                -1
                            </div>
                        )}
                        
                        {isLoggedIn ? (
                            <>
                                <ImageIcon className={cn("w-5 h-5 transition-transform", withImage && "scale-110")} />
                                <span className="text-[9px] font-black uppercase tracking-wide">
                                    {withImage ? "Included" : "No Image"}
                                </span>
                            </>
                        ) : (
                             <>
                                <Lock className="w-4 h-4" />
                                <span className="text-[9px] font-bold uppercase">Locked</span>
                            </>
                        )}
                    </button>

                    {/* Main Magic Button */}
                    {isLoggedIn ? (
                        <button
                            onClick={() => onGenerate(withImage)}
                            disabled={isGenerating || !canGenerate}
                            className={cn(
                                "flex-1 rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 shadow-xl border-t border-white/20 relative overflow-hidden",
                                isGenerating || !canGenerate
                                    ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                                    : "bg-gradient-to-br from-violet-500 to-indigo-600 text-white hover:shadow-violet-300/50 hover:-translate-y-1 active:scale-95 active:translate-y-0"
                            )}
                        >
                             {isGenerating && (
                                <div className="absolute inset-0 bg-white/20 animate-pulse" />
                            )}
                            
                            {isGenerating ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Wand2 className={cn("w-5 h-5", !canGenerate && "opacity-50")} />
                            )}
                            
                            <div className="flex flex-col items-start leading-none">
                                <span className="font-fredoka font-black text-sm uppercase tracking-wider">
                                    {isGenerating ? "Casting..." : isSelectionLimitExceeded ? "Too Many!" : "Make Magic"}
                                </span>
                                {!isGenerating && canGenerate && (
                                    <span className="text-[9px] font-bold opacity-80 uppercase tracking-widest">
                                        Create Sentence
                                    </span>
                                )}
                            </div>
                        </button>
                    ) : (
                         <Link
                            href="/login"
                            className="flex-1 rounded-2xl flex items-center justify-center gap-2 bg-emerald-500 text-white hover:bg-emerald-600 transition-all font-fredoka font-black uppercase tracking-wider text-sm shadow-emerald-200 shadow-lg"
                        >
                            <LogIn className="w-4 h-4" />
                            Sign In
                        </Link>
                    )}
                </div>

                {/* Limit Warning Overlay (If exceeded) */}
                <AnimatePresence>
                    {isSelectionLimitExceeded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="bg-rose-50 text-rose-600 text-xs font-bold text-center py-2 rounded-xl border border-rose-100 flex items-center justify-center gap-2">
                                <Sparkles className="w-3 h-3" />
                                Please remove {selectedCount - 10} word{selectedCount - 10 > 1 ? 's' : ''} to proceed
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

             <ConfirmationModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={() => onDelete?.()}
                title="Remove Words?"
                message={`Are you sure you want to remove these ${selectedCount} words?`}
                confirmLabel="Yes, Remove"
                cancelLabel="Cancel"
                variant="danger"
            />
        </motion.div>
    );
}
