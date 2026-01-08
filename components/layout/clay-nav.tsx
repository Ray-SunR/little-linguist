"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, Wand2, Languages, User, LogOut, Mail, LayoutDashboard, Rocket } from "lucide-react";
import { LumoCharacter } from "@/components/ui/lumo-character";
import { cn } from "@/lib/core/utils/cn";
import { memo, useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useAuth } from "@/components/auth/auth-provider";
import { ProfileSwitcher } from "@/components/profile/ProfileSwitcher";
import { CachedImage } from "@/components/ui/cached-image";

const navItems = [
    {
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        color: "text-emerald-500",
        shadow: "shadow-clay-mint",
        bg: "bg-emerald-50 dark:bg-emerald-900/20",
        activeBg: "bg-emerald-100 dark:bg-emerald-800/40",
    },
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
    const { user, activeChild } = useAuth();
    const [isHubOpen, setIsHubOpen] = useState(false);
    const [pendingHref, setPendingHref] = useState<string | null>(null);
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
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        await supabase.auth.signOut();
        setIsHubOpen(false);
        router.push("/");
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
                            {user && (
                                <div className="mr-2">
                                    <ProfileSwitcher />
                                </div>
                            )}

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
                            initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0.8, opacity: 0, y: 50, rotate: -5 }}
                            animate={prefersReducedMotion ? { opacity: 1 } : { scale: 1, opacity: 1, y: 0, rotate: 0 }}
                            exit={prefersReducedMotion ? { opacity: 0 } : { scale: 0.8, opacity: 0, y: 50, rotate: 5 }}
                            transition={prefersReducedMotion ? { duration: 0.14 } : { type: "spring", damping: 15, stiffness: 250 }}
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
                                        <CachedImage src={avatarUrl} alt={fullName} fill className="object-cover" />
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
                                    <LumoCharacter size="sm" className="text-white" />
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
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <Link
                                            href="/profiles"
                                            onClick={() => setIsHubOpen(false)}
                                            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-purple-50 border-2 border-purple-100 hover:bg-purple-100 transition-all group"
                                        >
                                            <User className="w-6 h-6 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
                                            <span className="text-xs font-black font-fredoka text-purple-700 uppercase">Manage Heroes</span>
                                        </Link>
                                        <Link
                                            href="/dashboard"
                                            onClick={() => setIsHubOpen(false)}
                                            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-orange-50 border-2 border-orange-100 hover:bg-orange-100 transition-all group"
                                        >
                                            <BookOpen className="w-6 h-6 text-orange-600 mb-2 group-hover:scale-110 transition-transform" />
                                            <span className="text-xs font-black font-fredoka text-orange-700 uppercase">Guardian Dashboard</span>
                                        </Link>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {user && (
                                        <button
                                            onClick={handleLogout}
                                            className="w-full py-4 px-6 rounded-2xl bg-rose-50 text-rose-600 font-fredoka font-black flex items-center justify-center gap-3 hover:bg-rose-100 transition-all active:scale-95 group border-2 border-rose-100 shadow-sm"
                                        >
                                            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                                            Sign Out Explorer
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setIsHubOpen(false)}
                                        className="w-full py-5 font-fredoka text-xl rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-clay-purple hover:from-purple-700 hover:to-indigo-700 transition-all active:scale-95"
                                    >
                                        {user ? "Back to Adventure" : "Open Portal"}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
