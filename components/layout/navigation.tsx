"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, BookOpen, Wand2, Languages, Settings2, User, LogOut, Mail, Sparkles } from "lucide-react";
import { cn } from "@/lib/core/utils/cn";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
    {
        href: "/",
        label: "Home",
        icon: Home,
        color: "from-emerald-400 to-teal-500",
        shadow: "shadow-emerald-200/50",
        bg: "bg-emerald-50 dark:bg-emerald-900/10",
        activeBg: "bg-gradient-to-br from-emerald-400 to-teal-600",
    },
    {
        href: "/reader",
        label: "Library",
        icon: BookOpen,
        color: "from-blue-400 to-indigo-500",
        shadow: "shadow-blue-200/50",
        bg: "bg-blue-50 dark:bg-blue-900/10",
        activeBg: "bg-gradient-to-br from-blue-400 to-indigo-600",
    },
    {
        href: "/story-maker",
        label: "Maker",
        icon: Wand2,
        color: "from-purple-400 to-pink-500",
        shadow: "shadow-purple-200/50",
        bg: "bg-purple-50 dark:bg-purple-900/10",
        activeBg: "bg-gradient-to-br from-purple-400 to-pink-600",
    },
    {
        href: "/my-words",
        label: "Words",
        icon: Languages,
        color: "from-orange-400 to-yellow-500",
        shadow: "shadow-orange-200/50",
        bg: "bg-orange-50 dark:bg-orange-900/10",
        activeBg: "bg-gradient-to-br from-orange-400 to-amber-600",
    },
];

