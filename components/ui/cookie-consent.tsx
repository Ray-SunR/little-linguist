"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, X } from "lucide-react";
import Link from "next/link";
import { Capacitor } from "@capacitor/core";

export function CookieConsent() {
    const [isVisible, setIsVisible] = useState(false);
    const [isNative, setIsNative] = useState(false);

    useEffect(() => {
        // Handle hydration and native check
        setIsNative(Capacitor.isNativePlatform());
    }, []);

    useEffect(() => {
        if (isNative) return;

        // Check if user has already made a choice
        const consent = localStorage.getItem("lumo-cookie-consent");
        if (!consent) {
            // Delay showing to not overwhelm
            const timer = setTimeout(() => setIsVisible(true), 2000);
            return () => clearTimeout(timer);
        }
    }, [isNative]);

    const handleAccept = () => {
        localStorage.setItem("lumo-cookie-consent", "accepted");
        setIsVisible(false);
    };

    const handleDecline = () => {
        localStorage.setItem("lumo-cookie-consent", "declined");
        setIsVisible(false);
    };

    if (isNative) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-6 left-6 right-6 md:left-auto md:right-12 md:max-w-md z-[100]"
                >
                    <div className="clay-card p-6 md:p-8 bg-white border-2 border-indigo-50 shadow-clay-purple relative overflow-hidden">
                        {/* Decorative background element */}
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-50 rounded-full blur-2xl opacity-50" />
                        
                        <div className="relative z-10">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center shrink-0 shadow-sm">
                                    <Cookie className="w-6 h-6 text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-ink font-fredoka uppercase tracking-tight">Cookie Magic</h3>
                                    <p className="text-sm text-ink-muted font-medium font-nunito leading-relaxed mt-1">
                                        We use cookies to personalize your experience and analyze our traffic. Read our <Link href="/legal/privacy" className="text-indigo-600 underline font-bold">Privacy Policy</Link> to learn more.
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setIsVisible(false)}
                                    className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-300"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={handleAccept}
                                    className="flex-1 bg-indigo-600 text-white h-12 rounded-xl font-black font-fredoka uppercase tracking-wider text-sm shadow-clay-purple hover:scale-[1.02] active:scale-95 transition-all"
                                >
                                    Accept All
                                </button>
                                <button
                                    onClick={handleDecline}
                                    className="flex-1 bg-white text-indigo-600 border-2 border-indigo-100 h-12 rounded-xl font-black font-fredoka uppercase tracking-wider text-sm hover:bg-indigo-50 transition-all"
                                >
                                    Necessary Only
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
