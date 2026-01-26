"use client";

import React from "react";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface FilterOption {
    value: string;
    label: string;
    icon?: LucideIcon;
    theme: string;
    iconColor: string;
    hoverRx: string;
    activeIconColor?: string;
}

interface FilterSelectProps {
    value: string | undefined;
    onChange: (val: string | undefined) => void;
    options: FilterOption[];
    placeholder: string;
    icon: LucideIcon;
    prefix?: string;
}

export function FilterSelect({ 
    value, 
    onChange, 
    options, 
    placeholder, 
    icon: BaseIcon, 
    prefix 
}: FilterSelectProps) {
    const activeOption = options.find((o) => o.value === value);
    const ActiveIcon = activeOption?.icon || BaseIcon;

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    className={`
                        flex items-center gap-1.5 px-3 lg:px-4 py-1.5 rounded-full border transition-all text-sm font-bold font-fredoka outline-none active:scale-95
                        ${(value && activeOption)
                            ? `${activeOption.theme} border-transparent shadow-lg scale-105`
                            : 'bg-indigo-50/30 border-indigo-100/50 text-indigo-600/70 hover:bg-indigo-50 hover:text-indigo-600 shadow-sm'
                        }
                    `}
                >
                    <div className="relative flex items-center justify-center">
                        {(value && activeOption) && (
                            <motion.div
                                layoutId={`glow-${placeholder}`}
                                className={`absolute inset-0 blur-md opacity-60 ${activeOption.iconColor} bg-current rounded-full`}
                            />
                        )}
                        <ActiveIcon className={`
                            w-3.5 h-3.5 stroke-[2.5] relative z-10 transition-colors duration-300
                            ${(value && activeOption) ? (activeOption.activeIconColor || 'text-white') : 'text-slate-400'}
                        `} />
                    </div>
                    <span className="truncate max-w-[110px]">
                        {(value && activeOption) ? (prefix ? `${prefix}: ${activeOption.label}` : activeOption.label) : placeholder}
                    </span>
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-2 rounded-[24px] shadow-2xl border-2 border-slate-100/50 bg-white/95 backdrop-blur-md" align="start">
                <div className="space-y-1">
                    {options.map((opt) => {
                        const isActive = value === opt.value;
                        const OptIcon = opt.icon || BaseIcon;
                        return (
                            <button
                                key={opt.value}
                                onClick={() => onChange(isActive ? undefined : opt.value)}
                                className={`
                                    flex items-center gap-3 w-full px-3 py-3 rounded-xl transition-all group
                                    ${isActive ? opt.theme : 'hover:bg-slate-50'}
                                `}
                            >
                                <div className={`
                                    p-2 rounded-lg transition-colors
                                    ${isActive ? 'bg-white/20' : `bg-slate-50 ${opt.hoverRx}`}
                                `}>
                                    <OptIcon className={`w-4 h-4 ${isActive ? 'text-white' : opt.iconColor}`} />
                                </div>
                                <div className="text-left">
                                    <div className={`text-sm font-fredoka font-bold ${isActive ? 'text-white' : 'text-slate-700'}`}>
                                        {opt.label}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </PopoverContent>
        </Popover>
    );
}
