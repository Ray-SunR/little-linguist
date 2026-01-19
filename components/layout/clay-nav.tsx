"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, Wand2, Languages, User, LogOut, Mail, MessageCircle, Rocket, Sparkles, Users, Settings, ShieldCheck } from "lucide-react";
import { LumoCharacter } from "@/components/ui/lumo-character";
import { cn } from "@/lib/core/utils/cn";
import { memo, useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useAuth } from "@/components/auth/auth-provider";
import { ParentalLink } from "@/components/ui/parental-gate";

import { CachedImage } from "@/components/ui/cached-image";
import { useUsage } from "@/lib/hooks/use-usage";
import { useTutorial } from "@/components/tutorial/tutorial-context";

const ME_PRIMARY_PATH = "/dashboard";
const ME_PATHS = ["/dashboard", "/profiles"];

const navItems = [
    {
        id: "nav-item-library",
        href: "/library",
        label: "Book Library",
        icon: BookOpen,
        color: "text-blue-500",
        shadow: "shadow-clay-purple", // Purple theme for library
        bg: "bg-blue-50 dark:bg-blue-900/20",
        activeBg: "bg-blue-100 dark:bg-blue-800/40",
    },
    {
        id: "nav-item-story",
        href: "/story-maker",
        label: "Story Maker",
        icon: Wand2,
        color: "text-purple-500",
        shadow: "shadow-clay-purple",
        bg: "bg-purple-50 dark:bg-purple-900/20",
        activeBg: "bg-purple-100 dark:bg-purple-800/40",
    },
    {
        id: "nav-item-words",
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
    onClick,
    onComplete
}: {
    item: typeof navItems[0],
    isActive: boolean,
    onClick?: (href: string) => void,
    onComplete?: (id: string) => void
}) {
    const Icon = item.icon;

    return (
        <Link
            id={(item as any).id}
            data-tour-target={(item as any).id}
            href={item.href}
            className="flex-1"
            onClick={() => {
                onClick?.(item.href);
                if (onComplete) onComplete((item as any).id);
            }}
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
    const { user, isStoryGenerating, activeChild, logout } = useAuth();
    const [isHubOpen, setIsHubOpen] = useState(false);
    const [activeReward, setActiveReward] = useState<{ xp_earned: number; streak_days?: number } | null>(null);

    useEffect(() => {
        const handleXpEarned = (e: any) => {
            setActiveReward(e.detail);
            // Auto-clear after animation
            setTimeout(() => setActiveReward(null), 4000);
        };

        window.addEventListener('xp-earned' as any, handleXpEarned);
        return () => window.removeEventListener('xp-earned' as any, handleXpEarned);
    }, []);
    const [pendingHref, setPendingHref] = useState<string | null>(null);
    const [libraryHref, setLibraryHref] = useState("/library");

    // Update library href from session storage to restore state
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const last = sessionStorage.getItem('lastLibraryUrl');
            if (last) setLibraryHref(last);
        }
    }, [pathname, isHubOpen]); // Check when path changes or hub opens/closes
    const { usage, plan, loading } = useUsage(["story_generation", "word_insight", "image_generation"]);
    const { completeStep } = useTutorial();
    const isReaderView = pathname.startsWith("/reader");
    const isLibraryView = pathname.startsWith("/library");
    const [isExpanded, setIsExpanded] = useState(true);
    const hubModalRef = useRef<HTMLDivElement>(null);

    // Auto-focus the hub modal when it opens
    useEffect(() => {
        if (isHubOpen) {
            hubModalRef.current?.focus();
        }
    }, [isHubOpen]);

    // Prefetch main destinations to reduce perceived nav latency
    useEffect(() => {
        navItems.forEach(item => router.prefetch(item.href));
        ME_PATHS.forEach(path => router.prefetch(path));
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
        if (pendingHref) {
            // Compare only the pathname part as pendingHref may contain search params
            const targetPath = pendingHref.split('?')[0];
            if (pathname === targetPath || (targetPath !== '/' && pathname.startsWith(targetPath))) {
                setPendingHref(null);
            }
        }
    }, [pathname, pendingHref]);

    const handleLogout = async () => {
        setIsHubOpen(false);
        await logout();
    };

    // Hide nav on landing and login - these pages have their own layouts
    if (pathname === "/" || pathname === "/login") return null;

    const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "";
    const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || "";
    const userInitial = fullName ? fullName[0].toUpperCase() : (user?.email?.[0]?.toUpperCase() ?? "?");

    const isActive = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href));
    const isOnboarding = pathname === "/onboarding";
    const isMeActive = ME_PATHS.some(path => isActive(path));

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
                            "fixed z-50 w-[calc(100%-1.5rem)] sm:w-[calc(100%-3rem)] max-w-2xl gap-1 flex items-center justify-between p-2 rounded-[3.5rem] bg-white/70 backdrop-blur-xl border-2 border-white/80 shadow-xl pointer-events-auto bottom-[env(safe-area-inset-bottom,24px)] left-0 right-0 mx-auto transition-shadow duration-200",
                            isExpanded && "shadow-clay-purple"
                        )}
                    >
                        <button
                            data-tour-target="nav-item-lumo-character"
                            onClick={() => setIsExpanded(false)}
                            className="flex items-center gap-3 group relative z-50 pl-2 shrink-0"
                            title="Fold Navigation"
                        >
                            <span className="relative w-12 h-12 group-hover:scale-110 transition-transform duration-300">
                                <LumoCharacter size="lg" />
                            </span>
                        </button>

                        <div className={cn("flex items-center justify-between w-full relative")}>


                            {/* Me Button (Active for Dashboard or Profiles) */}
                            {/* Me Button (Active for Dashboard or Profiles) */}
                            <Link
                                href={ME_PRIMARY_PATH}
                                id="nav-item-profile"
                                data-tour-target="nav-item-profile"
                                className="flex-1"
                                onClick={() => setPendingHref(ME_PRIMARY_PATH)}
                            >
                                <motion.div
                                    whileTap={{ scale: 0.8, y: -5 }}
                                    className={cn(
                                        "flex flex-col items-center justify-center h-14 rounded-[2rem] transition-colors duration-300 mx-1",
                                        isMeActive
                                            ? "bg-white/60 text-purple-600 shadow-sm border-2 border-white/80"
                                            : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    {activeChild?.avatar_asset_path ? (
                                        <div className={cn("relative w-6 h-6 rounded-full overflow-hidden border border-white shadow-sm mb-1", isMeActive ? "ring-2 ring-purple-100" : "")}>
                                            <CachedImage
                                                src={activeChild.avatar_asset_path}
                                                storagePath={activeChild.avatar_paths?.[activeChild.primary_avatar_index ?? 0]}
                                                alt="Me"
                                                fill
                                                className="object-cover"
                                                updatedAt={activeChild.updated_at}
                                                bucket="user-assets"
                                            />
                                        </div>
                                    ) : (
                                        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center mb-1 bg-gradient-to-br from-indigo-400 to-purple-500 text-white shadow-sm", isMeActive ? "ring-2 ring-purple-100" : "")}>
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
                                const finalItem = item.id === 'nav-item-library' ? { ...item, href: libraryHref } : item;
                                return (
                                    <MemoizedNavItem
                                        key={item.href}
                                        item={finalItem}
                                        isActive={activeNow}
                                        onClick={(href) => setPendingHref(href)}
                                        onComplete={completeStep}
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
                                    <motion.button
                                        whileTap={prefersReducedMotion ? undefined : { scale: 0.9 }}
                                        onClick={() => setIsHubOpen(true)}
                                        className="relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg border-2 border-white/50 hover:scale-105 active:scale-95 transition-all"
                                        aria-label="Join the Adventure"
                                    >
                                        <User className="w-6 h-6" />
                                        {/* Pulsing Sparkle Badge */}
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={prefersReducedMotion ? { scale: 1 } : { scale: [1, 1.2, 1] }}
                                            transition={prefersReducedMotion ? {} : { repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#FFAA00] border-2 border-white shadow-sm flex items-center justify-center"
                                        >
                                            <Sparkles className="w-2.5 h-2.5 text-white" />
                                        </motion.div>
                                    </motion.button>
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
                        className="fixed bottom-[env(safe-area-inset-bottom,24px)] left-0 right-0 mx-auto w-max z-50 pointer-events-auto"
                    >
                        <div className="relative">
                            <AnimatePresence>
                                {activeReward && activeReward.xp_earned > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.5 }}
                                        animate={{ opacity: 1, y: -80, scale: 1.2 }}
                                        exit={{ opacity: 0, y: -100, scale: 0.8 }}
                                        className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-[100]"
                                    >
                                        <div className="flex flex-col items-center">
                                            <div className="bg-amber-400 text-ink font-fredoka font-black text-sm px-3 py-1.5 rounded-full shadow-clay-orange whitespace-nowrap border-2 border-white">
                                                +{activeReward.xp_earned} Lumo Coins
                                            </div>
                                            {activeReward.streak_days && activeReward.streak_days > 0 && (
                                                <div className="bg-orange-500 text-white font-fredoka font-black text-[10px] px-2 py-1 rounded-full shadow-sm mt-1.5 border border-white">
                                                    {activeReward.streak_days} DAY STREAK! 🔥
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <button
                                onClick={() => {
                                    setIsExpanded(true);
                                    completeStep('nav-item-lumo');
                                }}
                                data-tour-target="nav-item-lumo-character"
                                className="group relative flex items-center justify-center w-20 h-20 hover:scale-110 active:scale-90 transition-all duration-500 pointer-events-auto"
                            >
                                <LumoCharacter size="lg" />
                                <div className="absolute -top-1 -right-1 bg-accent text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Rocket className="w-3 h-3" />
                                </div>
                            </button>
                        </div>
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
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                            onClick={() => setIsHubOpen(false)}
                        />

                        <motion.div
                            initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0.95, opacity: 0, y: 10 }}
                            animate={prefersReducedMotion ? { opacity: 1 } : { scale: 1, opacity: 1, y: 0 }}
                            exit={prefersReducedMotion ? { opacity: 0 } : { scale: 0.95, opacity: 0, y: 10 }}
                            transition={prefersReducedMotion ? { duration: 0.1 } : { duration: 0.2 }}
                            ref={hubModalRef}
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
                                                    {user.user_metadata?.avatar_url ? (
                                                        <CachedImage
                                                            src={user.user_metadata.avatar_url}
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
                                                onClick={handleLogout}
                                                className="flex flex-col items-center gap-3 p-5 rounded-3xl bg-rose-50 border border-rose-100/50 hover:bg-rose-100 transition-all shadow-clay-sm active:scale-95 cursor-pointer"
                                            >
                                                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-inner-sm">
                                                    <LogOut className="w-6 h-6 text-rose-500" />
                                                </div>
                                                <span className="text-[10px] font-black font-fredoka text-rose-600 uppercase leading-tight tracking-wider">Log Out</span>
                                            </button>
                                        </div>

                                        <button
                                            onClick={() => setIsHubOpen(false)}
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
                                            onClick={() => setIsHubOpen(false)}
                                        >
                                            Create Free Account
                                        </Link>

                                        {/* Secondary */}
                                        <Link
                                            href="/login"
                                            className="mt-3 text-sm font-fredoka font-bold text-slate-500 hover:text-indigo-600 transition-colors"
                                            onClick={() => setIsHubOpen(false)}
                                        >
                                            Already have an account? <span className="underline">Log In</span>
                                        </Link>
                                    </div>
                                )}

                                <button
                                    onClick={() => setIsHubOpen(false)}
                                    className="hidden"
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
