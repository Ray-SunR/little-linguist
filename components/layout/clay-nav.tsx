"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, Wand2, Languages, User, LogOut, Mail, LayoutDashboard, Rocket, Sparkles, Users } from "lucide-react";
import { LumoCharacter } from "@/components/ui/lumo-character";
import { cn } from "@/lib/core/utils/cn";
import { memo, useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useAuth } from "@/components/auth/auth-provider";

import { CachedImage } from "@/components/ui/cached-image";
import { useUsage } from "@/lib/hooks/use-usage";

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

const MemoizedNavItem = memo(function NavItem({
    item,
    isActive,
    onClick
}: {
    item: typeof navItems[0],
    isActive: boolean,
    onClick?: (href: string) => void
}) {
    const Icon = item.icon;

    return (
        <Link
            href={item.href}
            className="flex-1"
            onClick={() => onClick?.(item.href)}
        >
            <motion.div
                whileTap={{ scale: 0.8, y: -5 }}
                className={cn(
                    "flex flex-col items-center justify-center h-14 rounded-[2rem] transition-colors duration-300 mx-1",
                    isActive
                        ? "bg-white/60 text-purple-600 shadow-sm border-2 border-white/80"
                        : "text-slate-500 hover:text-slate-700"
                )}
            >
                <Icon className={cn("w-5 h-5", isActive ? "mb-0.5" : "mb-1")} />
                <span className="text-[9px] font-fredoka font-black uppercase tracking-wider leading-none">
                    {item.label.split(' ')[0]}
                </span>
            </motion.div>
        </Link>
    );
});

