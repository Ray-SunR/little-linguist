"use client";

import React from "react";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/core";

interface ShadowPillProps {
    icon: LucideIcon;
    label: string;
    count: number | string;
    color: 'purple' | 'amber';
    onClick?: () => void;
    className?: string;
}

/**
 * A reusable pill component with a specific claymorphism shadow style.
 * Used for displaying credits/usage in toolbars.
 */
export function ShadowPill({
    icon: Icon,
    label,
    count,
    color,
    onClick,
    className
}: ShadowPillProps) {
    const colorStyles = {
        purple: "bg-purple-50/80 text-purple-600 border-purple-100/50 shadow-clay-purple-sm hover:bg-purple-100/90",
        amber: "bg-amber-50/80 text-amber-600 border-amber-100/50 shadow-clay-amber-sm hover:bg-amber-100/90"
    };

    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className={cn(
                "flex items-center gap-2 px-3 py-1 md:py-1.5 rounded-full border transition-all duration-200",
                colorStyles[color],
                className
            )}
        >
            <Icon className="w-4 h-4 shrink-0" />
            <div className="flex flex-col items-start leading-none">
                <span className="text-[10px] md:text-xs font-fredoka font-black uppercase tracking-wider">
                    {count}
                </span>
                <span className="text-[8px] font-nunito font-bold opacity-70 uppercase tracking-tighter">
                    {label}
                </span>
            </div>
        </motion.button>
    );
}
