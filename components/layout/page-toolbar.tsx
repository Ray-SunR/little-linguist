"use client";

import React from "react";
import { cn } from "@/lib/core";
import Link from "next/link";
import { User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CachedImage } from "@/components/ui/cached-image";

export interface ToolbarChild {
    id: string;
    name: string;
    avatar_url?: string | null;
}

interface PageToolbarProps {
    activeChild?: ToolbarChild | null;
    children: React.ReactNode;
    className?: string;
    containerClassName?: string;
    id?: string;
    "data-tour-target"?: string;
    themeColor?: "violet" | "indigo" | "rose" | "emerald" | "amber" | "slate";
    isSearchExpanded?: boolean;
}

/**
 * Shared PageToolbar component that provides a unified sticky, blurry ribbon 
 * with a glass-morphic container and profile avatar.
 */
export function PageToolbar({ 
    activeChild, 
    children, 
    className,
    containerClassName,
    id,
    "data-tour-target": dataTourTarget,
    themeColor = "violet",
    isSearchExpanded = false
}: PageToolbarProps) {
    const themes = {
        violet: {
            ribbon: "bg-violet-50/70 border-violet-100/50",
            avatarGlow: "from-violet-400 to-indigo-400",
            avatarRing: "ring-violet-100 hover:ring-violet-400",
            avatarFallback: "bg-violet-100 text-violet-600",
            glassRing: "ring-violet-200/30",
        },
        indigo: {
            ribbon: "bg-indigo-50/70 border-indigo-100/50",
            avatarGlow: "from-indigo-400 to-blue-400",
            avatarRing: "ring-indigo-100 hover:ring-indigo-400",
            avatarFallback: "bg-indigo-100 text-indigo-600",
            glassRing: "ring-indigo-200/30",
        },
        rose: {
            ribbon: "bg-rose-50/70 border-rose-100/50",
            avatarGlow: "from-rose-400 to-pink-400",
            avatarRing: "ring-rose-100 hover:ring-rose-400",
            avatarFallback: "bg-rose-100 text-rose-600",
            glassRing: "ring-rose-200/30",
        },
        emerald: {
            ribbon: "bg-emerald-50/70 border-emerald-100/50",
            avatarGlow: "from-emerald-400 to-teal-400",
            avatarRing: "ring-emerald-100 hover:ring-emerald-400",
            avatarFallback: "bg-emerald-100 text-emerald-600",
            glassRing: "ring-emerald-200/30",
        },
        amber: {
            ribbon: "bg-amber-50/70 border-amber-100/50",
            avatarGlow: "from-amber-400 to-orange-400",
            avatarRing: "ring-amber-100 hover:ring-amber-400",
            avatarFallback: "bg-amber-100 text-amber-600",
            glassRing: "ring-amber-200/30",
        },
        slate: {
            ribbon: "bg-slate-50/70 border-slate-200/50",
            avatarGlow: "from-slate-400 to-slate-500",
            avatarRing: "ring-slate-100 hover:ring-slate-400",
            avatarFallback: "bg-slate-100 text-slate-600",
            glassRing: "ring-slate-200/30",
        }
    };

    const theme = themes[themeColor];

    return (
        <div 
            id={id}
            data-tour-target={dataTourTarget}
            className={cn("sticky top-0 z-[40] w-full isolate", containerClassName)}
        >
            <div className={cn(
                "backdrop-blur-2xl transition-colors duration-500",
                "border-b shadow-sm px-1.5 md:px-6 lg:px-8 py-3 md:py-4",
                theme.ribbon
            )}>
                <div className="max-w-7xl mx-auto">
                    <div className={cn(
                        "mx-auto w-full max-w-7xl transition-all duration-300 relative z-[100]",
                        className
                    )}>
                        {/* Glass Container */}
                        <div className={cn(
                            "backdrop-blur-xl bg-white/95",
                            "shadow-[0_8px_32px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02),0_16px_48px_-12px_rgba(0,0,0,0.08)]",
                            "border border-white/80 ring-1",
                            theme.glassRing,
                            "rounded-2xl px-1.5 py-1.5 md:px-4 md:py-3",
                            "flex items-center gap-0.5 md:gap-4",
                            "transition-all duration-500"
                        )}>
                            {/* Profile / Avatar - Hide on mobile when search is expanded */}
                            <AnimatePresence>
                                {!isSearchExpanded && (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.8, width: 0 }}
                                        animate={{ opacity: 1, scale: 1, width: "auto" }}
                                        exit={{ opacity: 0, scale: 0.8, width: 0 }}
                                        className="flex-shrink-0"
                                    >
                                {activeChild ? (
                                    <Link href="/dashboard" className="block relative group">
                                        <div className={cn(
                                            "absolute -inset-1 bg-gradient-to-r rounded-full blur opacity-20 group-hover:opacity-40 transition duration-500",
                                            theme.avatarGlow
                                        )}></div>
                                        <div className={cn(
                                            "relative w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white shadow-clay-sm overflow-hidden bg-slate-50 ring-2 transition-all",
                                            theme.avatarRing
                                        )}>
                                            {activeChild.avatar_url ? (
                                                <CachedImage
                                                    src={activeChild.avatar_url}
                                                    alt={activeChild.name}
                                                    fill
                                                    className="object-cover"
                                                    bucket="user-assets"
                                                />
                                            ) : (
                                                <div className={cn(
                                                    "w-full h-full font-fredoka font-bold flex items-center justify-center",
                                                    theme.avatarFallback
                                                )}>
                                                    {activeChild.name?.[0] || "?"}
                                                </div>
                                            )}
                                        </div>
                                    </Link>
                                ) : (
                                    <Link href="/login" className="block relative group">
                                        <div className="absolute -inset-1 bg-gradient-to-r from-slate-400 to-slate-500 rounded-full blur opacity-10 group-hover:opacity-20 transition duration-500"></div>
                                        <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white shadow-clay-sm bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-white transition-all" title="Sign In">
                                            <User className="w-5 h-5 stroke-[2.5]" />
                                        </div>
                                    </Link>
                                )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Content Slot (Tabs, Search, Filters, etc.) */}
                            <div className="flex items-center justify-between min-w-0 gap-0.5 md:gap-2 flex-1">
                                {children}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
