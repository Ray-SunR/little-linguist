"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, Check, X, GraduationCap, Shapes, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/core";
import { getClayClass } from "@/lib/clay-utils";
import * as Popover from "@radix-ui/react-popover"; // Using radix for accessible popovers
import Image from "next/image";

interface LibraryFiltersProps {
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    filters: {
        level?: string;
        type?: "fiction" | "nonfiction";
        origin?: string;
        category?: string;
    };
    onFiltersChange: (newFilters: any) => void;
    sortBy: string;
    onSortChange: (sort: string) => void;
    activeCategory: string;
    onCategoryChange: (cat: string) => void;
}

const CATEGORIES = [
    { id: "all", label: "All Stories", iconPath: "/assets/icons/clay-star.png", color: "purple" },
    { id: "my-stories", label: "My Stories", iconPath: "/assets/icons/clay-compass.png", color: "blue" },
    { id: "adventure", label: "Adventures", iconPath: "/assets/icons/clay-rocket.png", color: "orange" },
    { id: "fantasy", label: "Magic & Fantasy", iconPath: "/assets/icons/clay-wand.png", color: "pink" },
    { id: "learning", label: "Learning", iconPath: "/assets/icons/clay-book.png", color: "green" },
    { id: "favorites", label: "Favorites", iconPath: "/assets/icons/clay-heart.png", color: "red" },
];

