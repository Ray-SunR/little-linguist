"use client";

import Link from "next/link";
import { memo, useCallback } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/core/utils/cn";
import { NavItemConfig } from "./nav-constants";

interface NavItemProps {
    item: NavItemConfig;
    isActive: boolean;
    onPointerDown?: (event: React.PointerEvent<HTMLAnchorElement>, href: string) => void;
    onPointerUp?: (event: React.PointerEvent<HTMLAnchorElement>, href: string) => void;
    onPointerCancel?: (event: React.PointerEvent<HTMLAnchorElement>, href: string) => void;
    onActivate?: (href: string) => void;
    onComplete?: (id: string) => void;
}

export const NavItem = memo(function NavItem({
    item,
    isActive,
    onPointerDown,
    onPointerUp,
    onPointerCancel,
    onActivate,
    onComplete
}: NavItemProps) {
    const Icon = item.icon;

    const handleComplete = useCallback(() => {
        if (!onComplete) return;
        if (typeof window !== "undefined") {
            requestAnimationFrame(() => onComplete(item.id));
        } else {
            onComplete(item.id);
        }
    }, [item.id, onComplete]);

    return (
        <Link
            id={item.id}
            data-tour-target={item.id}
            href={item.href}
            className="flex-1 touch-manipulation"
            onPointerDown={onPointerDown ? (event) => onPointerDown(event, item.href) : undefined}
            onPointerUp={onPointerUp ? (event) => onPointerUp(event, item.href) : undefined}
            onPointerCancel={onPointerCancel ? (event) => onPointerCancel(event, item.href) : undefined}
            onPointerLeave={onPointerCancel ? (event) => {
                if (event.pointerType === "touch") return;
                onPointerCancel(event, item.href);
            } : undefined}
            onClick={() => {
                if (onActivate) onActivate(item.href);
                handleComplete();
            }}
        >
            <motion.div
                className={cn(
                    "flex flex-col items-center justify-center h-14 rounded-[2rem] transition-all duration-200 mx-1 active:scale-90 active:-translate-y-0.5",
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
