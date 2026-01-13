"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/auth/auth-provider";
import { cn } from "@/lib/core/utils/cn";

// Pages where the banner should NOT appear
const EXCLUDED_PATHS = ["/", "/login", "/signup", "/onboarding"];

export function GuestBanner() {
    const { user, isLoading } = useAuth();
    const pathname = usePathname();
    const [isVisible, setIsVisible] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);

    // Check if current path should exclude the banner
    const isExcludedPath = EXCLUDED_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"));

    useEffect(() => {
        setHasMounted(true);
        // Check session storage to see if previously dismissed
        const ignored = typeof window !== 'undefined' ? sessionStorage.getItem("guest-banner-dismissed") : null;

        // Show if:
        // 1. Not loading auth
        // 2. No user (guest)
        // 3. Not previously dismissed in this session
        // 4. Not on an excluded path
        if (!isLoading && !user && !ignored && !isExcludedPath) {
            // Small delay to allow initial layout to settle
            const timer = setTimeout(() => setIsVisible(true), 1000);
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
        }
    }, [user, isLoading, isExcludedPath]);

    const handleDismiss = () => {
        setIsVisible(false);
        sessionStorage.setItem("guest-banner-dismissed", "true");
    };

    if (!hasMounted || user) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="relative z-40 bg-white/90 backdrop-blur-md border-b border-indigo-100/50 shadow-sm"
                >
                    <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 shrink-0">
                                <Sparkles className="w-4 h-4" />
                            </div>
                            <p className="text-sm font-nunito font-bold text-slate-700 leading-snug truncate sm:whitespace-normal">
                                <span className="hidden sm:inline">You&apos;re an Explorer! </span>
                                Create an account to <span className="text-indigo-600 font-extrabold">keep your magical discoveries safe.</span>
                            </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                            <Link
                                href="/signup"
                                className="px-4 py-1.5 rounded-full bg-[#FFAA00] hover:bg-[#FFB700] text-white text-xs sm:text-sm font-fredoka font-black uppercase tracking-wide shadow-sm hover:shadow-md hover:scale-105 transition-all active:scale-95 whitespace-nowrap"
                            >
                                Keep My Progress
                            </Link>
                            <button
                                onClick={handleDismiss}
                                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                aria-label="Dismiss"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
