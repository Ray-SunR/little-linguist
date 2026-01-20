"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { BookOpen, Sparkles, Wand2, Star, TrendingUp, Clock, ChevronRight, History, Info, CheckCircle2, Trophy } from "lucide-react";
import { LumoCharacter } from "@/components/ui/lumo-character";
import type { ChildProfile } from "@/app/actions/profiles";
import type { DashboardStats } from "@/app/actions/dashboard";
import { CachedImage } from "@/components/ui/cached-image";
import { InterestEditorModal } from "@/components/dashboard/InterestEditorModal";
import { useState } from "react";
import { Edit2 } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { useRouter } from "next/navigation";

interface Props {
    activeChild: ChildProfile | null;
    stats: DashboardStats | null;
}

export default function DashboardUI({ activeChild, stats }: Props) {
    const { refreshProfiles } = useAuth();
    const router = useRouter();
    const [isInterestModalOpen, setIsInterestModalOpen] = useState(false);
    const [showCoinsGuide, setShowCoinsGuide] = useState(false);
    const [optimisticInterests, setOptimisticInterests] = useState<string[] | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    const handleRefreshMissions = async () => {
        setIsRefreshing(true);
        router.refresh();
        // Give it a moment for the animation
        setTimeout(() => setIsRefreshing(false), 800);
    };

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

                {/* Missions Section (Takes up 2/3) */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="md:col-span-2 flex flex-col gap-4"
                >
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-black font-fredoka text-ink flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-amber-500" />
                            Active Missions
                        </h3>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={handleRefreshMissions}
                                disabled={isRefreshing}
                                className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                    isRefreshing ? 'bg-slate-100 text-slate-400' : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                                }`}
                            >
                                <History className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                                Refresh
                            </button>
                            <span className="text-[10px] font-black text-amber-600 bg-amber-100 px-3 py-1 rounded-full uppercase tracking-wider">
                                {stats?.recommendations?.length || 0} Available
                            </span>
                        </div>
                    </div>

                    {stats?.recommendations && stats.recommendations.length > 0 ? (
                        <div className="grid gap-4">
                            {stats.recommendations.slice(0, 3).map((mission, idx) => (
                                <motion.div
                                    key={mission.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 + idx * 0.1 }}
                                    className={`clay-card group relative overflow-hidden p-4 md:p-6 transition-all duration-500 ${
                                        mission.isRead 
                                            ? 'bg-gradient-to-br from-slate-100 to-slate-200 border-slate-200' 
                                            : `bg-gradient-to-br ${
                                                idx === 0 ? 'from-amber-400 to-orange-500 shadow-clay-orange' : 
                                                idx === 1 ? 'from-indigo-500 to-purple-600 shadow-clay-purple' : 
                                                'from-emerald-500 to-teal-600 shadow-clay-emerald'
                                            } text-white`
                                    }`}
                                >
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8" />
                                    
                                    {mission.isRead && (
                                        <div className="absolute inset-0 bg-slate-400/5 backdrop-blur-[1px] z-20 pointer-events-none flex items-center justify-center">
                                            {/* SKEUOMORPHIC STAMP */}
                                            <motion.div 
                                                initial={{ scale: 3, opacity: 0, rotate: -20 }}
                                                animate={{ scale: 1, opacity: 1, rotate: -12 }}
                                                transition={{ 
                                                    type: "spring", 
                                                    stiffness: 300, 
                                                    damping: 15,
                                                    delay: 0.5 + (idx * 0.1)
                                                }}
                                                className="relative"
                                            >
                                                {/* Jagged Seal Shape using CSS mask/clip or multiple circles */}
                                                <div className="w-32 h-32 rounded-full bg-emerald-600 border-4 border-white shadow-2xl flex items-center justify-center p-2 relative overflow-hidden">
                                                    {/* Inner Ring */}
                                                    <div className="absolute inset-1 rounded-full border-2 border-emerald-400/30 border-dashed" />
                                                    
                                                    <div className="text-center z-10">
                                                        <Trophy className="w-8 h-8 text-amber-300 mx-auto mb-1 drop-shadow-md" />
                                                        <div className="font-fredoka font-black text-[10px] leading-tight text-white uppercase tracking-tighter">
                                                            Mission<br/>Accomplished
                                                        </div>
                                                        <div className="mt-1 flex justify-center gap-0.5">
                                                            {[1,2,3,4,5].map(s => <Star key={s} className="w-2 h-2 fill-amber-300 text-amber-300" />)}
                                                        </div>
                                                    </div>

                                                    {/* Shine effect on stamp */}
                                                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />
                                                </div>
                                                
                                                {/* Ink Smudge Effect */}
                                                <div className="absolute -inset-2 bg-emerald-600/10 blur-xl rounded-full -z-10" />
                                            </motion.div>
                                        </div>
                                    )}

                                    <div className={`relative z-10 flex gap-4 md:gap-6 transition-all duration-700 ${mission.isRead ? 'opacity-40 grayscale-[0.8] scale-[0.98]' : ''}`}>
                                        <div className="hidden sm:block w-24 shrink-0 aspect-[3/4] relative rounded-xl overflow-hidden shadow-xl border-2 border-white/20 group-hover:scale-105 transition-transform duration-500">
                                            <CachedImage
                                                src={mission.coverImageUrl || ""}
                                                storagePath={mission.coverPath}
                                                alt={mission.title}
                                                fill
                                                className="object-cover"
                                                bucket="book-assets"
                                            />
                                        </div>
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className={`px-2 py-0.5 rounded-full backdrop-blur-md text-[10px] font-black uppercase tracking-wider border ${
                                                        mission.isRead 
                                                            ? 'bg-slate-200 text-slate-500 border-slate-300' 
                                                            : 'bg-white/20 text-white border-white/30'
                                                    }`}>
                                                        {mission.isRead ? 'Archived' : idx === 0 ? 'Primary' : 'Side Quest'}
                                                    </span>
                                                    {!mission.isRead && (
                                                        <span className="text-white/80 font-bold text-[10px] flex items-center gap-1">
                                                            <Clock className="w-3 h-3" /> {mission.estimatedReadingTime || 5} min
                                                        </span>
                                                    )}
                                                </div>
                                                <h2 className={`${idx === 0 ? 'text-2xl' : 'text-xl'} font-black font-fredoka leading-tight mb-1 transition-colors ${
                                                    mission.isRead ? 'text-slate-600' : 'text-white'
                                                }`}>
                                                    {mission.title}
                                                </h2>
                                                <p className={`font-medium font-nunito text-xs line-clamp-2 ${
                                                    mission.isRead ? 'text-slate-400' : 'text-white/80'
                                                }`}>
                                                    {mission.description || `Embark on a new adventure with "${mission.title}"!`}
                                                </p>
                                            </div>

                                            <div className="mt-4 flex items-center justify-between gap-4">
                                                {mission.isRead ? (
                                                    <Link 
                                                        href={`/reader/${mission.id}`} 
                                                        className="px-6 py-2 rounded-xl bg-slate-200 text-slate-600 font-black font-fredoka border border-slate-300 hover:bg-slate-300 transition-all flex items-center gap-2 text-sm pointer-events-auto"
                                                    >
                                                        Read Again
                                                    </Link>
                                                ) : (
                                                    <Link 
                                                        href={`/reader/${mission.id}?mission=true`} 
                                                        className="px-6 py-2 rounded-xl bg-white text-ink font-black font-fredoka shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 group/btn text-sm"
                                                    >
                                                        Start <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                                    </Link>
                                                )}
                                                <div className="flex flex-col items-end">
                                                    {mission.isRead ? (
                                                        <div className="bg-emerald-100 text-emerald-600 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter border border-emerald-200 flex items-center gap-1">
                                                            <CheckCircle2 className="w-3 h-3" /> Claimed
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="text-xl font-black transform rotate-2">+{idx === 0 ? 100 : 50}</div>
                                                            <div className="text-[10px] font-bold uppercase opacity-80 whitespace-nowrap">Coins</div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <motion.div 
                            className="clay-card p-10 bg-slate-50 border-2 border-dashed border-slate-200 text-center"
                        >
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                <BookOpen className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-black font-fredoka text-slate-400">All Missions Clear!</h3>
                            <p className="text-slate-400 font-medium text-sm mt-2">Visit the library to find something new to read.</p>
                            <Link href="/library" className="inline-flex items-center gap-2 px-6 py-2 mt-6 rounded-xl bg-purple-600 text-white font-black font-fredoka shadow-lg hover:bg-purple-700 transition-all">
                                Go to Library <ChevronRight className="w-4 h-4" />
                            </Link>
                        </motion.div>
                    )}
                </motion.div>

                {/* Explorer Status (Takes up 1/3) */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="clay-card p-6 bg-white border-2 border-purple-100 flex flex-col justify-between"
                >
                    <div>
                        <h3 className="text-lg font-black font-fredoka text-ink mb-4 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-purple-500" />
                                Explorer Status
                            </div>
                            <button 
                                onClick={() => setShowCoinsGuide(!showCoinsGuide)}
                                className="w-6 h-6 rounded-full bg-purple-50 text-purple-400 hover:bg-purple-100 hover:text-purple-600 transition-colors flex items-center justify-center"
                            >
                                <Info className="w-4 h-4" />
                            </button>
                        </h3>

                        {/* Level Info */}
                        <div className="flex items-end gap-2 mb-2">
                            <span className="text-4xl font-black text-purple-600 font-fredoka leading-none">Lvl {level}</span>
                            <span className="text-sm font-bold text-purple-400 mb-1">
                                {level >= 10 ? 'Elite' : level >= 5 ? 'Veteran' : 'Cadet'}
                            </span>
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
                            <span>{activeChild ? `${xp} Coins` : "0 Coins"}</span>
                            <span>{nextLevelXp} Coins</span>
                        </div>
                    </div>

                    <AnimatePresence>
                        {showCoinsGuide && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="mt-4 p-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100 text-[11px] font-bold text-amber-900/80 space-y-2">
                                    <div className="flex items-center justify-between text-amber-600 font-black uppercase tracking-tighter">
                                        <span>How to Earn</span>
                                        <Sparkles className="w-3 h-3" />
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span>📖 Open a new book</span>
                                        <span className="text-amber-600">+10</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span>🎉 Finish a book</span>
                                        <span className="text-amber-600">+50</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span>🚀 Mission book reward</span>
                                        <span className="text-amber-600">+100</span>
                                    </div>
                                    <div className="pt-1 text-[9px] text-amber-500 italic opacity-80 leading-tight">
                                        Use Coins soon to redeem AI credits for your stories!
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Streak / Guest Join CTA */}
                    <div className="mt-6 pt-6 border-t border-dashed border-purple-100">
                        {activeChild ? (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-500">
                                    <Star className="w-6 h-6 fill-current" />
                                </div>
                                <div>
                                    <div className="text-lg font-black text-ink font-fredoka">{stats?.streakCount || 0} Day Streak</div>
                                    <div className="text-xs text-ink-muted font-bold">
                                        {(stats?.streakCount || 0) > 0 ? `Keep it up, ${childName}!` : `Start your first mission!`}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                <Link href="/story-maker" className="flex items-center justify-between group/cta bg-purple-50 p-3 rounded-2xl hover:bg-purple-100 transition-colors">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-purple-600 uppercase tracking-widest leading-none mb-1">Guest Flow</span>
                                        <span className="text-sm font-black text-ink font-fredoka leading-none group-hover/cta:text-purple-600 transition-colors">Create a Story</span>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center text-purple-600 group-hover/cta:scale-110 transition-transform">
                                        <ChevronRight className="w-5 h-5" />
                                    </div>
                                </Link>
                                <Link href="/login" className="flex items-center justify-between group/cta">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Already a member?</span>
                                        <span className="text-sm font-black text-ink-muted font-fredoka leading-none group-hover/cta:text-purple-600 transition-colors">Sign in to track progress</span>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover/cta:scale-110 transition-transform">
                                        <ChevronRight className="w-5 h-5" />
                                    </div>
                                </Link>
                            </div>
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

            {/* RECENT ACHIEVEMENTS (XP History) */}
            {stats?.xpHistory && stats.xpHistory.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    className="w-full max-w-4xl mt-12"
                >
                    <h3 className="text-xl font-black font-fredoka text-ink-muted mb-6 px-2 flex items-center gap-2">
                        <History className="w-5 h-5 text-purple-500" />
                        Recent Achievements
                    </h3>
                    
                    <div className="grid gap-3">
                        {stats.xpHistory.map((tx) => (
                            <div key={tx.id} className="clay-card p-4 bg-white border border-slate-100 flex items-center justify-between group hover:border-purple-200 transition-all active:scale-[0.99]">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    {tx.book_cover_path ? (
                                        <div className="w-10 h-12 shrink-0 relative rounded-lg overflow-hidden shadow-sm border border-slate-50">
                                            <CachedImage 
                                                src={tx.book_cover_path}
                                                alt={tx.book_title || 'Book cover'}
                                                fill
                                                className="object-cover"
                                                bucket="book-assets"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 group-hover:bg-purple-100 transition-colors shadow-inner-sm">
                                            <Star className="w-5 h-5 fill-current" />
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <div className="font-fredoka font-black text-ink leading-tight line-clamp-1">
                                            {tx.reason === 'book.completed' ? `Finished "${tx.book_title || 'a book'}"` : 
                                             tx.reason === 'book.opened' ? `Started Reading "${tx.book_title || 'a book'}"` : 
                                             tx.reason}
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                            {new Date(tx.created_at).toLocaleDateString(undefined, { 
                                                month: 'short', 
                                                day: 'numeric', 
                                                hour: '2-digit', 
                                                minute: '2-digit' 
                                            })}
                                        </div>
                                    </div>
                                </div>
                                <div className="px-3 py-1.5 rounded-full bg-amber-400 text-white font-fredoka font-black text-[10px] sm:text-xs shadow-clay-orange border-2 border-white transform rotate-2 whitespace-nowrap">
                                    +{tx.amount} Coins
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* RECOMMENDED FOR YOU (If more than 1) */}
            {stats?.recommendations && stats.recommendations.length > 1 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="w-full max-w-4xl mt-12"
                >
                    <div className="flex items-center justify-between mb-6 px-2">
                        <h3 className="text-xl font-black font-fredoka text-ink-muted">
                            More for {childName}
                        </h3>
                        <Link href="/library" className="text-sm font-bold text-purple-600 hover:text-purple-700 transition-colors flex items-center gap-1">
                            Go to Library <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {stats.recommendations.slice(1, 4).map((book, idx) => (
                            <Link key={book.id} href={`/reader/${book.id}`} className="group relative block">
                                <div className="clay-card p-4 bg-white border-2 border-slate-50 hover:border-purple-200 transition-all flex gap-4 overflow-hidden">
                                     <div className="w-20 shrink-0 aspect-[3/4] relative rounded-lg overflow-hidden shadow-md group-hover:scale-105 transition-transform duration-500">
                                        <CachedImage
                                            src={book.coverImageUrl || ""}
                                            storagePath={book.coverPath}
                                            alt={book.title}
                                            fill
                                            className="object-cover"
                                            bucket="book-assets"
                                        />
                                    </div>
                                    <div className="flex-1 flex flex-col justify-center min-w-0">
                                        <h4 className="font-fredoka text-lg font-black text-ink line-clamp-1 group-hover:text-purple-600 transition-colors">
                                            {book.title}
                                        </h4>
                                        <p className="text-xs text-ink-muted font-bold mt-1 line-clamp-2">
                                            {book.description || `Read "${book.title}" to learn more!`}
                                        </p>
                                        <div className="flex items-center gap-3 mt-2">
                                            <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest px-2 py-0.5 bg-purple-50 rounded-md border border-purple-100">
                                                {book.level}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{book.estimatedReadingTime} min</span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </motion.div>
            )}

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
                        {stats?.badges?.filter(b => b.is_earned)?.length || 0} Unlocked
                    </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                    {stats?.badges && stats.badges.length > 0 && stats.badges.map((badge) => (
                        <motion.div
                            key={badge.id}
                            whileHover={{ scale: 1.05 }}
                            className={`flex-shrink-0 clay-card border-2 p-4 flex flex-col items-center justify-center text-center group cursor-help relative min-h-[160px] ${
                                badge.is_earned ? 'bg-white border-purple-100' : 'bg-slate-50/50 border-slate-100 opacity-60 grayscale-[0.5]'
                            }`}
                        >
                            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-3 relative
                                ${badge.rarity === 'legendary' ? 'bg-amber-100 text-amber-600 shadow-amber-200' : 
                                  badge.rarity === 'epic' ? 'bg-purple-100 text-purple-600 shadow-purple-200' : 
                                  badge.rarity === 'rare' ? 'bg-blue-100 text-blue-600 shadow-blue-200' : 
                                  'bg-slate-100 text-slate-600 shadow-slate-200'}`}
                            >
                                {badge.icon_path ? (
                                    <div className="w-full h-full relative p-2">
                                        <CachedImage 
                                            src={badge.icon_path}
                                            alt={badge.name}
                                            fill
                                            className="object-contain"
                                        />
                                    </div>
                                ) : (
                                    <Star className={`w-10 h-10 ${badge.rarity !== 'basic' ? 'fill-current' : ''}`} />
                                )}

                                {!badge.is_earned && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/10 rounded-2xl backdrop-blur-[1px]">
                                        <Clock className="w-6 h-6 text-slate-400" />
                                    </div>
                                )}
                            </div>
                            <div className="text-xs font-black text-ink font-fredoka leading-tight line-clamp-2">{badge.name}</div>
                            
                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-56 p-4 bg-ink text-white text-[10px] rounded-2xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 shadow-2xl scale-95 group-hover:scale-100">
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                        badge.rarity === 'legendary' ? 'bg-amber-500' : 
                                        badge.rarity === 'epic' ? 'bg-purple-500' : 
                                        badge.rarity === 'rare' ? 'bg-blue-500' : 
                                        'bg-slate-600'
                                    }`}>
                                        {badge.rarity}
                                    </span>
                                    {badge.is_earned && <span className="text-green-400 font-bold">UNLOCKED</span>}
                                </div>
                                <div className="font-bold text-xs mb-1 text-white">{badge.name}</div>
                                <p className="text-white/70 font-medium mb-3 leading-relaxed">
                                    {badge.description}
                                </p>
                                <div className="pt-2 border-t border-white/10">
                                    <div className="text-[8px] font-black text-white/40 uppercase mb-1">How to unlock</div>
                                    <div className="text-amber-300 font-bold">{badge.criteria}</div>
                                </div>
                                {badge.is_earned && badge.earned_at && (
                                    <div className="mt-2 pt-2 border-t border-white/10 text-white/40">
                                        Earned: {new Date(badge.earned_at).toLocaleDateString()}
                                    </div>
                                )}
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-ink"></div>
                            </div>
                        </motion.div>
                    ))}
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
                         router.refresh();
                    }} 
                />
            )}
        </main>
    );
}
