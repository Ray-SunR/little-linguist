"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { BookOpen, Sparkles, Wand2, Star, TrendingUp, Clock, ChevronRight, User } from "lucide-react";
import { LumoCharacter } from "@/components/ui/lumo-character";
import type { ChildProfile } from "@/app/actions/profiles";
import { CachedImage } from "@/components/ui/cached-image";

interface Props {
    activeChild: ChildProfile | null;
}

export default function DashboardUI({ activeChild }: Props) {
    const childName = activeChild?.first_name || "Captain";
    const childAvatar = activeChild?.avatar_asset_path;
    const age = activeChild?.birth_year ? new Date().getFullYear() - activeChild.birth_year : null;

    return (
        <main className="min-h-screen page-story-maker flex flex-col items-center px-6 py-10 pb-32">
            {/* MISSION HEADER: Commander LumoMind */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8 w-full max-w-4xl relative"
            >
                <div className="relative inline-block mt-4 mb-4">
                    <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                        className="w-40 h-40 mx-auto relative flex items-center justify-center rounded-[2.5rem]"
                    >
                        {activeChild?.avatar_asset_path ? (
                            <CachedImage
                                src={activeChild.avatar_asset_path}
                                storagePath={activeChild.avatar_paths?.[activeChild.primary_avatar_index ?? 0] || activeChild.avatar_asset_path}
                                updatedAt={activeChild.updated_at}
                                alt={`${childName}'s Avatar`}
                                fill
                                className="object-cover rounded-3xl shadow-clay-purple border-4 border-purple-50"
                                bucket="user-assets"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <LumoCharacter size="xl" priority={true} />
                            </div>
                        )}
                    </motion.div>

                    {/* Speech Bubble */}
                    <motion.div
                        initial={{ scale: 0, opacity: 0, x: -20 }}
                        animate={{ scale: 1, opacity: 1, x: 0 }}
                        transition={{ delay: 0.8, type: "spring", stiffness: 260, damping: 20 }}
                        className="absolute -top-12 -right-28 bg-white p-5 rounded-[2rem] rounded-bl-none shadow-2xl border-2 border-purple-100 max-w-[220px] hidden lg:block z-50 overflow-visible"
                    >
                        {/* Pointer */}
                        <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-white border-b-2 border-l-2 border-purple-100 rotate-45 rounded-sm" />

                        <p className="text-base font-black text-ink font-fredoka leading-tight">
                            &quot;{childName}! Ready for today&apos;s adventure?&quot; 🚀
                        </p>
                    </motion.div>
                </div>

                <h1 className="text-4xl md:text-5xl font-black text-ink mb-2 font-fredoka tracking-tight">
                    Mission Control
                </h1>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-100 text-purple-700 font-bold text-sm border border-purple-200">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    {activeChild ? `${activeChild.first_name}'s System Online` : "System Online"}
                </div>
            </motion.div>

            {/* DAILY QUEST & STATUS BAR */}
            <div className="w-full max-w-4xl grid md:grid-cols-3 gap-6 mb-12">

                {/* Daily Quest Card (Takes up 2/3) */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="md:col-span-2 clay-card p-6 md:p-8 bg-gradient-to-br from-amber-400 to-orange-500 text-white relative overflow-hidden group cursor-pointer"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-black uppercase tracking-wider border border-white/30">
                                    Daily Mission
                                </span>
                                <span className="text-amber-100 font-bold text-xs flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Expires in 12h
                                </span>
                            </div>
                            <h2 className="text-3xl font-black font-fredoka leading-tight mb-2 group-hover:scale-[1.02] transition-transform origin-left">
                                Read &quot;The Lost Star&quot;
                            </h2>
                            <p className="text-amber-100 font-medium font-nunito max-w-sm">
                                Find out where the little star went! Earn +50 XP and unlock the &quot;Stargazer&quot; badge.
                            </p>
                        </div>

                        <div className="mt-6 flex items-center justify-between">
                            <Link href="/library" className="px-6 py-3 rounded-xl bg-white text-orange-600 font-black font-fredoka shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                                Start Mission <ChevronRight className="w-5 h-5" />
                            </Link>
                            <div className="text-center">
                                <div className="text-2xl font-black transform rotate-6">+50</div>
                                <div className="text-xs font-bold uppercase opacity-80">XP Reward</div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Explorer Status (Takes up 1/3) */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="clay-card p-6 bg-white border-2 border-purple-100 flex flex-col justify-between"
                >
                    <div>
                        <h3 className="text-lg font-black font-fredoka text-ink mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-purple-500" />
                            Explorer Status
                        </h3>

                        {/* Level Info */}
                        <div className="flex items-end gap-2 mb-2">
                            <span className="text-4xl font-black text-purple-600 font-fredoka leading-none">Lvl 3</span>
                            <span className="text-sm font-bold text-purple-400 mb-1">Cadet</span>
                        </div>

                        {/* XP Bar */}
                        <div className="w-full h-4 bg-purple-50 rounded-full overflow-hidden mb-1 border border-purple-100 relative">
                            {activeChild ? (
                                <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 w-[75%]" />
                            ) : (
                                <div className="absolute inset-0 bg-slate-200/50 backdrop-blur-[2px] flex items-center justify-center">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Locked</span>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-between text-xs font-bold text-ink-muted">
                            <span>{activeChild ? "750 XP" : "0 XP"}</span>
                            <span>1000 XP</span>
                        </div>
                    </div>

                    {/* Streak / Guest Join CTA */}
                    <div className="mt-6 pt-6 border-t border-dashed border-purple-100">
                        {activeChild ? (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-500">
                                    <Star className="w-6 h-6 fill-current" />
                                </div>
                                <div>
                                    <div className="text-lg font-black text-ink font-fredoka">5 Day Streak</div>
                                    <div className="text-xs text-ink-muted font-bold">Keep it up, {childName}!</div>
                                </div>
                            </div>
                        ) : (
                            <Link href="/login" className="flex items-center justify-between group/cta">
                                <div className="flex flex-col">
                                    <span className="text-xs font-black text-purple-600 uppercase tracking-widest leading-none mb-1">Guest Mode</span>
                                    <span className="text-sm font-black text-ink font-fredoka leading-none group-hover/cta:text-purple-600 transition-colors">Sign in to track progress</span>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 group-hover/cta:scale-110 transition-transform">
                                    <ChevronRight className="w-5 h-5" />
                                </div>
                            </Link>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* MODULES (Feature Cards) */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="w-full max-w-4xl"
            >
                <h3 className="text-xl font-black font-fredoka text-ink-muted mb-6 px-2">
                    Ship Modules
                </h3>

                <div className="grid gap-6 md:grid-cols-3">
                    {/* Library Module */}
                    <Link href="/library" className="block group">
                        <div className="clay-card p-6 h-full bg-blue-50 border-2 border-blue-100 hover:border-blue-300 transition-colors">
                            <div className="w-12 h-12 rounded-2xl bg-blue-500 text-white flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-transform">
                                <BookOpen className="w-6 h-6" />
                            </div>
                            <h4 className="text-lg font-black text-ink font-fredoka mb-1">Story Archive</h4>
                            <p className="text-sm text-ink-muted font-bold">Access full library</p>
                        </div>
                    </Link>

                    {/* Story Maker Module */}
                    <Link href="/story-maker" className="block group">
                        <div className="clay-card p-6 h-full bg-pink-50 border-2 border-pink-100 hover:border-pink-300 transition-colors">
                            <div className="w-12 h-12 rounded-2xl bg-pink-500 text-white flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-transform">
                                <Wand2 className="w-6 h-6" />
                            </div>
                            <h4 className="text-lg font-black text-ink font-fredoka mb-1">The Lab</h4>
                            <p className="text-sm text-ink-muted font-bold">Create new stories</p>
                        </div>
                    </Link>

                    {/* Words Module */}
                    <Link href="/my-words" className="block group">
                        <div className="clay-card p-6 h-full bg-amber-50 border-2 border-amber-100 hover:border-amber-300 transition-colors">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-transform">
                                <Sparkles className="w-6 h-6" />
                            </div>
                            <h4 className="text-lg font-black text-ink font-fredoka mb-1">Data Bank</h4>
                            <p className="text-sm text-ink-muted font-bold">Review vocabulary</p>
                        </div>
                    </Link>
                </div>
            </motion.div>
        </main>
    );
}
