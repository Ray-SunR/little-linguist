"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/core/utils/cn";

export function StickyTrialCTA() {
    const [isVisible, setIsVisible] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        const dismissed = sessionStorage.getItem("lumo_sticky_cta_dismissed");
        if (dismissed === "true") {
            setIsDismissed(true);
            return;
        }

        const handleScroll = () => {
            if (window.scrollY > 600) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const handleDismiss = () => {
        setIsDismissed(true);
        sessionStorage.setItem("lumo_sticky_cta_dismissed", "true");
    };

    if (isDismissed) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 100, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 100, scale: 0.9 }}
                    className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none"
                >
                    <div className="relative pointer-events-auto">
                        <Link
                            href="/login"
                            className="group flex items-center gap-3 bg-white/90 backdrop-blur-md border-2 border-amber-400 pl-6 pr-4 py-3 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all"
                        >
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase tracking-wider font-black text-amber-600 leading-none">
                                    Limited Time
                                </span>
                                <span className="text-sm sm:text-base font-fredoka font-bold text-ink">
                                    Start Your Adventure Free
                                </span>
                            </div>
                            <div className="flex items-center gap-2 bg-amber-400 text-white px-4 py-2 rounded-full font-fredoka font-bold shadow-clay-amber group-hover:gap-3 transition-all">
                                Try Now
                                <ArrowRight className="w-4 h-4" />
                            </div>
                        </Link>

                        {/* Dismiss Button */}
                        <button
                            onClick={handleDismiss}
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center hover:bg-black transition-colors shadow-lg"
                            aria-label="Dismiss"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>

                        {/* Pulse Ring */}
                        <motion.div
                            animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0, 0.1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute inset-0 -z-10 bg-amber-400 rounded-full blur-xl"
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
