"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, Wand2, Languages, User, LogOut, Mail, Sparkles } from "lucide-react";
import { cn } from "@/lib/core/utils/cn";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import type { User as SupabaseUser } from "@supabase/supabase-js";

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
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const supabase = createClient();

    const isReaderView = pathname.startsWith("/reader");
    const isLibraryView = pathname.startsWith("/library");
    const isImmersionMode = isReaderView || isLibraryView;

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

    // Hide nav on landing, dashboard, and login - these pages have their own layouts
    if (pathname === "/" || pathname === "/login" || pathname === "/dashboard") return null;

    const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name || "";
    const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || "";
    const userInitial = fullName ? fullName[0].toUpperCase() : (user?.email?.[0]?.toUpperCase() ?? "?");

    const isActive = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href));

    // Immersion mode logic for Reader View
    const isImmersive = isImmersionMode && !isExpanded;

    return (
        <>
            {/* Bottom Navigation - Unified for all screen sizes */}
            <AnimatePresence>
                {(!isImmersionMode || isExpanded) ? (
                    <motion.nav
                        key="nav-full"
                        initial={{ y: 100, opacity: 0, scale: 0.95 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 100, opacity: 0, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        className={cn(
                            "fixed z-50 w-[calc(100%-3rem)] max-w-md flex items-center justify-between p-2 rounded-[3rem] bg-white/30 backdrop-blur-3xl border-2 border-white/40 shadow-clay-purple pointer-events-auto overflow-hidden bottom-6 left-0 right-0 mx-auto transition-all duration-300",
                            (isImmersionMode && isExpanded) && "bottom-8 scale-105 sm:scale-110"
                        )}
                    >
                        {/* Collapse button for mobile */}
                        {isImmersionMode && (
                            <Link href="/" className="flex items-center gap-3 group relative z-50">
            <span className="relative w-10 h-10 group-hover:scale-110 transition-transform duration-300">
              <img src="/logo.png" alt="LumoMind Logo" className="w-full h-full object-contain drop-shadow-md" />
            </span>
            <span className="font-fredoka font-black text-2xl text-ink tracking-tight group-hover:text-purple-600 transition-colors">
              LumoMind
            </span>
          </Link>              )}

                        <div className={cn("flex items-center justify-between w-full", isImmersionMode && "pr-10")}>
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
                                aria-label="Open Adventure Hub"
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
                        className="fixed bottom-6 left-0 right-0 mx-auto z-50 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 shadow-clay-purple border-2 border-white/50 animate-bounce-subtle"
                        aria-label="Expand Navigation"
                    >
                        <Sparkles className="h-8 w-8 text-white drop-shadow-md" />
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

