"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, BookOpen, Wand2, Languages, Settings2, User, LogOut, Mail } from "lucide-react";
import { cn } from "@/lib/core/utils/cn";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const navItems = [
    {
        href: "/",
        label: "Home",
        icon: Home,
        color: "from-emerald-300 to-teal-500",
        activeColor: "bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg shadow-emerald-200/50",
        inactiveColor: "text-emerald-500/70 dark:text-emerald-400/70 hover:bg-emerald-50 dark:hover:bg-emerald-900/10",
    },
    {
        href: "/reader",
        label: "Library",
        icon: BookOpen,
        color: "from-blue-300 to-indigo-500",
        activeColor: "bg-gradient-to-br from-blue-400 to-indigo-600 text-white shadow-lg shadow-blue-200/50",
        inactiveColor: "text-blue-500/70 dark:text-blue-400/70 hover:bg-blue-50 dark:hover:bg-blue-900/10",
    },
    {
        href: "/story-maker",
        label: "Maker",
        icon: Wand2,
        color: "from-purple-300 to-pink-500",
        activeColor: "bg-gradient-to-br from-purple-400 to-pink-600 text-white shadow-lg shadow-purple-200/50",
        inactiveColor: "text-purple-500/70 dark:text-purple-400/70 hover:bg-purple-50 dark:hover:bg-purple-900/10",
    },
    {
        href: "/my-words",
        label: "Words",
        icon: Languages,
        color: "from-indigo-300 to-blue-500",
        activeColor: "bg-gradient-to-br from-indigo-400 to-blue-600 text-white shadow-lg shadow-indigo-200/50",
        inactiveColor: "text-indigo-500/70 dark:text-indigo-400/70 hover:bg-indigo-50 dark:hover:bg-indigo-900/10",
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

    // Expert UX: Hide sidebar on login page for full focus
    if (pathname === "/login") return null;

    const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name || "";
    const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || "";
    const userInitial = fullName ? fullName[0].toUpperCase() : (user?.email?.[0]?.toUpperCase() ?? "?");

    return (
        <>
            {/* Sidebar - Desktop/Tablet */}
            <nav className="fixed left-6 top-1/2 -translate-y-1/2 z-50 hidden md:flex flex-col items-center gap-4 py-8 px-4 rounded-[2.5rem] bg-white/70 dark:bg-[#1c1f2f]/80 backdrop-blur-2xl border-2 border-white/80 shadow-[0_20px_50px_rgba(139,75,255,0.15)] animate-in slide-in-from-left duration-700 pointer-events-auto">
                <div className="mb-6">
                    <button
                        onClick={() => setIsHubOpen(true)}
                        className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-300 via-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-200/50 hover:scale-110 active:scale-90 transition-all text-white group relative overflow-hidden"
                    >
                        {avatarUrl ? (
                            <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
                        ) : user ? (
                            <span className="text-xl font-black drop-shadow-md">{userInitial}</span>
                        ) : (
                            <User className="w-7 h-7 drop-shadow-md" />
                        )}
                        <span className="absolute left-20 px-4 py-2 bg-white/95 dark:bg-[#1c1f2f]/95 backdrop-blur-md rounded-xl text-xs font-black text-orange-600 border border-orange-100 dark:border-orange-500/20 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0 whitespace-nowrap shadow-xl">
                            {user ? (fullName || "My Adventure") : "Adventure Hub"}
                        </span>
                    </button>
                </div>

                <div className="flex flex-col gap-4">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "w-14 h-14 rounded-[1.25rem] flex items-center justify-center transition-all duration-300 active:scale-75 group relative",
                                    isActive ? item.activeColor : item.inactiveColor
                                )}
                            >
                                <Icon className={cn("w-6 h-6 drop-shadow-sm", isActive ? "animate-bounce-subtle" : "")} />
                                <span className={cn(
                                    "absolute left-20 px-4 py-2 bg-white/95 dark:bg-[#1c1f2f]/95 backdrop-blur-md rounded-xl text-xs font-black border opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0 whitespace-nowrap shadow-xl",
                                    isActive ? "text-ink border-purple-100 dark:border-purple-500/20" : "text-ink-muted border-gray-100 dark:border-white/5"
                                )}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>

                <div className="mt-6 border-t border-purple-100 dark:border-white/10 pt-6">
                    <button
                        onClick={() => setIsHubOpen(true)}
                        className="w-14 h-14 rounded-2xl text-ink-muted/50 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-accent transition-all flex items-center justify-center group relative active:scale-90"
                    >
                        <Settings2 className="w-6 h-6" />
                        <span className="absolute left-20 px-4 py-2 bg-white/95 dark:bg-[#1c1f2f]/95 backdrop-blur-md rounded-xl text-xs font-black text-ink-muted border border-gray-100 dark:border-white/5 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0 whitespace-nowrap shadow-xl">
                            Settings
                        </span>
                    </button>
                </div>
            </nav>

            {/* Bottom Bar - Mobile */}
            <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 md:hidden w-[calc(100%-3rem)] max-w-sm flex items-center justify-around p-2 rounded-[2rem] bg-white/80 dark:bg-[#1c1f2f]/90 backdrop-blur-2xl border-2 border-white/80 shadow-[0_20px_50px_rgba(139,75,255,0.2)] animate-in slide-in-from-bottom duration-700">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all active:scale-90",
                                isActive ? item.activeColor + " shadow-md scale-110" : item.inactiveColor
                            )}
                        >
                            <Icon className="w-5 h-5" />
                            <span className="text-[9px] font-black mt-1 uppercase tracking-tight">{item.label}</span>
                        </Link>
                    );
                })}
                <button
                    onClick={() => setIsHubOpen(true)}
                    className="w-14 h-14 rounded-full flex flex-col items-center justify-center text-orange-500 active:scale-90 overflow-hidden"
                >
                    {avatarUrl ? (
                        <img src={avatarUrl} alt={fullName} className="w-6 h-6 rounded-full object-cover" />
                    ) : user ? (
                        <span className="text-sm font-black">{userInitial}</span>
                    ) : (
                        <User className="w-5 h-5" />
                    )}
                    <span className="text-[9px] font-black mt-1 uppercase tracking-tight">Hub</span>
                </button>
            </nav>

            {/* Adventure Hub Modal */}
            {isHubOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
                    <div className="absolute inset-0 bg-purple-900/20 backdrop-blur-sm" onClick={() => setIsHubOpen(false)} />
                    <div className="relative w-full max-w-sm glass-card p-8 text-center animate-bounce-in">
                        <div className="w-24 h-24 mx-auto rounded-[2rem] bg-gradient-to-br from-orange-300 to-orange-500 flex items-center justify-center shadow-xl mb-6 scale-110 rotate-3 overflow-hidden border-4 border-white/50">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
                            ) : user ? (
                                <span className="text-4xl font-black text-white drop-shadow-lg">{userInitial}</span>
                            ) : (
                                <User className="w-12 h-12 text-white" />
                            )}
                        </div>

                        <h2 className="text-3xl font-black text-ink dark:text-white mb-2 leading-tight">
                            {fullName || (user ? "Magic Voyager" : "The Magic Hub")}
                        </h2>

                        {user ? (
                            <div className="flex flex-col items-center gap-2 mb-8">
                                <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 dark:bg-orange-500/10 rounded-full border border-orange-100 dark:border-orange-500/20">
                                    <Mail className="w-4 h-4 text-orange-500" />
                                    <span className="text-xs font-bold text-orange-700 dark:text-orange-400">{user.email}</span>
                                </div>
                                <p className="text-ink-muted text-sm mt-4">Welcome back to your magical world of stories!</p>
                            </div>
                        ) : (
                            <p className="text-ink-muted mb-8 italic">Your adventure is waiting to be written...</p>
                        )}

                        <div className="space-y-3">
                            {user && (
                                <button
                                    onClick={handleLogout}
                                    className="w-full py-4 px-6 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-black flex items-center justify-center gap-3 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all active:scale-95 group"
                                >
                                    <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                                    Sign Out
                                </button>
                            )}
                            <button
                                onClick={() => setIsHubOpen(false)}
                                className="w-full next-step-btn py-4"
                            >
                                {user ? "Keep Exploring" : "Close"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
