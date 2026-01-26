"use client";

import Link from "next/link";
import { LogOut, Rocket, Sparkles, User } from "lucide-react";
import { LumoCharacter } from "@/components/ui/lumo-character";
import { cn } from "@/lib/core/utils/cn";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useAuth } from "@/components/auth/auth-provider";
import { CachedImage } from "@/components/ui/cached-image";
import { useUsage } from "@/lib/hooks/use-usage";
import { useTutorial } from "@/components/tutorial/tutorial-context";
import { safeHaptics, ImpactStyle } from "@/lib/core";

import { ME_PRIMARY_PATH, ME_PATHS, navItems, type NavItemConfig } from "./nav-constants";
import { useNavNavigation } from "./hooks/useNavNavigation";
import { NavItem } from "./NavItem";
import { RewardBadge } from "./RewardBadge";
import { NavHubModal } from "./NavHubModal";

export function ClayNav() {
    const { user, activeChild, logout } = useAuth();
    const prefersReducedMotion = useReducedMotion();
    const { completeStep } = useTutorial();
    const { usage, plan, loading } = useUsage(["story_generation", "word_insight", "image_generation"]);

    const [isHubOpen, setIsHubOpen] = useState(false);
    const [activeReward, setActiveReward] = useState<{ xp_earned: number; streak_days?: number } | null>(null);

    const {
        pathname,
        pendingHref,
        libraryHref,
        isExpanded,
        setIsExpanded,
        handleNavPointerDown,
        handleNavPointerUp,
        handleNavPointerCancel,
        handleNavActivate,
        isActive,
    } = useNavNavigation();

    useEffect(() => {
        const handleXpEarned = (e: any) => {
            setActiveReward(e.detail);
            setTimeout(() => setActiveReward(null), 4000);
        };

        window.addEventListener('xp-earned' as any, handleXpEarned);
        return () => window.removeEventListener('xp-earned' as any, handleXpEarned);
    }, []);

    const handleLogout = async () => {
        setIsHubOpen(false);
        await logout();
    };

    if (pathname === "/" || pathname === "/login") return null;

    const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "";
    const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || "";
    const userInitial = fullName ? fullName[0].toUpperCase() : (user?.email?.[0]?.toUpperCase() ?? "?");

    const isOnboarding = pathname === "/onboarding";
    const pendingPath = pendingHref?.split("?")[0];
    const isMePending = !!pendingPath && ME_PATHS.includes(pendingPath);
    const isMeActive = pendingHref ? isMePending : ME_PATHS.some(path => isActive(path));

    const navItemsWithLibrary = useMemo(() => (
        navItems.map((item) => (item.id === "nav-item-library" ? { ...item, href: libraryHref } : item)) as NavItemConfig[]
    ), [libraryHref]);

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
                            "fixed z-50 w-[calc(100%-1.5rem)] sm:w-[calc(100%-3rem)] max-w-2xl gap-1 flex items-center justify-between p-2 rounded-[3.5rem] bg-white/70 backdrop-blur-lg sm:backdrop-blur-xl border-2 border-white/80 shadow-lg sm:shadow-xl pointer-events-auto bottom-[env(safe-area-inset-bottom,24px)] left-0 right-0 mx-auto transition-shadow duration-200",
                            isExpanded && "shadow-clay-purple"
                        )}
                    >
                        <button
                            data-tour-target="nav-item-lumo-character"
                            onClick={() => {
                                safeHaptics.impact({ style: ImpactStyle.Medium });
                                setIsExpanded(false);
                            }}
                            className="flex items-center gap-3 group relative z-50 pl-2 shrink-0 touch-manipulation"
                            title="Fold Navigation"
                        >
                            <span className="relative w-12 h-12 group-hover:scale-110 transition-transform duration-300">
                                <LumoCharacter size="lg" />
                            </span>
                        </button>

                        <div className={cn("flex items-center justify-between w-full relative")}>
                            <Link
                                href={ME_PRIMARY_PATH}
                                id="nav-item-profile"
                                data-tour-target="nav-item-profile"
                                className="flex-1 touch-manipulation"
                                onPointerDown={(event) => handleNavPointerDown(event, ME_PRIMARY_PATH)}
                                onPointerUp={(event) => handleNavPointerUp(event, ME_PRIMARY_PATH)}
                                onPointerCancel={(event) => handleNavPointerCancel(event, ME_PRIMARY_PATH)}
                                onPointerLeave={(event) => {
                                    if (event.pointerType === "touch") return;
                                    handleNavPointerCancel(event, ME_PRIMARY_PATH);
                                }}
                                onClick={() => handleNavActivate(ME_PRIMARY_PATH)}
                            >
                                <motion.div
                                    className={cn(
                                        "flex flex-col items-center justify-center h-14 rounded-[2rem] transition-all duration-200 mx-1 active:scale-90 active:-translate-y-0.5",
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

                            {navItemsWithLibrary.map((item) => {
                                const activeNow = pendingHref ? pendingHref === item.href : isActive(item.href);
                                return (
                                    <NavItem
                                        key={item.href}
                                        item={item}
                                        isActive={activeNow}
                                        onPointerDown={handleNavPointerDown}
                                        onPointerUp={handleNavPointerUp}
                                        onPointerCancel={handleNavPointerCancel}
                                        onActivate={handleNavActivate}
                                        onComplete={completeStep}
                                    />
                                );
                            })}

                            <div className="flex items-center gap-4 ml-1">
                                <motion.button
                                    onClick={() => {
                                        safeHaptics.impact({ style: ImpactStyle.Light });
                                        setIsHubOpen(true);
                                    }}
                                    className={cn(
                                        "flex flex-col items-center justify-center w-14 h-14 rounded-full overflow-hidden border-2 border-white shadow-sm active:scale-95 transition-transform touch-manipulation",
                                        user ? "text-orange-500 bg-white/40" : "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg border-white/50"
                                    )}
                                    aria-label={user ? "Open Adventure Hub" : "Join the Adventure"}
                                >
                                    {user ? (
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
                                    ) : (
                                        <>
                                            <User className="w-6 h-6" />
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={prefersReducedMotion ? { scale: 1 } : { scale: [1, 1.2, 1] }}
                                                transition={prefersReducedMotion ? {} : { repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#FFAA00] border-2 border-white shadow-sm flex items-center justify-center"
                                            >
                                                <Sparkles className="w-2.5 h-2.5 text-white" />
                                            </motion.div>
                                        </>
                                    )}
                                </motion.button>
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
                            <RewardBadge activeReward={activeReward} />

                            <button
                                onClick={() => {
                                    safeHaptics.impact({ style: ImpactStyle.Medium });
                                    setIsExpanded(true);
                                    if (typeof window !== "undefined") {
                                        requestAnimationFrame(() => completeStep('nav-item-lumo'));
                                    } else {
                                        completeStep('nav-item-lumo');
                                    }
                                }}
                                data-tour-target="nav-item-lumo-character"
                                className="group relative flex items-center justify-center w-20 h-20 hover:scale-110 active:scale-90 transition-transform duration-500 pointer-events-auto touch-manipulation"
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

            <NavHubModal
                isOpen={isHubOpen}
                onClose={() => setIsHubOpen(false)}
                user={user}
                plan={plan}
                usage={usage}
                loading={loading}
                onLogout={handleLogout}
            />
        </>
    );
}