export function LibraryFilters({
    searchQuery,
    setSearchQuery,
    filters,
    onFiltersChange,
    sortBy,
    onSortChange,
    activeCategory,
    onCategoryChange
}: LibraryFiltersProps) {

    // Helper to render a "Clay" Popover Trigger
    const FilterPill = ({ 
        label, 
        icon,
        isActive, 
        compact,
        children 
    }: { 
        label: string, 
        icon?: React.ReactNode,
        isActive: boolean, 
        compact?: boolean,
        children: React.ReactNode 
    }) => {
        const [isOpen, setIsOpen] = useState(false);
        
        return (
             <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
                <Popover.Trigger asChild>
                    <button
                        className={cn(
                            getClayClass({ 
                                color: isActive ? "purple" : "white", 
                                intensity: isActive ? "medium" : "low" 
                            }),
                            "flex items-center gap-2 font-fredoka font-bold text-slate-600 transition-all hover:scale-105",
                            compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
                        )}
                    >
                        {icon && <span>{icon}</span>}
                        <span>{label}</span>
                        <ChevronDown className={cn("w-3 h-3 transition-transform opacity-50", isOpen && "rotate-180")} />
                    </button>
                </Popover.Trigger>
                <Popover.Portal>
                    <Popover.Content 
                        className="z-50 p-1.5 min-w-[160px] bg-white rounded-xl shadow-xl border-2 border-purple-50 animate-in fade-in zoom-in-95 duration-200 focus:outline-none"
                        sideOffset={8}
                    >
                        <div className="flex flex-col gap-1">
                            {children}
                        </div>
                        <Popover.Arrow className="fill-purple-50" />
                    </Popover.Content>
                </Popover.Portal>
            </Popover.Root>
        );
    };

    return (
        <div className="w-full flex flex-col gap-6 relative z-30">
            {/* Top Row: Search & Active Category Title (Mobile) or just Search */}
            <div className="flex flex-col md:flex-row gap-4 items-center">
                {/* Clay Search Bar */}
                <div className="relative w-full md:max-w-md group">
                   <div 
                        className={cn(
                            "absolute inset-0 rounded-2xl bg-slate-200", 
                            "shadow-clay-inset" // Deep inset shadow
                        )} 
                    />
                   <div className="relative flex items-center px-4 h-12 md:h-14">
                        <Search className="w-5 h-5 text-slate-400 mr-3 group-focus-within:text-purple-500 transition-colors" />
                        <input 
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Find a story..."
                            className="w-full bg-transparent border-none outline-none font-fredoka font-bold text-slate-600 placeholder:text-slate-400 text-lg"
                        />
                         {searchQuery && (
                            <button 
                                onClick={() => setSearchQuery("")}
                                className="p-1 rounded-full hover:bg-slate-200/50 text-slate-400"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                   </div>
                </div>
            </div>

            {/* Filter "Dock" / Row */}
            <div className="flex flex-wrap items-center gap-2 p-2 rounded-[1.5rem] bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-clay-lg max-w-fit">
                {/* Level Filter */}
                <FilterPill 
                    label="Level"
                    icon={<GraduationCap className={cn("w-4 h-4", filters.level ? "text-purple-600" : "text-slate-400")} />}
                    isActive={!!filters.level}
                    compact={true}
                >
                    {["Pre-K", "K", "G1-2", "G3-5"].map(lvl => (
                        <button
                            key={lvl}
                            onClick={() => onFiltersChange({ ...filters, level: filters.level === lvl ? undefined : lvl })}
                            className={cn(
                                "w-full text-left px-3 py-1.5 rounded-lg font-fredoka font-semibold text-xs transition-colors flex items-center justify-between gap-3",
                                filters.level === lvl ? "bg-purple-100 text-purple-700" : "hover:bg-slate-50 text-slate-500"
                            )}
                        >
                            {lvl}
                            {filters.level === lvl && <Check className="w-3 h-3" />}
                        </button>
                    ))}
                </FilterPill>

                {/* Type Filter */}
                <FilterPill 
                    label="Type" 
                    icon={<Shapes className={cn("w-4 h-4", filters.type ? "text-pink-600" : "text-slate-400")} />}
                    isActive={!!filters.type}
                    compact={true}
                >
                     {[
                        { id: "fiction", label: "Fiction" },
                        { id: "nonfiction", label: "Non-fiction" }
                     ].map(opt => (
                        <button
                            key={opt.id}
                            onClick={() => onFiltersChange({ ...filters, type: filters.type === opt.id ? undefined : opt.id })}
                            className={cn(
                                "w-full text-left px-3 py-1.5 rounded-lg font-fredoka font-semibold text-xs transition-colors flex items-center justify-between gap-3",
                                filters.type === opt.id ? "bg-pink-100 text-pink-700" : "hover:bg-slate-50 text-slate-500"
                            )}
                        >
                            {opt.label}
                            {filters.type === opt.id && <Check className="w-3 h-3" />}
                        </button>
                    ))}
                </FilterPill>

                {/* Sort Filter */}
                <FilterPill 
                    label="Sort" 
                    icon={<ArrowUpDown className={cn("w-4 h-4", sortBy !== "newest" ? "text-blue-600" : "text-slate-400")} />}
                    isActive={sortBy !== "newest"}
                    compact={true}
                >
                     {[
                        { id: "newest", label: "Newest First" },
                        { id: "alphabetical", label: "Title (A-Z)" },
                        { id: "reading_time", label: "Shortest Read" }
                     ].map(opt => (
                        <button
                            key={opt.id}
                            onClick={() => onSortChange(opt.id)}
                            className={cn(
                                "w-full text-left px-3 py-1.5 rounded-lg font-fredoka font-semibold text-xs transition-colors flex items-center justify-between gap-3",
                                sortBy === opt.id ? "bg-blue-100 text-blue-700" : "hover:bg-slate-50 text-slate-500"
                            )}
                        >
                            {opt.label}
                            {sortBy === opt.id && <Check className="w-3 h-3" />}
                        </button>
                    ))}
                </FilterPill>
                
                 {/* Clear All */}
                 {(filters.level || filters.type || filters.origin || sortBy !== "newest") && (
                    <button
                        onClick={() => {
                            onFiltersChange({});
                            onSortChange("newest");
                        }}
                        className="text-[10px] font-bold text-slate-500 hover:text-red-500 px-2 transition-colors uppercase tracking-wider bg-white/50 py-1.5 rounded-full"
                    >
                        Clear
                    </button>
                 )}
            </div>

            {/* Category Quick-Select (Horizontal Scroll with Clay Icons) */}
            <div className="w-full overflow-x-auto pb-4 pt-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
                 <div className="flex gap-4 min-w-max">
                    {CATEGORIES.map((cat) => {
                        const isSelected = activeCategory === cat.id;

                        return (
                            <button
                                key={cat.id}
                                onClick={() => {
                                    onCategoryChange(cat.id);
                                     // Deep integration: modify filter object too
                                    if (cat.id === "all") onFiltersChange({ ...filters, category: undefined });
                                    else if (cat.id === "my-stories") onFiltersChange({ ...filters, category: undefined, origin: "user_generated" }); // Special case for "My Stories" usually
                                    else onFiltersChange({ ...filters, origin: undefined, category: cat.id });
                                }}
                                className={cn(
                                    "group relative flex flex-col items-center gap-2 p-2 rounded-xl transition-all duration-300",
                                     isSelected ? "scale-105" : "hover:scale-105 opacity-70 hover:opacity-100"
                                )}
                            >
                                <div className={cn(
                                    "w-16 h-16 md:w-20 md:h-20 flex items-center justify-center rounded-[1.5rem] transition-all duration-300",
                                    getClayClass({ shape: "circle", color: isSelected ? cat.color as any : "white", intensity: isSelected ? "high" : "medium" }),
                                    !isSelected && "bg-white"
                                )}>
                                    <div className="relative w-10 h-10 md:w-12 md:h-12 drop-shadow-lg">
                                        <Image 
                                            src={cat.iconPath} 
                                            alt={cat.label}
                                            fill
                                            className="object-contain"
                                        />
                                    </div>
                                </div>
                                <span className={cn(
                                    "text-xs md:text-sm font-bold font-fredoka transition-colors",
                                    isSelected ? "text-slate-800" : "text-slate-500"
                                )}>
                                    {cat.label}
                                </span>
                            </button>
                        );
                    })}
                 </div>
            </div>
        </div>
    );
}
