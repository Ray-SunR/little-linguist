"use client";

import React from "react";
import { Filter } from "lucide-react";
import { cn } from "@/lib/core";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetClose,
} from "@/components/ui/sheet";
import { 
    CATEGORIES, 
    LEVEL_OPTIONS, 
    TYPE_OPTIONS, 
    DURATION_OPTIONS 
} from "./toolbar-constants";

interface MobileFiltersProps {
    filters: {
        level?: string;
        type?: "fiction" | "nonfiction";
        duration?: string;
        category?: string;
    };
    onFilterChange: (key: string, val: any) => void;
}

export function MobileFilters({ filters, onFilterChange }: MobileFiltersProps) {
    const hasActiveFilters = !!(
        filters.level || 
        filters.type || 
        filters.duration || 
        (filters.category && filters.category !== 'all')
    );

    return (
        <Sheet>
            <SheetTrigger asChild>
                <button
                    className={cn(
                        "lg:hidden p-2 rounded-xl transition-colors",
                        hasActiveFilters
                            ? "text-purple-600 bg-purple-50 border border-purple-100 shadow-sm"
                            : "text-purple-600/70 bg-purple-50/30 hover:bg-purple-50 hover:text-purple-600"
                    )}
                >
                    <Filter className="w-5 h-5" />
                </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-[32px] p-0 overflow-hidden bg-slate-50 border-none">
                <SheetHeader className="p-6 bg-white border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
                    <div className="space-y-1">
                        <SheetTitle className="text-left font-fredoka text-2xl font-black text-slate-800">Filters</SheetTitle>
                        <SheetDescription className="text-xs font-bold font-nunito text-slate-400 uppercase tracking-widest">Refine your library</SheetDescription>
                    </div>
                    <button
                        onClick={() => {
                            onFilterChange("level", undefined);
                            onFilterChange("type", undefined);
                            onFilterChange("duration", undefined);
                            onFilterChange("category", "all");
                        }}
                        className="text-xs font-black text-purple-600 uppercase tracking-widest px-3 py-1.5 rounded-xl hover:bg-purple-50"
                    >
                        Reset
                    </button>
                </SheetHeader>
                <div className="p-6 space-y-8 overflow-y-auto max-h-[60vh] pb-12">
                    {/* Theme/Category Section */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Theme</label>
                        <div className="grid grid-cols-2 gap-2">
                            {CATEGORIES.map((cat) => {
                                const isActive = filters.category === cat.id || (cat.id === 'all' && !filters.category);
                                const Icon = cat.icon;
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => onFilterChange("category", cat.id)}
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black font-fredoka transition-all border-2",
                                            isActive
                                                ? "bg-white border-purple-400 text-purple-600 shadow-lg shadow-purple-100"
                                                : "bg-white border-transparent text-slate-500 hover:border-slate-100 shadow-sm"
                                        )}
                                    >
                                        <Icon className={cn("w-4 h-4", isActive ? cat.iconClass : "text-slate-300")} />
                                        <span className="truncate">{cat.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Level Section */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Reading Level</label>
                        <div className="grid grid-cols-2 gap-2">
                            {LEVEL_OPTIONS.map((opt) => {
                                const isActive = filters.level === opt.value;
                                const Icon = opt.icon;
                                return (
                                    <button
                                        key={opt.value}
                                        onClick={() => onFilterChange("level", isActive ? undefined : opt.value)}
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-4 rounded-2xl text-sm font-black font-fredoka transition-all border-2",
                                            isActive
                                                ? opt.activeClass
                                                : "bg-white border-transparent text-slate-500 hover:border-slate-100 shadow-sm"
                                        )}
                                    >
                                        <Icon className={cn("w-4 h-4", isActive ? opt.activeIconClass : "text-slate-300")} />
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Type Section */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Story Type</label>
                        <div className="grid grid-cols-2 gap-2">
                            {TYPE_OPTIONS.map((opt) => {
                                const isActive = filters.type === opt.value;
                                const Icon = opt.icon;
                                return (
                                    <button
                                        key={opt.value}
                                        onClick={() => onFilterChange("type", isActive ? undefined : opt.value)}
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-4 rounded-2xl text-sm font-black font-fredoka transition-all border-2",
                                            isActive
                                                ? opt.activeClass
                                                : "bg-white border-transparent text-slate-500 hover:border-slate-100 shadow-sm"
                                        )}
                                    >
                                        <Icon className={cn("w-4 h-4", isActive ? opt.activeIconClass : "text-slate-300")} />
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Duration Section */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Length</label>
                        <div className="grid grid-cols-2 gap-2">
                            {DURATION_OPTIONS.map((opt) => {
                                const isActive = filters.duration === opt.value;
                                const Icon = opt.icon;
                                return (
                                    <button
                                        key={opt.value}
                                        onClick={() => onFilterChange("duration", isActive ? undefined : opt.value)}
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-4 rounded-2xl text-sm font-black font-fredoka transition-all border-2",
                                            isActive
                                                ? opt.activeClass
                                                : "bg-white border-transparent text-slate-500 hover:border-slate-100 shadow-sm"
                                        )}
                                    >
                                        <Icon className={cn("w-4 h-4", isActive ? opt.activeIconClass : "text-slate-300")} />
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
                <div className="absolute bottom-6 left-6 right-6">
                    <SheetClose asChild>
                        <button className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-fredoka font-black text-lg shadow-clay-indigo hover:translate-y-[1px] transition-all">
                            Show Stories
                        </button>
                    </SheetClose>
                </div>
            </SheetContent>
        </Sheet>
    );
}
