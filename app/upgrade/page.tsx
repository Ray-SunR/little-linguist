"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
    Sparkles, 
    ArrowLeft, 
    Zap, 
    ShieldCheck, 
    History,
    CreditCard
} from "lucide-react";
import { cn } from "@/lib/core/utils/cn";
import { useAuth } from "@/components/auth/auth-provider";
import { useUsage } from "@/lib/hooks/use-usage";

export default function UpgradePage() {
    const { user } = useAuth();
    const { plan, usage, loading } = useUsage(["story_generation", "image_generation"]);

    if (plan === 'pro') {
        return (
            <div className="min-h-screen bg-shell flex items-center justify-center p-6">
                <div className="max-w-md w-full clay-card p-12 text-center bg-white">
                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-clay-mint">
                        <Sparkles className="w-10 h-10 text-emerald-500 animate-pulse" />
                    </div>
                    <h1 className="text-4xl font-black text-ink font-fredoka uppercase tracking-tight mb-4">You&apos;re already Pro!</h1>
                    <p className="text-ink-muted font-medium mb-8 leading-relaxed">
                        You have infinite story magic at your fingertips. Go back and create something wonderful!
                    </p>
                    <Link href="/story-maker">
                        <button className="primary-btn w-full h-16 rounded-2xl flex items-center justify-center gap-3">
                            Back to Story Maker
                        </button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-shell pt-10 pb-32 px-6">
            <div className="max-w-4xl mx-auto">
                <Link href="/story-maker" className="inline-flex items-center gap-2 font-fredoka font-black text-ink-muted hover:text-ink transition-colors uppercase tracking-wider text-sm mb-12">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Adventure
                </Link>

                <div className="grid md:grid-cols-5 gap-8 items-start">
                    <div className="md:col-span-3 space-y-8">
                        <header>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 border border-amber-200 mb-4">
                                <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                <span className="text-[10px] font-black font-fredoka text-amber-600 uppercase tracking-widest leading-none">Power Up</span>
                            </div>
                            <h1 className="text-5xl font-black text-ink font-fredoka leading-tight mb-4 lowercase first-letter:uppercase">
                                Level up to Master Storyteller
                            </h1>
                            <p className="text-lg text-ink-muted font-medium font-nunito leading-relaxed">
                                Don&apos;t let the creativity stop. Unlock everything and give your child the gift of infinite imagination.
                            </p>
                        </header>

                        <div className="space-y-4">
                            {[
                                { title: "20 AI Stories Monthly", icon: Sparkles, color: "text-purple-500 bg-purple-50" },
                                { title: "100 High-Res Images Monthly", icon: Zap, color: "text-amber-500 bg-amber-50" },
                                { title: "1000 Word Insights Monthly", icon: History, color: "text-blue-500 bg-blue-50" },
                                { title: "Premium Voice Cast", icon: ShieldCheck, color: "text-emerald-500 bg-emerald-50" },
                            ].map((feature) => (
                                <motion.div 
                                    key={feature.title}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-center gap-4 p-4 rounded-3xl bg-white border-2 border-white shadow-clay-sm"
                                >
                                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm", feature.color)}>
                                        <feature.icon className="w-6 h-6" />
                                    </div>
                                    <span className="font-fredoka font-black text-ink uppercase tracking-tight">{feature.title}</span>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    <aside className="md:col-span-2">
                        <div className="clay-card p-8 bg-white border-4 border-purple-200 shadow-clay-purple relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2" />
                            
                            <h3 className="font-fredoka font-black text-ink uppercase tracking-[0.2em] text-[10px] mb-6 block text-slate-400">Your Selection</h3>
                            
                            <div className="mb-8">
                                <h4 className="text-2xl font-black text-ink font-fredoka uppercase tracking-tight">Pro Plan</h4>
                                <div className="flex items-baseline gap-1 mt-1">
                                    <span className="text-4xl font-black text-purple-600 font-fredoka">$9.99</span>
                                    <span className="text-ink-muted font-bold text-lg">/month</span>
                                </div>
                            </div>

                            <div className="space-y-4 mb-10 border-t-2 border-slate-50 pt-6">
                                <div className="flex justify-between text-sm">
                                    <span className="font-bold text-ink-muted">Monthly Pro Access</span>
                                    <span className="font-black text-ink">$9.99</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="font-bold text-ink-muted">Taxes</span>
                                    <span className="font-black text-ink">$0.00</span>
                                </div>
                                <div className="flex justify-between border-t-2 border-slate-50 pt-4">
                                    <span className="font-black text-ink uppercase text-sm tracking-wider">Total Charge</span>
                                    <span className="font-black text-purple-600 text-xl font-fredoka">$9.99</span>
                                </div>
                            </div>

                            <button className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 py-5 rounded-[1.5rem] text-white font-black font-fredoka uppercase tracking-widest text-lg shadow-clay-purple hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3">
                                <CreditCard className="w-6 h-6" />
                                Start Magic
                            </button>
                            
                            <p className="mt-6 text-[10px] text-center text-ink-muted font-bold uppercase tracking-widest leading-relaxed">
                                Cancel anytime • Secure Billing
                            </p>
                        </div>

                        <div className="mt-6 text-center space-y-4">
                            <Link href="/pricing" className="text-xs font-black text-ink-muted uppercase tracking-widest hover:text-purple-600 transition-colors underline decoration-2 underline-offset-4 decoration-purple-100 block">
                                View all plans and details
                            </Link>
                            <div className="flex items-center justify-center gap-4 text-[10px] text-ink-muted font-bold uppercase tracking-widest">
                                <Link href="/legal/terms" className="hover:text-ink">Terms</Link>
                                <span>•</span>
                                <Link href="/legal/privacy" className="hover:text-ink">Privacy</Link>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}
