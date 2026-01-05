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
        href: "/library", // Corrected to /library
        label: "Book Library",
        icon: BookOpen,
        color: "text-blue-500",
        shadow: "shadow-clay-purple", // Purple theme for library
        bg: "bg-blue-50 dark:bg-blue-900/20",
        activeBg: "bg-blue-100 dark:bg-blue-800/40",
    },
    {
        href: "/story-maker",
        label: "Story Maker",
        icon: Wand2,
        color: "text-purple-500",
        shadow: "shadow-clay-purple",
        bg: "bg-purple-50 dark:bg-purple-900/20",
        activeBg: "bg-purple-100 dark:bg-purple-800/40",
    },
    {
        href: "/my-words",
        label: "Word List",
        icon: Languages,
        color: "text-orange-500",
        shadow: "shadow-clay-orange",
        bg: "bg-orange-50 dark:bg-orange-900/20",
        activeBg: "bg-orange-100 dark:bg-orange-800/40",
    },
];

export function ClayNav() {
    const pathname = usePathname();
    const router = useRouter();
    const [isHubOpen, setIsHubOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const supabase = createClient();

    const isReaderView = pathname.startsWith("/reader");
    const isImmersionMode = isReaderView;

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

    const isActive = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href));

    // Magic Bead Logic for Reader View
    const showAsBead = isImmersionMode && !isExpanded;

    return (
        <>
            {/* Desktop Navigation Link/Rail */}
            <motion.nav
                layout
                className={cn(
                    "fixed left-6 z-50 hidden lg:flex flex-col items-center gap-6 transition-all duration-500 origin-left ease-out top-1/2 -translate-y-1/2",
                    showAsBead
                        ? "w-16 h-16 py-0 px-0 rounded-full bg-white/5 backdrop-blur-md shadow-none ring-1 ring-white/10 border-white/20 opacity-60 hover:opacity-100 scale-75 cursor-pointer"
                        : "w-24 min-h-[400px] py-8 px-4 clay-card glass-shine shadow-clay-purple/20"
                )}
                onClick={() => isImmersionMode && setIsExpanded(!isExpanded)}
            >
                {showAsBead ? (
                    <motion.div
                        initial={{ rotate: 0 }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="flex items-center justify-center w-full h-full"
                    >
                        <Sparkles className="w-8 h-8 text-purple-400 opacity-60" />
                    </motion.div>
                ) : (
                    <>
                        {/* Close button for immersion mode hub */}
                        {isImmersionMode && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsExpanded(false);
                                }}
                                className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-white shadow-clay border-2 border-purple-100 flex items-center justify-center text-purple-400 hover:text-purple-600 transition-colors animate-squish z-10"
                            >
                                <Sparkles className="w-5 h-5 rotate-180" />
                            </button>
                        )}

                        {/* User Profile - Large Squircle */}
                        <div className="mb-4">
                            <motion.button
                                whileHover={{ scale: 1.15, rotate: -5 }}
                                whileTap={{ scale: 0.85, rotate: 5 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsHubOpen(true);
                                }}
                                className="w-16 h-16 squircle bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-clay-orange border-4 border-white/60 text-white group relative overflow-hidden active:shadow-inner"
                            >
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
                                ) : user ? (
                                    <span className="text-2xl font-fredoka font-black drop-shadow-md">{userInitial}</span>
                                ) : (
                                    <User className="w-8 h-8 drop-shadow-md" />
                                )}
                                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </motion.button>
                        </div>

                        {/* Nav Items - Larger, Bouncier */}
                        <div className="flex flex-col gap-8">
                            {navItems.map((item) => {
                                const active = isActive(item.href);
                                const Icon = item.icon;

                                return (
                                    <Link key={item.href} href={item.href} onClick={(e) => e.stopPropagation()}>
                                        <motion.div
                                            whileHover={{ scale: 1.25, rotate: -3 }}
                                            whileTap={{ scale: 0.8, y: 2 }}
                                            className={cn(
                                                "w-16 h-16 squircle flex items-center justify-center transition-all duration-300 group relative clay-nav-item",
                                                active
                                                    ? "bg-white shadow-clay-purple text-purple-600 ring-4 ring-purple-100"
                                                    : "bg-slate-50/50 text-slate-400 hover:bg-white hover:text-slate-600 shadow-sm"
                                            )}
                                        >
                                            <Icon className={cn("w-7 h-7", active ? "drop-shadow-md animate-bounce-subtle" : "opacity-80")} />

                                            {/* Playful Tooltip */}
                                            <span className="absolute left-24 px-5 py-3 bg-white rounded-2xl text-sm font-fredoka font-black text-ink border-2 border-purple-50 opacity-0 group-hover:opacity-100 translate-x-[-15px] group-hover:translate-x-0 transition-all pointer-events-none shadow-clay-purple whitespace-nowrap z-[100]">
                                                {item.label}
                                                <div className="absolute left-[-6px] top-1/2 -translate-y-1/2 w-4 h-4 bg-white rotate-45 border-l-2 border-b-2 border-purple-50" />
                                            </span>
                                        </motion.div>
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Footer Settings */}
                        <div className="mt-8 pt-8 border-t-4 border-purple-50">
                            <motion.button
                                whileHover={{ rotate: 90, scale: 1.25 }}
                                whileTap={{ scale: 0.75 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsHubOpen(true);
                                }}
                                className="w-14 h-14 squircle bg-slate-100 text-slate-400 hover:text-purple-500 hover:bg-white flex items-center justify-center group relative shadow-sm hover:shadow-clay-purple transition-all"
                            >
                                <Settings2 className="w-7 h-7" />
                                <span className="absolute left-24 px-4 py-2 bg-white rounded-xl text-xs font-fredoka font-black text-ink border-2 border-purple-50 opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all pointer-events-none shadow-clay whitespace-nowrap">
                                    Adventure Stats
                                </span>
                            </motion.button>
                        </div>
                    </>
                )}
            </motion.nav>

            {/* Mobile Bottom Navigation - Also adheres to "Magic Bead" logic */}
            <AnimatePresence mode="wait">
                {(!isImmersionMode || isExpanded) ? (
                    <motion.nav
                        key="nav-full"
                        initial={{ y: 100, opacity: 0, scale: 0.95 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 100, opacity: 0, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className={cn(
                            "fixed z-50 lg:hidden w-[calc(100%-3rem)] max-w-sm flex items-center justify-between p-2 rounded-[3rem] bg-white/30 backdrop-blur-3xl border-2 border-white/40 shadow-clay-purple pointer-events-auto overflow-hidden transition-all duration-500",
                            (isImmersionMode && isExpanded)
                                ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-110"
                                : "bottom-6 left-1/2 -translate-x-1/2"
                        )}
                    >
                        {/* Collapse button for mobile */}
                        {isImmersionMode && (
                            <button
                                onClick={() => setIsExpanded(false)}
                                className="absolute top-0 right-0 w-8 h-full bg-white/10 flex items-center justify-center text-purple-400 hover:text-purple-600 transition-colors"
                            >
                                <Sparkles className="w-4 h-4 rotate-180" />
                            </button>
                        )}

                        <div className={cn("flex items-center justify-between w-full", isImmersionMode && "pr-6")}>
                            {navItems.map((item) => {
                                const active = isActive(item.href);
                                const Icon = item.icon;

                                return (
                                    <Link key={item.href} href={item.href} className="flex-1" onClick={() => isImmersionMode && setIsExpanded(false)}>
                                        <motion.div
                                            whileTap={{ scale: 0.8, y: -5 }}
                                            className={cn(
                                                "flex flex-col items-center justify-center h-14 rounded-[2rem] transition-all duration-300 mx-1",
                                                active
                                                    ? "bg-white/60 text-purple-600 shadow-sm border-2 border-white/80"
                                                    : "text-slate-500 hover:text-slate-700"
                                            )}
                                        >
                                            <Icon className={cn("w-5 h-5", active ? "mb-0.5" : "mb-1")} />
                                            <span className="text-[9px] font-fredoka font-black uppercase tracking-wider leading-none">
                                                {item.label.split(' ')[0]}
                                            </span>
                                        </motion.div>
                                    </Link>
                                );
                            })}

                            <motion.button
                                whileTap={{ scale: 0.8 }}
                                onClick={() => {
                                    setIsHubOpen(true);
                                    if (isImmersionMode) setIsExpanded(false);
                                }}
                                className="flex flex-col items-center justify-center w-14 h-14 rounded-full text-orange-500 overflow-hidden bg-white/40 border-2 border-white active:bg-orange-100/50 ml-1"
                            >
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt={fullName} className="w-8 h-8 rounded-full border-2 border-orange-200 object-cover" />
                                ) : user ? (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400/80 to-orange-500/80 flex items-center justify-center shadow-clay-orange ring-1 ring-white">
                                        <span className="text-[10px] font-fredoka font-black text-white">{userInitial}</span>
                                    </div>
                                ) : (
                                    <User className="w-5 h-5" />
                                )}
                                <span className="text-[8px] font-fredoka font-black uppercase tracking-wider mt-0.5">Hero</span>
                            </motion.button>
                        </div>
                    </motion.nav>
                ) : (
                    <motion.button
                        key="nav-bead"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.85 }}
                        onClick={() => setIsExpanded(true)}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 lg:hidden flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-xl shadow-clay-purple border-2 border-white/30 opacity-60 animate-bounce-subtle"
                    >
                        <Sparkles className="h-6 w-6 text-purple-400 opacity-60" />
                    </motion.button>
                )}
            </AnimatePresence>

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
                            initial={{ scale: 0.8, opacity: 0, y: 50, rotate: -5 }}
                            animate={{ scale: 1, opacity: 1, y: 0, rotate: 0 }}
                            exit={{ scale: 0.8, opacity: 0, y: 50, rotate: 5 }}
                            transition={{ type: "spring", damping: 15, stiffness: 250 }}
                            className="relative w-full max-w-sm clay-card p-10 text-center bg-white border-8 border-white shadow-2xl overflow-hidden"
                        >
                            {/* Decorative Blobs */}
                            <div className="absolute top-[-50px] left-[-50px] w-32 h-32 bg-purple-100 rounded-full blur-3xl opacity-60" />
                            <div className="absolute bottom-[-50px] right-[-50px] w-32 h-32 bg-orange-100 rounded-full blur-3xl opacity-60" />

                            <div className="relative w-32 h-32 mx-auto mb-10">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-[-15%] rounded-[3rem] bg-gradient-to-br from-orange-300 via-yellow-400 to-purple-400 opacity-20 blur-2xl"
                                />
                                <div className="relative w-full h-full squircle bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-clay-orange border-4 border-white overflow-hidden">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
                                    ) : user ? (
                                        <span className="text-6xl font-fredoka font-black text-white drop-shadow-2xl">{userInitial}</span>
                                    ) : (
                                        <User className="w-16 h-16 text-white" />
                                    )}
                                </div>
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="absolute -bottom-2 -right-2 w-12 h-12 rounded-full bg-yellow-400 border-4 border-white flex items-center justify-center shadow-clay-amber"
                                >
                                    <Sparkles className="w-6 h-6 text-white" />
                                </motion.div>
                            </div>

                            <h2 className="text-4xl font-fredoka font-black text-ink mb-3 leading-tight tracking-tight">
                                {fullName || (user ? "Magic Voyager" : "The Magic Hub")}
                            </h2>

                            {user ? (
                                <div className="flex flex-col items-center gap-4 mb-10">
                                    <div className="flex items-center gap-2 px-6 py-3 bg-orange-50 rounded-2xl border-2 border-orange-100 shadow-sm">
                                        <Mail className="w-5 h-5 text-orange-500" />
                                        <span className="text-base font-nunito font-black text-orange-700">{user.email}</span>
                                    </div>
                                    <p className="text-slate-500 font-nunito font-bold text-lg mt-2 italic px-4">“Adventure is out there, just one page away!”</p>
                                </div>
                            ) : (
                                <p className="text-slate-500 mb-10 italic font-nunito font-bold text-lg">Your hero's journey begins with a single word...</p>
                            )}

                            <div className="space-y-4">
                                {user && (
                                    <button
                                        onClick={handleLogout}
                                        className="w-full py-5 px-6 rounded-2xl bg-rose-50 text-rose-600 font-fredoka font-black flex items-center justify-center gap-3 hover:bg-rose-100 transition-all active:scale-90 group border-2 border-rose-100 shadow-clay group"
                                    >
                                        <LogOut className="w-6 h-6 group-hover:-translate-x-2 transition-transform" />
                                        Sign Out Explorer
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsHubOpen(false)}
                                    className="w-full py-5 font-fredoka text-xl rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-clay-purple hover:from-purple-700 hover:to-indigo-700 transition-all active:scale-95 animate-squish"
                                >
                                    {user ? "Back to Adventure" : "Open Portal"}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}

