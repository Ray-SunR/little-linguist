"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, X } from "lucide-react";

interface ParentalGateProps {
    onSuccess: () => void;
    onCancel: () => void;
    title?: string;
}

export function ParentalGate({ onSuccess, onCancel, title = "Parent's Only" }: ParentalGateProps) {
    const [val1] = useState(Math.floor(Math.random() * 10) + 1);
    const [val2] = useState(Math.floor(Math.random() * 10) + 1);
    const [answer, setAnswer] = useState("");
    const [error, setError] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (parseInt(answer) === val1 + val2) {
            onSuccess();
        } else {
            setError(true);
            setAnswer("");
            setTimeout(() => setError(false), 500);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-ink/20 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="clay-card w-full max-w-sm p-8 bg-white border-4 border-orange-200 shadow-clay-orange relative"
            >
                <button 
                    onClick={onCancel}
                    className="absolute top-4 right-4 p-2 text-ink-muted hover:text-ink transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="text-center">
                    <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-clay-orange">
                        <Lock className="w-8 h-8 text-orange-500" />
                    </div>
                    
                    <h2 className="text-2xl font-black text-ink font-fredoka uppercase tracking-tight mb-2">{title}</h2>
                    <p className="text-sm text-ink-muted font-bold font-nunito mb-8 lowercase first-letter:uppercase">
                        Ask a grown-up for help with this magic puzzle!
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="flex items-center justify-center gap-4 text-3xl font-black font-fredoka text-ink">
                            <span>{val1}</span>
                            <span className="text-orange-400">+</span>
                            <span>{val2}</span>
                            <span className="text-slate-300">=</span>
                            <input 
                                autoFocus
                                type="number"
                                value={answer}
                                onChange={(e) => setAnswer(e.target.value)}
                                className={`w-20 h-16 rounded-2xl bg-slate-50 border-4 text-center focus:outline-none transition-all ${
                                    error ? "border-rose-400 animate-shake" : "border-slate-100 focus:border-orange-200"
                                }`}
                                placeholder="?"
                            />
                        </div>

                        <button 
                            type="submit"
                            className="w-full bg-gradient-to-r from-orange-400 to-amber-500 py-4 rounded-2xl text-white font-black font-fredoka uppercase tracking-widest shadow-clay-orange hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            Open Magic Gate
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}

// Helper wrapper component
export function ParentalLink({ children, href, className, title }: { children: React.ReactNode, href: string, className?: string, title?: string }) {
    const [showGate, setShowGate] = useState(false);

    return (
        <>
            <div 
                onClick={() => setShowGate(true)} 
                className={`cursor-pointer ${className}`}
            >
                {children}
            </div>
            {showGate && (
                <ParentalGate 
                    title={title}
                    onSuccess={() => {
                        setShowGate(false);
                        window.location.href = href;
                    }}
                    onCancel={() => setShowGate(false)}
                />
            )}
        </>
    );
}
