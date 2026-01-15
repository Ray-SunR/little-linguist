"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { BookOpen, Sparkles, Wand2, Star, TrendingUp, Lock, ChevronRight, UserPlus, LogIn } from "lucide-react";
import { LumoCharacter } from "@/components/ui/lumo-character";

export default function DashboardGuestPrompt() {
    return (
        <main className="min-h-screen bg-shell flex flex-col items-center justify-center px-6 py-20 pb-32 overflow-hidden relative">
            {/* Background Blobs for Atmosphere */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-200/30 rounded-full blur-[100px] animate-blob-slow" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/30 rounded-full blur-[100px] animate-blob-reverse" />

            <div className="w-full max-w-4xl z-10">
                {/* HERO SECTION */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <div className="relative inline-block mb-6">
                        <motion.div
                            animate={{ y: [0, -15, 0] }}
                            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                        >
                            <LumoCharacter size="xl" priority={true} />
                        </motion.div>
                        
                        <motion.div
                            initial={{ scale: 0, rotate: -15 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.5, type: "spring" }}
                            className="absolute -top-4 -right-4 bg-amber-400 text-ink font-black text-xs px-3 py-1.5 rounded-full shadow-lg border-2 border-white rotate-12"
                        >
                            GUEST MODE
                        </motion.div>
                    </div>

                    <h1 className="text-4xl md:text-6xl font-black text-ink mb-4 font-fredoka tracking-tight leading-tight">
                        Unlock Your <span className="text-purple-600">Magic Adventure!</span>
                    </h1>
                    <p className="text-lg md:text-xl text-ink-muted font-bold max-w-2xl mx-auto mb-10 leading-relaxed">
                        Join thousands of explorers! Sign in to track your reading progress, earn legendary badges, and level up your skills.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link 
                            href="/login" 
                            className="w-full sm:w-auto px-10 py-5 rounded-[2rem] bg-purple-600 text-white font-black font-fredoka text-xl shadow-clay-purple hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
                        >
                            <LogIn className="w-6 h-6" /> Start Adventure
                        </Link>
                        <Link 
                            href="/login?mode=signup" 
                            className="w-full sm:w-auto px-10 py-5 rounded-[2rem] bg-white text-purple-600 font-black font-fredoka text-xl border-4 border-purple-100 shadow-xl hover:bg-purple-50 active:scale-95 transition-all flex items-center justify-center gap-3"
                        >
                            <UserPlus className="w-6 h-6" /> Create Account
                        </Link>
                    </div>
                </motion.div>

                {/* VISUAL TEASER GRID */}
                <div className="grid md:grid-cols-3 gap-8 mt-16 scale-90 md:scale-100 opacity-60 grayscale-[0.2]">
                    {/* XP Teaser */}
                    <div className="clay-card p-6 bg-white border-2 border-purple-50 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-slate-100/50 backdrop-blur-[1px] flex items-center justify-center z-20">
                            <div className="bg-white/90 p-3 rounded-2xl shadow-xl flex items-center gap-2 border-2 border-purple-100 scale-110">
                                <Lock className="w-5 h-5 text-purple-600" />
                                <span className="font-black text-ink font-fredoka">Sign in to unlock</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp className="w-5 h-5 text-purple-500" />
                            <h3 className="font-black text-ink font-fredoka">Explorer Status</h3>
                        </div>
                        <div className="text-2xl font-black text-purple-600 font-fredoka mb-4">Level 10</div>
                        <div className="w-full h-4 bg-purple-50 rounded-full overflow-hidden border-2 border-purple-100 shadow-inner">
                            <div className="w-[60%] h-full bg-gradient-to-r from-purple-500 to-indigo-600" />
                        </div>
                    </div>

                    {/* Stats Teaser */}
                    <div className="clay-card p-6 bg-white border-2 border-blue-50 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-slate-100/50 backdrop-blur-[1px] flex items-center justify-center z-20 font-black text-ink font-fredoka">
                            <div className="bg-white/90 p-3 rounded-2xl shadow-xl flex items-center gap-2 border-2 border-blue-100 scale-110">
                                <Lock className="w-5 h-5 text-blue-600" />
                                <span className="font-black text-ink font-fredoka">Sign in to unlock</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mb-4 text-blue-500">
                            <BookOpen className="w-5 h-5" />
                            <h3 className="font-black text-ink font-fredoka">Books Read</h3>
                        </div>
                        <div className="text-4xl font-black text-blue-600 font-fredoka">12</div>
                        <div className="mt-4 flex gap-1">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className={`h-8 w-6 rounded-md ${i < 4 ? 'bg-blue-400' : 'bg-blue-100'}`} />
                            ))}
                        </div>
                    </div>

                    {/* Badges Teaser */}
                    <div className="clay-card p-6 bg-white border-2 border-amber-50 relative overflow-hidden group">
                         <div className="absolute inset-0 bg-slate-100/50 backdrop-blur-[1px] flex items-center justify-center z-20 font-black text-ink font-fredoka">
                            <div className="bg-white/90 p-3 rounded-2xl shadow-xl flex items-center gap-2 border-2 border-amber-100 scale-110">
                                <Lock className="w-5 h-5 text-amber-600" />
                                <span className="font-black text-ink font-fredoka">Sign in to unlock</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mb-4 text-amber-500">
                            <Star className="w-5 h-5" />
                            <h3 className="font-black text-ink font-fredoka">Badges</h3>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-500">
                                <Star className="w-6 h-6 fill-current" />
                            </div>
                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                                <Star className="w-6 h-6" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* FEATURES LIST */}
                <div className="mt-20 flex flex-wrap justify-center gap-x-12 gap-y-6 px-4">
                    {[
                        { icon: Star, text: "Earn XP & Levels", color: "text-purple-500" },
                        { icon: BookOpen, text: "Track Every Page", color: "text-blue-500" },
                        { icon: Wand2, text: "Save Story Creations", color: "text-pink-500" },
                        { icon: Sparkles, text: "Vocabulary Mastery", color: "text-amber-500" },
                    ].map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl bg-white shadow-md ${feature.color}`}>
                                <feature.icon className="w-5 h-5" />
                            </div>
                            <span className="font-black text-ink font-fredoka">{feature.text}</span>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}
