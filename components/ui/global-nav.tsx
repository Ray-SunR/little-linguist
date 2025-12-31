"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Wand2, Languages, User, Sparkles } from "lucide-react";
import { cn } from "@/lib/core";
import { useState, useEffect } from "react";

export default function GlobalNav() {
    const pathname = usePathname();
    const [isVisible, setIsVisible] = useState(true);
    const [isImmersive, setIsImmersive] = useState(false);

    // Auto-hide in reader mode for immersion
    useEffect(() => {
        const readerMode = pathname.startsWith("/reader");
        setIsImmersive(readerMode);
        if (readerMode) {
            setIsVisible(false);
        } else {
            setIsVisible(true);
        }
    }, [pathname]);

    const navItems = [
        { href: "/reader", icon: Home, label: "Library", color: "text-blue-500", bg: "bg-blue-500" },
        { href: "/story-maker", icon: Wand2, label: "Maker", color: "text-purple-500", bg: "bg-purple-500" },
        { href: "/my-words", icon: Languages, label: "Words", color: "text-indigo-500", bg: "bg-indigo-500" },
        // { href: "/profile", icon: User, label: "Hero", color: "text-pink-500", bg: "bg-pink-500" },
    ];

    if (isImmersive && !isVisible) {
        return (
            <button
                onClick={() => setIsVisible(true)}
                className="fixed bottom-6 left-6 z-[200] flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 backdrop-blur-xl shadow-lg border border-white/50 animate-bounce-slow hover:scale-110 transition-all active:scale-95"
                aria-label="Show Menu"
            >
                <Sparkles className="h-6 w-6 text-accent" />
            </button>
        );
    }

    return (
        <>
            {/* Mobile/Portrait Bottom Dock */}
            <nav className={cn(
                "fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 w-[calc(100%-3rem)] max-w-md transition-all duration-500 md:hidden",
                isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none"
            )}>
                <div className="glass-card flex items-center justify-around p-2 gap-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "relative flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-300 flex-1",
                                    isActive ? "bg-white/50 shadow-inner scale-105" : "hover:bg-white/30"
                                )}
                            >
                                <item.icon className={cn(
                                    "h-6 w-6 transition-all",
                                    isActive ? item.color : "text-ink-muted/60"
                                )} />
                                {isActive && (
                                    <div className={cn("absolute -bottom-1 h-1 w-1 rounded-full", item.bg)} />
                                )}
                            </Link>
                        );
                    })}
                    {isImmersive && (
                        <button
                            onClick={() => setIsVisible(false)}
                            className="flex items-center justify-center p-3 rounded-2xl hover:bg-white/30 text-ink-muted/40 transition-all"
                        >
                            <Sparkles className="h-6 w-6 rotate-180" />
                        </button>
                    )}
                </div>
            </nav>

            {/* Tablet/Landscape Side Shelf */}
            <nav className={cn(
                "fixed left-6 top-1/2 z-[200] -translate-y-1/2 hidden md:flex transition-all duration-500",
                isVisible ? "translate-x-0 opacity-100" : "-translate-x-24 opacity-0 pointer-events-none"
            )}>
                <div className="glass-card flex flex-col items-center p-3 gap-4">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "group relative flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-300",
                                    isActive ? "bg-white/50 shadow-inner scale-105" : "hover:bg-white/30"
                                )}
                                title={item.label}
                            >
                                <item.icon className={cn(
                                    "h-7 w-7 transition-all",
                                    isActive ? item.color : "text-ink-muted/60"
                                )} />

                                {/* Tooltip on hover */}
                                <span className="absolute left-16 px-3 py-1.5 rounded-xl bg-white/90 backdrop-blur-md shadow-lg border border-white/50 text-xs font-bold text-ink opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                    {item.label}
                                </span>

                                {isActive && (
                                    <div className={cn("absolute -right-1.5 h-6 w-1 rounded-full", item.bg)} />
                                )}
                            </Link>
                        );
                    })}
                    {isImmersive && (
                        <button
                            onClick={() => setIsVisible(false)}
                            className="flex h-14 w-14 items-center justify-center rounded-2xl hover:bg-white/30 text-ink-muted/40 transition-all"
                            title="Minimize Menu"
                        >
                            <Sparkles className="h-6 w-6" />
                        </button>
                    )}
                </div>
            </nav>
        </>
    );
}