export function Navigation() {
    const pathname = usePathname();
    const router = useRouter();
    const [isHubOpen, setIsHubOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const supabase = createClient();

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        fetchUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, [supabase.auth]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setIsHubOpen(false);
        router.push("/login");
    };

    if (pathname === "/login") return null;

    const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name || "";
    const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || "";
    const userInitial = fullName ? fullName[0].toUpperCase() : (user?.email?.[0]?.toUpperCase() ?? "?");

    return (
        <>
            {/* Sidebar - Desktop/Tablet */}
            <nav className="fixed left-6 top-1/2 -translate-y-1/2 z-50 hidden md:flex flex-col items-center gap-6 py-10 px-5 clay-card animate-in slide-in-from-left duration-700 pointer-events-auto">
                {/* Explorer Badge (Profile) */}
                <div className="mb-8">
                    <motion.button
                        whileHover={{ scale: 1.1, rotate: -5 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setIsHubOpen(true)}
                        className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-orange-300 via-orange-400 to-orange-600 flex items-center justify-center shadow-[0_10px_20px_rgba(249,115,22,0.3),inset_0_-4px_8px_rgba(0,0,0,0.1)] border-2 border-white/50 text-white group relative overflow-hidden"
                    >
                        {avatarUrl ? (
                            <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
                        ) : user ? (
                            <span className="text-2xl font-fredoka font-black drop-shadow-md">{userInitial}</span>
                        ) : (
                            <User className="w-8 h-8 drop-shadow-md" />
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.button>
                </div>

                <div className="flex flex-col gap-5">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                        const Icon = item.icon;

                        return (
                            <Link key={item.href} href={item.href}>
                                <motion.div
                                    whileHover={{ scale: 1.15, x: 5 }}
                                    whileTap={{ scale: 0.9 }}
                                    className={cn(
                                        "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 group relative",
                                        isActive
                                            ? cn(item.activeBg, "text-white shadow-xl", item.shadow, "border-2 border-white/30")
                                            : cn(item.bg, "text-slate-400 dark:text-slate-500 hover:text-ink dark:hover:text-slate-200")
                                    )}
                                >
                                    <Icon className={cn("w-6 h-6", isActive ? "animate-bounce-subtle drop-shadow-sm" : "opacity-80")} />

                                    {/* Tooltip */}
                                    <span className={cn(
                                        "absolute left-20 px-4 py-2 bg-white dark:bg-[#1c1f2f] rounded-xl text-xs font-fredoka font-black border-2 border-purple-50 dark:border-white/5 opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0 whitespace-nowrap shadow-[0_10px_30px_rgba(0,0,0,0.1)] pointer-events-none",
                                        isActive ? "text-ink border-purple-100" : "text-slate-400"
                                    )}>
                                        {item.label}
                                    </span>
                                </motion.div>
                            </Link>
                        );
                    })}
                </div>

                <div className="mt-8 border-t-2 border-purple-50 dark:border-white/5 pt-8">
                    <motion.button
                        whileHover={{ rotate: 15, scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setIsHubOpen(true)}
                        className="w-14 h-14 rounded-2xl text-slate-300 hover:text-accent flex items-center justify-center group relative"
                    >
                        <Settings2 className="w-6 h-6" />
                        <span className="absolute left-20 px-4 py-2 bg-white dark:bg-[#1c1f2f] rounded-xl text-xs font-fredoka font-black text-slate-400 border-2 border-purple-50 dark:border-white/5 opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0 whitespace-nowrap shadow-xl pointer-events-none">
                            Settings
                        </span>
                    </motion.button>
                </div>
            </nav>

            {/* Bottom Bar - Mobile */}
            <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 md:hidden w-[calc(100%-2.5rem)] max-w-sm flex items-center justify-between p-2 rounded-[2.5rem] bg-white/90 dark:bg-[#1c1f2f]/95 backdrop-blur-2xl border-2 border-white shadow-[0_20px_50px_rgba(139,75,255,0.25)] animate-in slide-in-from-bottom duration-700">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                    const Icon = item.icon;

                    return (
                        <Link key={item.href} href={item.href} className="flex-1">
                            <motion.div
                                whileTap={{ scale: 0.8 }}
                                className={cn(
                                    "flex flex-col items-center justify-center h-14 rounded-[1.8rem] transition-all duration-300",
                                    isActive
                                        ? cn(item.activeBg, "text-white shadow-lg mx-1 scale-105 border-2 border-white/20")
                                        : "text-slate-400 dark:text-slate-500"
                                )}
                            >
                                <Icon className={cn("w-5 h-5", isActive ? "mb-0.5" : "mb-1")} />
                                <span className="text-[10px] font-fredoka font-black uppercase tracking-tight leading-none">
                                    {item.label}
                                </span>
                            </motion.div>
                        </Link>
                    );
                })}

                <motion.button
                    whileTap={{ scale: 0.8 }}
                    onClick={() => setIsHubOpen(true)}
                    className="flex flex-col items-center justify-center w-14 h-14 rounded-full text-orange-500 overflow-hidden"
                >
                    {avatarUrl ? (
                        <img src={avatarUrl} alt={fullName} className="w-7 h-7 rounded-full border-2 border-orange-200 object-cover" />
                    ) : user ? (
                        <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center">
                            <span className="text-xs font-fredoka font-black">{userInitial}</span>
                        </div>
                    ) : (
                        <User className="w-5 h-5" />
                    )}
                    <span className="text-[10px] font-fredoka font-black uppercase tracking-tight mt-0.5">Hub</span>
                </motion.button>
            </nav>

            {/* Adventure Hub Modal */}
            <AnimatePresence>
                {isHubOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-purple-900/40 backdrop-blur-md"
                            onClick={() => setIsHubOpen(false)}
                        />

                        <motion.div
                            initial={{ scale: 0.8, opacity: 0, y: 50 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.8, opacity: 0, y: 50 }}
                            transition={{ type: "spring", damping: 20, stiffness: 300 }}
                            className="relative w-full max-w-sm clay-card p-10 text-center bg-white border-4 border-white shadow-2xl"
                        >
                            <div className="relative w-28 h-28 mx-auto mb-8">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-orange-300 via-yellow-400 to-orange-600 opacity-20 blur-xl"
                                />
                                <div className="relative w-full h-full rounded-[2.2rem] bg-gradient-to-br from-orange-300 via-orange-400 to-orange-600 flex items-center justify-center shadow-2xl border-4 border-white overflow-hidden">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
                                    ) : user ? (
                                        <span className="text-5xl font-fredoka font-black text-white drop-shadow-xl">{userInitial}</span>
                                    ) : (
                                        <User className="w-14 h-14 text-white" />
                                    )}
                                </div>
                                <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-yellow-400 border-4 border-white flex items-center justify-center shadow-lg">
                                    <Sparkles className="w-5 h-5 text-white animate-pulse" />
                                </div>
                            </div>

                            <h2 className="text-3xl font-fredoka font-black text-ink dark:text-white mb-2 leading-tight">
                                {fullName || (user ? "Magic Voyager" : "The Magic Hub")}
                            </h2>

                            {user ? (
                                <div className="flex flex-col items-center gap-3 mb-10">
                                    <div className="flex items-center gap-2 px-5 py-2.5 bg-orange-50 dark:bg-orange-500/10 rounded-full border-2 border-orange-100 dark:border-orange-500/20 shadow-sm">
                                        <Mail className="w-4 h-4 text-orange-500" />
                                        <span className="text-sm font-nunito font-black text-orange-700 dark:text-orange-400">{user.email}</span>
                                    </div>
                                    <p className="text-slate-500 font-nunito font-bold text-sm mt-2 italic">“Every bookmark is a captured dream.”</p>
                                </div>
                            ) : (
                                <p className="text-slate-500 mb-10 italic font-nunito font-bold">Your adventure is waiting to be written...</p>
                            )}

                            <div className="space-y-4">
                                {user && (
                                    <button
                                        onClick={handleLogout}
                                        className="w-full py-4 px-6 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-fredoka font-black flex items-center justify-center gap-3 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all active:scale-95 group border-2 border-rose-100/50"
                                    >
                                        <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                                        Sign Out Explorer
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsHubOpen(false)}
                                    className="w-full next-step-btn py-4 font-fredoka rounded-2xl"
                                >
                                    {user ? "Back to Adventure" : "Close Portal"}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