export function ClayNav() {
    const pathname = usePathname();
    const router = useRouter();
    const prefersReducedMotion = useReducedMotion();
    const { user, isStoryGenerating, activeChild } = useAuth();
    const [isHubOpen, setIsHubOpen] = useState(false);
    const [pendingHref, setPendingHref] = useState<string | null>(null);
    const { usage, plan, loading } = useUsage(["story_generation", "word_insight", "image_generation"]);
    const isReaderView = pathname.startsWith("/reader");
    const isLibraryView = pathname.startsWith("/library");
    const [isExpanded, setIsExpanded] = useState(true);

    // Prefetch main destinations to reduce perceived nav latency
    useEffect(() => {
        navItems.forEach(item => router.prefetch(item.href));
        router.prefetch("/profiles");
    }, [router]);

    // Auto-fold in reader view, auto-expand on all main navigation pages
    useEffect(() => {
        if (isReaderView) {
            setIsExpanded(false);
        } else {
            // Auto-expand when returning from reader or moving between main views
            setIsExpanded(true);
        }
    }, [pathname, isReaderView]);

    // Clear pending state when navigation completes
    useEffect(() => {
        if (pendingHref && pathname.startsWith(pendingHref)) {
            setPendingHref(null);
        }
    }, [pathname, pendingHref]);

    const handleLogout = async () => {
        setIsHubOpen(false);
        try {
            const { createClient } = await import("@/lib/supabase/client");
            const supabase = createClient();
            await supabase.auth.signOut();
        } catch (error) {
            console.error("Sign out failed:", error);
            // Fallback: manually clear local session to ensure user is "logged out" locally
            try {
                // Clear all Raiden/Lumo keys
                if (typeof window !== "undefined") {
                    Object.keys(window.localStorage).forEach(key => {
                        if (key.includes('raiden:') || key.includes('sb-')) {
                            window.localStorage.removeItem(key);
                        }
                    });
                    // Force clear cookies via document (simple attempt)
                    document.cookie.split(";").forEach((c) => {
                        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                    });
                }
            } catch (cleanupErr) {
                console.warn("Manual cleanup failed:", cleanupErr);
            }
        } finally {
            // Always redirect to home, even if Supabase/Cache throws
            router.push("/");
            // Force reload to clear any lingering memory/cache state
            setTimeout(() => window.location.href = "/", 100);
        }
    };

    // Hide nav on landing and login - these pages have their own layouts
    if (pathname === "/" || pathname === "/login") return null;

    const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "";
    const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || "";
    const userInitial = fullName ? fullName[0].toUpperCase() : (user?.email?.[0]?.toUpperCase() ?? "?");

    const isActive = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href));
    const isOnboarding = pathname === "/onboarding";

    // --- ONBOARDING VARIANT ---
    if (isOnboarding) {
        return (
            <div className="fixed bottom-8 left-0 right-0 flex justify-center z-50 pointer-events-none">
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="clay-card py-2.5 px-5 bg-white/40 backdrop-blur-2xl border-2 border-white/60 shadow-xl flex items-center gap-4 pointer-events-auto"
                >
                    <div className="flex items-center gap-3">
                        {user ? (
                            <>
                                {avatarUrl ? (
                                    <CachedImage
                                        src={avatarUrl}
                                        alt={fullName}
                                        width={36}
                                        height={36}
                                        className="rounded-full border-2 border-orange-200 object-cover shadow-sm"
                                    />
                                ) : (
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center border-2 border-white shadow-sm">
                                        <span className="text-sm font-fredoka font-black text-white">{userInitial}</span>
                                    </div>
                                )}
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-fredoka font-black text-ink-muted uppercase tracking-widest leading-none mb-0.5">Signed in as</span>
                                    <span className="text-sm font-black text-ink font-fredoka leading-none">{fullName || user?.email?.split('@')[0]}</span>
                                </div>
                                <div className="w-[1px] h-6 bg-ink/5 mx-1" />
                                <button
                                    onClick={handleLogout}
                                    className="p-2 transition-colors hover:text-rose-500 text-ink-muted/60"
                                    title="Sign Out"
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </>
                        ) : (
                            <Link
                                href="/login"
                                className="px-5 py-2 rounded-xl bg-accent text-white font-fredoka text-sm font-black shadow-clay-accent hover:scale-105 active:scale-95 transition-all"
                            >
                                Login to Save Progress
                            </Link>
                        )}
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <>
            {/* Bottom Navigation - Unified for all screen sizes */}
            <AnimatePresence>
                {isExpanded ? (
                    <motion.nav
                        key="nav-full"
                        initial={prefersReducedMotion ? false : { y: 100, opacity: 0, scale: 0.95 }}
                        animate={prefersReducedMotion ? { opacity: 1, y: 0, scale: 1 } : { y: 0, opacity: 1, scale: 1 }}
                        exit={prefersReducedMotion ? { opacity: 0 } : { y: 100, opacity: 0, scale: 0.95 }}
                        transition={prefersReducedMotion ? { duration: 0.12 } : { type: "spring", stiffness: 400, damping: 30 }}
                        style={{ transform: "translateZ(0)" }}
                        className={cn(
                            "fixed z-50 w-[calc(100%-3rem)] max-w-2xl gap-1 flex items-center justify-between p-2 rounded-[3.5rem] bg-white/70 backdrop-blur-xl border-2 border-white/80 shadow-xl pointer-events-auto bottom-6 left-0 right-0 mx-auto transition-shadow duration-200",
                            isExpanded && "shadow-clay-purple"
                        )}
                    >
                        <button
                            onClick={() => setIsExpanded(false)}
                            className="flex items-center gap-3 group relative z-50 pl-2 shrink-0"
                            title="Fold Navigation"
                        >
                            <span className="relative w-12 h-12 group-hover:scale-110 transition-transform duration-300">
                                <LumoCharacter size="lg" />
                            </span>
                        </button>

                        <div className={cn("flex items-center justify-between w-full relative")}>


                            {/* Me Button (Replaces Dashboard) */}
                            <Link
                                href="/profiles"
                                className="flex-1"
                                onClick={() => setPendingHref("/profiles")}
                            >
                                <motion.div
                                    whileTap={{ scale: 0.8, y: -5 }}
                                    className={cn(
                                        "flex flex-col items-center justify-center h-14 rounded-[2rem] transition-colors duration-300 mx-1",
                                        isActive("/profiles")
                                            ? "bg-white/60 text-purple-600 shadow-sm border-2 border-white/80"
                                            : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    {activeChild?.avatar_asset_path ? (
                                        <div className={cn("relative w-6 h-6 rounded-full overflow-hidden border border-white shadow-sm mb-1", isActive("/profiles") ? "ring-2 ring-purple-100" : "")}>
                                            <CachedImage
                                                src={activeChild.avatar_asset_path}
                                                alt="Me"
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center mb-1 bg-gradient-to-br from-indigo-400 to-purple-500 text-white shadow-sm", isActive("/profiles") ? "ring-2 ring-purple-100" : "")}>
                                            <span className="text-[10px] font-fredoka font-black">
                                                {activeChild?.first_name?.[0] || "M"}
                                            </span>
                                        </div>
                                    )}
                                    <span className="text-[9px] font-fredoka font-black uppercase tracking-wider leading-none">
                                        ME
                                    </span>
                                </motion.div>
                            </Link>

                            {navItems.map((item) => {
                                const activeNow = isActive(item.href) || pendingHref === item.href;
                                return (
                                    <MemoizedNavItem
                                        key={item.href}
                                        item={item}
                                        isActive={activeNow}
                                        onClick={(href) => setPendingHref(href)}
                                    />
                                );
                            })}

                            <div className="flex items-center gap-4 ml-1">
                                {user ? (
                                    <motion.button
                                        whileTap={prefersReducedMotion ? undefined : { scale: 0.8 }}
                                        onClick={() => setIsHubOpen(true)}
                                        className="flex flex-col items-center justify-center w-14 h-14 rounded-full text-orange-500 overflow-hidden bg-white/40 border-2 border-white shadow-sm active:bg-orange-100/50"
                                        aria-label="Open Adventure Hub"
                                    >
                                        <div className="relative">
                                            {avatarUrl ? (
                                                <CachedImage
                                                    src={avatarUrl}
                                                    alt={fullName}
                                                    width={32}
                                                    height={32}
                                                    className="rounded-full border-2 border-orange-200 object-cover"
                                                />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400/80 to-orange-500/80 flex items-center justify-center shadow-clay-orange ring-1 ring-white">
                                                    <span className="text-[10px] font-fredoka font-black text-white">{userInitial}</span>
                                                </div>
                                            )}

                                            {/* Tier Badge Mini */}
                                            {plan && (
                                                <motion.div
                                                    initial={{ scale: 0, rotate: -20 }}
                                                    animate={{ scale: 1, rotate: -12 }}
                                                    className={cn(
                                                        "absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full border-2 border-white shadow-sm flex items-center justify-center z-10",
                                                        plan === 'pro'
                                                            ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white"
                                                            : "bg-slate-500 text-white"
                                                    )}
                                                >
                                                    {plan === 'pro' ? <Sparkles className="w-2.5 h-2.5" /> : <Rocket className="w-2.5 h-2.5" />}
                                                </motion.div>
                                            )}
                                        </div>
                                    </motion.button>
                                ) : (
                                    <Link
                                        href="/login"
                                        className="flex items-center justify-center w-14 h-14 rounded-full bg-accent text-white shadow-clay-accent border-2 border-white/50 hover:scale-105 active:scale-95 transition-all"
                                        aria-label="Login"
                                    >
                                        <User className="w-6 h-6" />
                                    </Link>
                                )}
                            </div>
                        </div>
                    </motion.nav>
                ) : (
                    <motion.div
                        key="nav-collapsed"
                        initial={prefersReducedMotion ? false : { scale: 0, opacity: 0 }}
                        animate={prefersReducedMotion ? { scale: 1, opacity: 1 } : { scale: 1, opacity: 1 }}
                        exit={prefersReducedMotion ? { opacity: 0 } : { scale: 0, opacity: 0 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
                    >
                        <button
                            onClick={() => setIsExpanded(true)}
                            className="group relative flex items-center justify-center w-16 h-16 rounded-full bg-white/80 backdrop-blur-lg shadow-xl border-4 border-white hover:scale-105 active:scale-95 transition-all duration-300"
                        >
                            <LumoCharacter size="md" />
                            <div className="absolute -top-1 -right-1 bg-accent text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Rocket className="w-3 h-3" />
                            </div>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hub Modal */}
            <AnimatePresence>
                {isHubOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div
                            initial={prefersReducedMotion ? false : { opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-purple-900/40 backdrop-blur-md"
                            onClick={() => setIsHubOpen(false)}
                        />

                        <motion.div
                            initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0.95, opacity: 0, y: 10 }}
                            animate={prefersReducedMotion ? { opacity: 1 } : { scale: 1, opacity: 1, y: 0 }}
                            exit={prefersReducedMotion ? { opacity: 0 } : { scale: 0.95, opacity: 0, y: 10 }}
                            transition={prefersReducedMotion ? { duration: 0.1 } : { duration: 0.2 }}
                            className="relative w-full max-w-sm clay-card p-10 text-center bg-white border-8 border-white shadow-2xl overflow-hidden"
                        >
                            {/* Decorative Blobs */}
                            <div className="absolute top-[-50px] left-[-50px] w-32 h-32 bg-purple-100 rounded-full blur-3xl opacity-60" />
                            <div className="absolute bottom-[-50px] right-[-50px] w-32 h-32 bg-orange-100 rounded-full blur-3xl opacity-60" />

                            <div className="relative">
                                {user ? (
                                    <div className="flex flex-col items-center">
                                        {/* Avatar & Tier Badge Cluster */}
                                        <div className="relative mb-6">
                                            <div className="w-32 h-32 rounded-[2rem] border-4 border-white shadow-clay-white overflow-hidden bg-slate-100 rotate-3 transition-transform duration-500">
                                                {user.user_metadata?.avatar_url ? (
                                                    <img
                                                        src={user.user_metadata.avatar_url}
                                                        alt="Profile"
                                                        className="w-full h-full object-cover scale-110"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-indigo-500 text-white">
                                                        <User className="w-12 h-12" />
                                                    </div>
                                                )}
                                            </div>
                                            {/* Floating Tier Badge */}
                                            <motion.div
                                                initial={{ scale: 0, rotate: -20 }}
                                                animate={{ scale: 1, rotate: -12 }}
                                                className={cn(
                                                    "absolute -bottom-2 -right-4 px-4 py-1.5 rounded-2xl border-4 border-white shadow-lg font-fredoka font-black text-xs uppercase tracking-wider flex items-center gap-1.5 z-10",
                                                    plan === 'pro'
                                                        ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white"
                                                        : "bg-slate-500 text-white"
                                                )}
                                            >
                                                {plan === 'pro' ? <Sparkles className="w-3.5 h-3.5" /> : <Rocket className="w-3.5 h-3.5" />}
                                                {plan === 'pro' ? 'Pro' : 'Free'}
                                            </motion.div>
                                        </div>

                                        <div className="text-center mb-6">
                                            <h2 className="text-4xl font-fredoka font-black text-ink mb-1 leading-tight tracking-tight">
                                                {fullName || "Magic Voyager"}
                                            </h2>
                                            <div className="flex items-center justify-center gap-2 text-slate-400 font-nunito font-bold text-sm">
                                                <Mail className="w-4 h-4" />
                                                <span>{user.email}</span>
                                            </div>
                                        </div>

                                        {/* Usage Stats - Horizontal Grid */}
                                        {!loading && (
                                            <div className="w-full bg-slate-50/50 rounded-[2.5rem] p-6 border-2 border-white shadow-inner-sm mb-8">
                                                <div className="flex items-center justify-between mb-4 px-2">
                                                    <span className="text-[10px] font-black font-fredoka uppercase tracking-[0.2em] text-slate-400">
                                                        Daily Energy
                                                    </span>
                                                    {plan !== 'pro' && (
                                                        <Link href="/pricing" onClick={() => setIsHubOpen(false)} className="text-[10px] font-black font-fredoka uppercase text-purple-600 hover:text-purple-700 underline decoration-2 underline-offset-4 tracking-wider">
                                                            Get Unlimited
                                                        </Link>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                    {[
                                                        { key: 'story_generation', label: 'Stories', icon: Wand2, color: 'from-purple-400 to-indigo-500' },
                                                        { key: 'image_generation', label: 'Images', icon: Sparkles, color: 'from-pink-400 to-rose-500' },
                                                        { key: 'word_insight', label: 'Insights', icon: Languages, color: 'from-emerald-400 to-teal-500' }
                                                    ].map(feat => {
                                                        const stat = usage[feat.key];
                                                        if (!stat) return null;
                                                        const percent = Math.min(100, (stat.current / stat.limit) * 100);
                                                        return (
                                                            <div key={feat.key} className="relative">
                                                                <div className="flex items-center justify-between mb-1.5 px-1">
                                                                    <span className="text-[10px] font-black font-fredoka text-slate-500 uppercase">{feat.label}</span>
                                                                    <span className="text-[10px] font-bold font-nunito text-slate-400">{stat.current}/{stat.limit}</span>
                                                                </div>
                                                                <div className="h-3 bg-white rounded-full overflow-hidden shadow-inner border border-slate-100 p-0.5">
                                                                    <motion.div
                                                                        initial={{ width: 0 }}
                                                                        animate={{ width: `${percent}%` }}
                                                                        className={cn(
                                                                            "h-full rounded-full bg-gradient-to-r transition-all duration-1000",
                                                                            stat.isLimitReached ? "from-rose-400 to-rose-500" : feat.color
                                                                        )}
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Action Grid */}
                                        <div className="grid grid-cols-2 gap-4 w-full mb-6">
                                            <button
                                                onClick={() => { setIsHubOpen(false); router.push("/profiles"); }}
                                                className="flex flex-col items-center justify-center gap-3 p-5 rounded-[2rem] bg-white border-2 border-slate-100 hover:border-purple-200 hover:bg-purple-50 transition-all group/btn shadow-sm active:scale-95"
                                            >
                                                <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center group-hover/btn:scale-110 transition-transform">
                                                    <Users className="w-6 h-6 text-purple-600" />
                                                </div>
                                                <span className="text-xs font-black font-fredoka text-slate-600 uppercase tracking-tight">MANAGE HEROES</span>
                                            </button>

                                            <button
                                                onClick={() => { setIsHubOpen(false); router.push("/dashboard"); }}
                                                className="flex flex-col items-center justify-center gap-3 p-5 rounded-[2rem] bg-white border-2 border-slate-100 hover:border-orange-200 hover:bg-orange-50 transition-all group/btn shadow-sm active:scale-95"
                                            >
                                                <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center group-hover/btn:scale-110 transition-transform">
                                                    <BookOpen className="w-6 h-6 text-orange-600" />
                                                </div>
                                                <span className="text-xs font-black font-fredoka text-slate-600 uppercase tracking-tight">GUARDIAN HUB</span>
                                            </button>
                                        </div>

                                        <button
                                            onClick={handleLogout}
                                            className="w-full py-4 rounded-[1.5rem] bg-rose-50 border-2 border-rose-100 text-rose-500 font-fredoka font-black text-sm uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center justify-center gap-2 group/out active:scale-[0.98]"
                                        >
                                            <LogOut className="w-4 h-4 group-hover/out:-translate-x-1 transition-transform" />
                                            Log Out Hub
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center py-10">
                                        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-6">
                                            <User className="w-10 h-10 text-slate-300" />
                                        </div>
                                        <p className="text-slate-500 italic font-nunito font-bold text-lg mb-8 uppercase tracking-widest text-center">Your hero's journey begins with a single word...</p>
                                        <Link
                                            href="/login"
                                            className="w-full py-4 rounded-2xl bg-accent text-white font-fredoka font-black text-center shadow-clay-accent"
                                            onClick={() => setIsHubOpen(false)}
                                        >
                                            LOGIN EXPLORER
                                        </Link>
                                    </div>
                                )}

                                <button
                                    onClick={() => setIsHubOpen(false)}
                                    className="w-full py-5 mt-6 font-fredoka text-xl rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-clay-purple hover:from-purple-700 hover:to-indigo-700 transition-all active:scale-95"
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
