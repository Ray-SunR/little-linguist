"use client";

import Link from "next/link";
import { BookOpen, Wand2, Languages, User, LogOut, Mail, MessageCircle, Rocket, Sparkles, Users, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { CachedImage } from "@/components/ui/cached-image";
import { cn } from "@/lib/core/utils/cn";
import { ParentalLink } from "@/components/ui/parental-gate";
import { useRef, useEffect } from "react";

interface NavHubModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
    plan: any;
    usage: any;
    loading: boolean;
    onLogout: () => Promise<void>;
}

export function NavHubModal({
    isOpen,
    onClose,
    user,
    plan,
    usage,
    loading,
    onLogout
}: NavHubModalProps) {
    const prefersReducedMotion = useReducedMotion();
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            modalRef.current?.focus();
        }
    }, [isOpen]);

    const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "";
    const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || "";
    const userInitial = fullName ? fullName[0].toUpperCase() : (user?.email?.[0]?.toUpperCase() ?? "?");

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <motion.div
                        initial={prefersReducedMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0.95, opacity: 0, y: 10 }}
                        animate={prefersReducedMotion ? { opacity: 1 } : { scale: 1, opacity: 1, y: 0 }}
                        exit={prefersReducedMotion ? { opacity: 0 } : { scale: 0.95, opacity: 0, y: 10 }}
                        transition={prefersReducedMotion ? { duration: 0.1 } : { duration: 0.2 }}
                        ref={modalRef}
                        className="relative w-full max-w-md clay-card p-10 text-center bg-white/95 backdrop-blur-2xl shadow-2xl overflow-hidden outline-none"
                        tabIndex={-1}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="hub-modal-title"
                    >
                        {/* Decorative Blobs */}
                        <div className="absolute top-[-50px] left-[-50px] w-32 h-32 bg-purple-100 rounded-full blur-3xl opacity-60" />
                        <div className="absolute bottom-[-50px] right-[-50px] w-32 h-32 bg-orange-100 rounded-full blur-3xl opacity-60" />

                        <div className="relative">
                            {user ? (
                                <div className="flex flex-col gap-8">
                                    {/* Horizontal Header */}
                                    <div className="flex items-center gap-6 bg-slate-50/50 p-5 rounded-[2.5rem] border border-slate-100 shadow-sm">
                                        <div className="relative shrink-0">
                                            <div className="w-24 h-24 rounded-3xl bg-white border-4 border-white shadow-clay-white overflow-hidden flex items-center justify-center">
                                                {avatarUrl ? (
                                                    <CachedImage
                                                        src={avatarUrl}
                                                        alt="Profile"
                                                        width={96}
                                                        height={96}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-indigo-500 text-white">
                                                        <User className="w-10 h-10" />
                                                    </div>
                                                )}
                                            </div>
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className={cn(
                                                    "absolute -bottom-1 -right-1 px-2 py-0.5 rounded-lg border-2 border-white shadow-sm font-fredoka font-black text-[8px] uppercase tracking-wider flex items-center gap-1 z-10",
                                                    plan === 'pro' ? "bg-amber-400 text-white" : "bg-slate-500 text-white"
                                                )}
                                            >
                                                {plan === 'pro' ? 'Pro' : 'Free'}
                                            </motion.div>
                                        </div>

                                        <div className="text-left flex-1 min-w-0">
                                            <h2 id="hub-modal-title" className="text-xl font-fredoka font-black text-ink mb-0.5 truncate">
                                                {fullName || "Magic Voyager"}
                                            </h2>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[10px] font-fredoka font-black text-purple-600 uppercase tracking-widest">Parent Account</span>
                                                <div className="flex items-center gap-1.5 text-slate-400 font-nunito font-bold text-xs truncate">
                                                    <Mail className="w-3 h-3" />
                                                    <span className="truncate">{user.email}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Slim Subscription & Micro-Usage Row */}
                                    {plan !== 'pro' ? (
                                        <div className="flex flex-col gap-6">
                                            <div className="relative overflow-hidden rounded-3xl bg-indigo-600 p-5 text-white shadow-clay-purple flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <Sparkles className="w-5 h-5 text-amber-300" />
                                                    <span className="text-[12px] font-black font-fredoka uppercase tracking-tight">Unlock Premium Access</span>
                                                </div>
                                                <ParentalLink
                                                    href="/pricing"
                                                    className="px-5 py-2 bg-white text-indigo-600 rounded-xl font-black font-fredoka text-[11px] uppercase shadow-sm active:scale-95 transition-all shrink-0"
                                                >
                                                    Upgrade
                                                </ParentalLink>
                                            </div>

                                            {!loading && (
                                                <div className="grid grid-cols-3 gap-3">
                                                    {[
                                                        { key: 'story_generation', label: 'Stories', icon: Wand2, color: 'text-purple-500' },
                                                        { key: 'image_generation', label: 'Images', icon: Sparkles, color: 'text-pink-500' },
                                                        { key: 'word_insight', label: 'Insights', icon: Languages, color: 'text-emerald-500' }
                                                    ].map(feat => {
                                                        const stat = usage[feat.key];
                                                        if (!stat) return null;
                                                        return (
                                                            <div key={feat.key} className="bg-white border border-slate-100 p-3 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-clay-sm">
                                                                <feat.icon className={cn("w-4 h-4 mb-0.5", feat.color)} />
                                                                <div className="flex flex-col items-center">
                                                                    <span className="text-[11px] font-black font-fredoka text-ink leading-tight">
                                                                        {stat.current}/{stat.limit}
                                                                    </span>
                                                                    <span className="text-[8px] font-bold font-nunito text-slate-400 uppercase tracking-tighter leading-tight">
                                                                        {feat.label}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-2xl flex items-center justify-between px-4 shadow-inner-sm">
                                            <div className="flex items-center gap-2">
                                                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                                <span className="text-[10px] font-black font-fredoka uppercase tracking-widest text-emerald-600">Pro Portal Active</span>
                                            </div>
                                            <span className="text-[10px] font-black font-fredoka text-emerald-400">Unlimited Access</span>
                                        </div>
                                    )}

                                    {/* Action Matrix (2x2 Grid) */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <ParentalLink
                                            href="/profiles"
                                            className="flex flex-col items-center gap-3 p-5 rounded-3xl bg-white border border-slate-100/50 hover:bg-purple-50 transition-all shadow-clay-sm active:scale-95 cursor-pointer"
                                        >
                                            <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center shrink-0 shadow-inner-sm">
                                                <Users className="w-6 h-6 text-purple-600" />
                                            </div>
                                            <span className="text-[10px] font-black font-fredoka text-ink uppercase leading-tight tracking-wider">Profiles</span>
                                        </ParentalLink>

                                        <ParentalLink
                                            href="/dashboard/subscription"
                                            className="flex flex-col items-center gap-3 p-5 rounded-3xl bg-white border border-slate-100/50 hover:bg-orange-50 transition-all shadow-clay-sm active:scale-95 cursor-pointer"
                                        >
                                            <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center shrink-0 shadow-inner-sm">
                                                <ShieldCheck className="w-6 h-6 text-orange-600" />
                                            </div>
                                            <span className="text-[10px] font-black font-fredoka text-ink uppercase leading-tight tracking-wider">Subscription</span>
                                        </ParentalLink>

                                        <ParentalLink
                                            href="/support/contact"
                                            className="flex flex-col items-center gap-3 p-5 rounded-3xl bg-white border border-slate-100/50 hover:bg-blue-50 transition-all shadow-clay-sm active:scale-95 cursor-pointer"
                                        >
                                            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0 shadow-inner-sm">
                                                <MessageCircle className="w-6 h-6 text-blue-600" />
                                            </div>
                                            <span className="text-[10px] font-black font-fredoka text-ink uppercase leading-tight tracking-wider">Feedback</span>
                                        </ParentalLink>

                                        <button
                                            onClick={onLogout}
                                            className="flex flex-col items-center gap-3 p-5 rounded-3xl bg-rose-50 border border-rose-100/50 hover:bg-rose-100 transition-all shadow-clay-sm active:scale-95 cursor-pointer"
                                        >
                                            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-inner-sm">
                                                <LogOut className="w-6 h-6 text-rose-500" />
                                            </div>
                                            <span className="text-[10px] font-black font-fredoka text-rose-600 uppercase leading-tight tracking-wider">Log Out</span>
                                        </button>
                                    </div>

                                    <button
                                        onClick={onClose}
                                        className="w-full flex items-center justify-center gap-3 p-5 rounded-3xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-clay-md active:scale-95 cursor-pointer mt-4"
                                    >
                                        <Rocket className="w-6 h-6" />
                                        <span className="text-[10px] font-black font-fredoka uppercase leading-tight tracking-wider">Return to Adventure</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center py-6">
                                    {/* Hero Visual */}
                                    <div className="relative mb-6">
                                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                                            <Sparkles className="w-12 h-12 text-indigo-500" />
                                        </div>
                                        <motion.div
                                            initial={{ scale: 0, rotate: -20 }}
                                            animate={{ scale: 1, rotate: 12 }}
                                            className="absolute -bottom-2 -right-2 px-3 py-1 rounded-full bg-[#FFAA00] text-white text-[10px] font-fredoka font-black uppercase tracking-wide shadow-md border-2 border-white"
                                        >
                                            Free!
                                        </motion.div>
                                    </div>

                                    {/* Hero Copy */}
                                    <h2 id="hub-modal-title" className="text-2xl font-fredoka font-black text-ink mb-2 leading-tight text-center">
                                        Secure Your Family&apos;s Magical Library
                                    </h2>
                                    <p className="text-slate-500 font-nunito font-semibold text-sm mb-6 text-center max-w-[280px]">
                                        Create a parent account to manage your child&apos;s stories, track their learning progress, and unlock infinite adventures.
                                    </p>

                                    {/* Benefits */}
                                    <div className="w-full grid grid-cols-3 gap-3 mb-6">
                                        {[
                                            { icon: BookOpen, label: "Save Progress", color: "text-blue-500 bg-blue-50" },
                                            { icon: Wand2, label: "Create Stories", color: "text-purple-500 bg-purple-50" },
                                            { icon: Languages, label: "Track Words", color: "text-orange-500 bg-orange-50" },
                                        ].map((benefit) => (
                                            <div key={benefit.label} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white border border-slate-100 shadow-sm">
                                                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", benefit.color)}>
                                                    <benefit.icon className="w-4 h-4" />
                                                </div>
                                                <span className="text-[9px] font-fredoka font-black text-slate-600 uppercase tracking-tight text-center leading-tight">
                                                    {benefit.label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Primary CTA */}
                                    <Link
                                        href="/login"
                                        className="w-full py-4 rounded-2xl bg-[#FFAA00] hover:bg-[#FFB700] text-white font-fredoka font-black text-center text-lg shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                                        onClick={onClose}
                                    >
                                        Create Free Account
                                    </Link>

                                    {/* Secondary */}
                                    <Link
                                        href="/login"
                                        className="mt-3 text-sm font-fredoka font-bold text-slate-500 hover:text-indigo-600 transition-colors"
                                        onClick={onClose}
                                    >
                                        Already have an account? <span className="underline">Log In</span>
                                    </Link>
                                </div>
                            )}

                            <button
                                onClick={onClose}
                                className="hidden"
                            >
                                {user ? "Back to Adventure" : "Close Portal"}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
