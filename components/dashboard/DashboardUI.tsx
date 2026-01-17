"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { BookOpen, Sparkles, Wand2, Star, TrendingUp, Clock, ChevronRight } from "lucide-react";
import { LumoCharacter } from "@/components/ui/lumo-character";
import type { ChildProfile } from "@/app/actions/profiles";
import type { DashboardStats } from "@/app/actions/dashboard";
import { CachedImage } from "@/components/ui/cached-image";
import { InterestEditorModal } from "@/components/dashboard/InterestEditorModal";
import { useState } from "react";
import { Edit2 } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";

interface Props {
    activeChild: ChildProfile | null;
    stats: DashboardStats | null;
}

export default function DashboardUI({ activeChild, stats }: Props) {
    const { refreshProfiles } = useAuth();
    const [isInterestModalOpen, setIsInterestModalOpen] = useState(false);
    const [optimisticInterests, setOptimisticInterests] = useState<string[] | null>(null);
    const childName = activeChild?.first_name || "Captain";
    const level = stats?.level || activeChild?.level || 1;
    const xp = stats?.totalXp || activeChild?.total_xp || 0;
    const nextLevelXp = level * 1000;
    const xpProgress = Math.min((xp / nextLevelXp) * 100, 100);

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
                <div className="flex items-center justify-center gap-2 mt-4">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-100 text-purple-700 font-bold text-sm border border-purple-200">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        {activeChild ? `${activeChild.first_name}'s System Online` : "System Online"}
                    </div>
                    {activeChild && (
                        <button 
                            onClick={() => setIsInterestModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-500 font-bold text-xs hover:bg-slate-200 transition-colors"
                        >
                            <Edit2 className="w-3 h-3" />
                            Edit Interests
                        </button>
                    )}
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
                        <div className="w-full h-6 bg-purple-50 rounded-full overflow-hidden mb-2 border-2 border-purple-100 relative shadow-inner">
                            {activeChild ? (
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${xpProgress}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600 relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:2rem_2rem] animate-[move-bg_3s_linear_infinite]" />
                                </motion.div>
                            ) : (
                                <div className="absolute inset-0 bg-slate-200/50 backdrop-blur-[2px] flex items-center justify-center">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Locked</span>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-between text-xs font-black text-purple-700/70 uppercase tracking-wider">
                            <span>{activeChild ? `${xp} XP` : "0 XP"}</span>
                            <span>{nextLevelXp} XP</span>
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

                <div className="grid gap-6 md:grid-cols-4">
                    {/* Words Module */}
                    <Link href="/my-words" className="block group">
                        <div className="clay-card p-6 h-full bg-amber-50 border-2 border-amber-100 hover:border-amber-300 transition-colors">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center mb-4 shadow-clay-amber group-hover:scale-110 transition-transform">
                                <Sparkles className="w-6 h-6" />
                            </div>
                            <div className="text-2xl font-black text-amber-600 font-fredoka">{stats?.masteredWords || 0}</div>
                            <h4 className="text-lg font-black text-ink font-fredoka mb-1">Words Mastered</h4>
                            <p className="text-sm text-ink-muted font-bold">Data Bank</p>
                        </div>
                    </Link>

                    {/* Library Module */}
                    <Link href="/library" className="block group">
                        <div className="clay-card p-6 h-full bg-blue-50 border-2 border-blue-100 hover:border-blue-300 transition-colors">
                            <div className="w-12 h-12 rounded-2xl bg-blue-500 text-white flex items-center justify-center mb-4 shadow-clay-blue group-hover:scale-110 transition-transform">
                                <BookOpen className="w-6 h-6" />
                            </div>
                            <div className="text-2xl font-black text-blue-600 font-fredoka">{stats?.completedBooks || 0}</div>
                            <h4 className="text-lg font-black text-ink font-fredoka mb-1">Books Read</h4>
                            <p className="text-sm text-ink-muted font-bold">Story Archive</p>
                        </div>
                    </Link>

                    {/* Story Maker Module */}
                    <Link href="/story-maker" className="block group">
                        <div className="clay-card p-6 h-full bg-pink-50 border-2 border-pink-100 hover:border-pink-300 transition-colors">
                            <div className="w-12 h-12 rounded-2xl bg-pink-500 text-white flex items-center justify-center mb-4 shadow-clay-pink group-hover:scale-110 transition-transform">
                                <Wand2 className="w-6 h-6" />
                            </div>
                            <div className="text-2xl font-black text-pink-600 font-fredoka">{stats?.storiesCreated || 0}</div>
                            <h4 className="text-lg font-black text-ink font-fredoka mb-1">Stories Created</h4>
                            <p className="text-sm text-ink-muted font-bold">The Lab</p>
                        </div>
                    </Link>

                    {/* Sentences Module */}
                    <Link href="/my-words?tab=sentences" className="block group">
                        <div className="clay-card p-6 h-full bg-purple-50 border-2 border-purple-100 hover:border-purple-300 transition-colors">
                            <div className="w-12 h-12 rounded-2xl bg-purple-500 text-white flex items-center justify-center mb-4 shadow-clay-purple group-hover:scale-110 transition-transform">
                                <Sparkles className="w-6 h-6" />
                            </div>
                            <div className="text-2xl font-black text-purple-600 font-fredoka">{stats?.magicSentencesCreated || 0}</div>
                            <h4 className="text-lg font-black text-ink font-fredoka mb-1">Magic Sentences</h4>
                            <p className="text-sm text-ink-muted font-bold">Magic Room</p>
                        </div>
                    </Link>
                </div>
            </motion.div>

            {/* BADGE SHOWCASE */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="w-full max-w-4xl mt-12"
            >
                <div className="flex items-center justify-between mb-6 px-2">
                    <h3 className="text-xl font-black font-fredoka text-ink-muted">
                        Earned Badges
                    </h3>
                    <span className="text-sm font-black text-purple-600 bg-purple-100 px-3 py-1 rounded-full">
                        {stats?.badges?.length || 0} Unlocked
                    </span>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-2">
                    {stats?.badges && stats.badges.length > 0 ? (
                        stats.badges.map((badgeEntry: any) => {
                            const badge = badgeEntry.badges;
                            return (
                                <motion.div
                                    key={badge.id}
                                    whileHover={{ scale: 1.05 }}
                                    className="flex-shrink-0 w-32 h-40 clay-card bg-white border-2 border-purple-50 p-4 flex flex-col items-center justify-center text-center group cursor-help relative"
                                >
                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 shadow-sm
                                        ${badge.rarity === 'legendary' ? 'bg-amber-100 text-amber-600 shadow-amber-200' : 
                                          badge.rarity === 'epic' ? 'bg-purple-100 text-purple-600 shadow-purple-200' : 
                                          badge.rarity === 'rare' ? 'bg-blue-100 text-blue-600 shadow-blue-200' : 
                                          'bg-slate-100 text-slate-600 shadow-slate-200'}`}
                                    >
                                        <Star className={`w-8 h-8 ${badge.rarity !== 'basic' ? 'fill-current' : ''}`} />
                                    </div>
                                    <div className="text-xs font-black text-ink font-fredoka leading-tight">{badge.name}</div>
                                    
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-3 bg-ink text-white text-[10px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                                        <div className="font-black mb-1">{badge.description}</div>
                                        <div className="text-ink-muted-light font-bold">Earned: {new Date(badgeEntry.earned_at).toLocaleDateString()}</div>
                                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-ink"></div>
                                    </div>
                                </motion.div>
                            );
                        })
                    ) : (
                        <div className="w-full py-8 text-center bg-purple-50/50 rounded-3xl border-2 border-dashed border-purple-100">
                            <p className="text-purple-400 font-bold">No badges yet. Start your first mission to earn one!</p>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* WEEKLY PROGRESS */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="w-full max-w-4xl mt-12 mb-12"
            >
                <div className="clay-card p-8 bg-white border-2 border-purple-100">
                    <h3 className="text-xl font-black font-fredoka text-ink mb-6 flex items-center gap-2">
                        <TrendingUp className="w-6 h-6 text-green-500" />
                        Weekly Reading Activity
                    </h3>

                    <div className="flex items-end justify-between h-48 gap-2 mt-4 px-2">
                        {stats?.weeklyActivity?.map((day, idx) => {
                            const maxMins = Math.max(...(stats?.weeklyActivity?.map(d => d.minutes) || [30]));
                            const height = Math.max((day.minutes / (maxMins || 1)) * 100, 10);
                            const dayName = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' });
                            const colors = ['bg-mint-400', 'bg-sky-400', 'bg-peach-400', 'bg-purple-400', 'bg-amber-400', 'bg-rose-400', 'bg-indigo-400'];
                            
                            return (
                                <div key={day.date} className="flex-1 flex flex-col items-center group relative">
                                    <motion.div 
                                        initial={{ height: 0 }}
                                        animate={{ height: `${height}%` }}
                                        transition={{ delay: 0.7 + idx * 0.1, duration: 0.5 }}
                                        className={`w-full max-w-[40px] rounded-t-xl shadow-inner ${colors[idx % colors.length]} relative group-hover:brightness-110 transition-all`}
                                    >
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-ink text-white text-[10px] font-black px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                                            {day.minutes}m
                                        </div>
                                    </motion.div>
                                    <div className="mt-4 text-xs font-black text-ink-muted uppercase tracking-tighter">{dayName}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </motion.div>


            {activeChild && (
                <InterestEditorModal 
                    isOpen={isInterestModalOpen}
                    onClose={() => setIsInterestModalOpen(false)}
                    child={{
                        id: activeChild.id,
                        name: activeChild.first_name,
                        interests: optimisticInterests || activeChild.interests
                    }}
                    onUpdate={async (newInterests) => {
                         setOptimisticInterests(newInterests);
                         await refreshProfiles(true);
                         window.location.reload();
                    }} 
                />
            )}
        </main>
    );
}
