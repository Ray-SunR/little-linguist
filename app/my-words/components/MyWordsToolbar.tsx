"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Wand2, Sparkles, Filter, LayoutGrid, ArrowUpDown, Search, X, ChevronDown, History, Heart, Calendar } from "lucide-react";
import { cn } from "@/lib/core";
import { useState, useRef, useEffect } from "react";
import { type ChildProfile } from "@/app/actions/profiles";
import { WordCategory, GroupBy } from "../hooks/useMyWordsV2ViewModel";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface MyWordsToolbarProps {
    activeChild: ChildProfile | null;
    viewType: "words" | "history";
    setViewType: (v: "words" | "history") => void;
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    activeCategory: WordCategory;
    setCategory: (c: WordCategory) => void;
    groupBy: GroupBy;
    setGroupBy: (g: GroupBy) => void;
    sortBy: 'createdAt' | 'word' | 'reps';
    setSortBy: (s: 'createdAt' | 'word' | 'reps') => void;
    sortOrder: 'asc' | 'desc';
    setSortOrder: (o: 'asc' | 'desc') => void;
    startDate?: string;
    setStartDate: (d: string | undefined) => void;
    endDate?: string;
    setEndDate: (d: string | undefined) => void;
    totalWords?: number;
    isSelectionMode?: boolean;
    onToggleSelectionMode?: () => void;
    className?: string;
}

import { PageToolbar } from "@/components/layout/page-toolbar";

export function MyWordsToolbar({
    activeChild,
    viewType,
    setViewType,
    searchQuery,
    setSearchQuery,
    activeCategory,
    setCategory,
    groupBy,
    setGroupBy,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    totalWords = 0,
    isSelectionMode = false,
    onToggleSelectionMode,
    className
}: MyWordsToolbarProps) {
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [isAdvancedDateOpen, setIsAdvancedDateOpen] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const categories: { id: WordCategory; label: string; icon: any }[] = [
        { id: "all", label: "All Words", icon: Sparkles },
        { id: "learning", label: "Learning", icon: Sparkles },
        { id: "reviewing", label: "Reviewing", icon: Sparkles },
        { id: "mastered", label: "Mastered", icon: Heart },
    ];

    const currentCategory = categories.find(c => c.id === activeCategory) || categories[0];

    useEffect(() => {
        if (isSearchExpanded && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isSearchExpanded]);

    return (
        <PageToolbar
            activeChild={activeChild ? {
                id: activeChild.id,
                name: activeChild.first_name,
                avatar_url: activeChild.avatar_asset_path
            } : null}
            themeColor="violet"
            className={className}
        >
            <AnimatePresence mode="wait">
                {!isSearchExpanded ? (
                    <motion.div
                        key="controls"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="flex items-center gap-1.5 md:gap-2 flex-1 min-w-0"
                    >
                        {/* Compact tabs */}
                        <div className="flex items-center gap-0.5 md:gap-1 pl-1 md:pl-0">
                            <button
                                onClick={() => setViewType("words")}
                                className={cn(
                                    "relative px-3 py-2 md:px-5 md:py-2.5 rounded-xl font-fredoka text-sm font-black transition-all duration-300 flex items-center gap-2 outline-none group",
                                    viewType === "words"
                                        ? "text-violet-600 bg-violet-50/50"
                                        : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                <Sparkles className={cn("w-4 h-4 md:w-5 md:h-5", viewType === "words" ? "text-violet-600" : "text-slate-300 group-hover:text-slate-400")} />
                                <span className="hidden sm:inline">Words</span>
                                {viewType === "words" && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 rounded-xl border-2 border-violet-200/50 pointer-events-none"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                            </button>

                            <button
                                onClick={() => setViewType("history")}
                                className={cn(
                                    "relative px-3 py-2 md:px-5 md:py-2.5 rounded-xl font-fredoka text-sm font-black transition-all duration-300 flex items-center gap-2 outline-none group",
                                    viewType === "history"
                                        ? "text-indigo-600 bg-indigo-50/50"
                                        : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                <History className={cn("w-4 h-4 md:w-5 md:h-5", viewType === "history" ? "text-indigo-600" : "text-slate-300 group-hover:text-slate-400")} />
                                <span className="hidden sm:inline">History</span>
                                {viewType === "history" && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 rounded-xl border-2 border-indigo-200/50 pointer-events-none"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                            </button>
                        </div>

                        <div className="ml-auto flex items-center gap-1 md:gap-2">
                            {/* Selection Mode Toggle */}
                            {viewType === "words" && (
                                <button
                                    onClick={onToggleSelectionMode}
                                    className={cn(
                                        "flex items-center gap-2 px-2 py-2 md:px-3 md:py-2 rounded-xl border transition-all outline-none text-xs font-black font-fredoka",
                                        isSelectionMode 
                                            ? "bg-violet-600 text-white border-violet-500 shadow-clay-violet" 
                                            : "bg-violet-50/80 border-violet-100 text-violet-600 hover:bg-violet-100"
                                    )}
                                >
                                    <Wand2 className={cn("w-3.5 h-3.5", isSelectionMode ? "text-white" : "text-violet-600")} />
                                    <span className="hidden md:inline">{isSelectionMode ? "Finish Selecting" : "Magic Select"}</span>
                                </button>
                            )}

                            {/* Desktop-like search trigger */}
                            <button
                                onClick={() => setIsSearchExpanded(true)}
                                className="p-2 md:p-2.5 rounded-xl text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                            >
                                <Search className="w-5 h-5" />
                            </button>

                            {/* Category Dropdown (Filter) */}
                            {viewType === "words" && (
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <button
                                            className="flex items-center gap-2 px-2 py-2 md:px-3 md:py-2 rounded-xl bg-slate-50/80 hover:bg-white text-slate-600 text-xs font-black font-fredoka border border-slate-100 shadow-sm transition-all outline-none"
                                        >
                                            <Filter className="w-3.5 h-3.5 text-violet-500" />
                                            <span className="hidden md:inline">Filter: {currentCategory.label}</span>
                                            <ChevronDown className="w-3 h-3 opacity-50" />
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-48 p-2 rounded-2xl border-none shadow-2xl bg-white/95 backdrop-blur-xl z-[110]">
                                        <div className="grid gap-1">
                                            {categories.map((cat) => (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => setCategory(cat.id)}
                                                    className={cn(
                                                        "flex items-center gap-3 w-full px-3 py-2 rounded-xl text-xs font-black font-fredoka transition-all outline-none",
                                                        activeCategory === cat.id
                                                            ? "bg-violet-50 text-violet-600"
                                                            : "text-slate-600 hover:bg-slate-50"
                                                    )}
                                                >
                                                    <cat.icon className={cn("w-3.5 h-3.5", activeCategory === cat.id ? "text-violet-600" : "text-slate-400")} />
                                                    {cat.label}
                                                </button>
                                            ))}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            )}

                            {/* GroupBy Dropdown with Integrated Date Filter */}
                            {viewType === "words" && (
                                <Popover onOpenChange={(open) => {
                                    if (!open) setIsAdvancedDateOpen(false);
                                }}>
                                    <PopoverTrigger asChild>
                                        <button
                                            className={cn(
                                                "flex items-center gap-2 px-2 py-2 md:px-3 md:py-2 rounded-xl border transition-all outline-none text-xs font-black font-fredoka",
                                                groupBy !== "none" || startDate || endDate
                                                    ? "bg-amber-50 border-amber-100 text-amber-600" 
                                                    : "bg-slate-50/80 border-slate-100 text-slate-600 hover:bg-white"
                                            )}
                                        >
                                            <LayoutGrid className="w-3.5 h-3.5" />
                                            <span className="hidden md:inline">
                                                {startDate || endDate ? "Custom Date Range" : `Group: ${groupBy === 'none' ? 'None' : groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}`}
                                            </span>
                                            <ChevronDown className="w-3 h-3 opacity-50" />
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent 
                                        className="w-64 p-2 rounded-3xl border-none shadow-2xl bg-white/95 backdrop-blur-xl z-[110] overflow-hidden"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <AnimatePresence>
                                            {!isAdvancedDateOpen ? (
                                                <motion.div 
                                                    key="group-list"
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: -10 }}
                                                    className="grid gap-1"
                                                >
                                                    {[
                                                        { id: 'none', label: 'No Grouping', icon: X },
                                                        { id: 'date', label: 'By Date', icon: History, hasAdvanced: true },
                                                        { id: 'book', label: 'By Book', icon: Wand2 },
                                                        { id: 'proficiency', label: 'By Level', icon: Sparkles }
                                                    ].map((g) => (
                                                        <div key={g.id} className="flex flex-col gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setGroupBy(g.id as any);
                                                                    if (g.id !== 'date') {
                                                                        setStartDate(undefined);
                                                                        setEndDate(undefined);
                                                                    }
                                                                }}
                                                                className={cn(
                                                                    "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-xs font-black font-fredoka transition-all outline-none group",
                                                                    groupBy === g.id
                                                                        ? "bg-amber-50 text-amber-600"
                                                                        : "text-slate-600 hover:bg-slate-50"
                                                                )}
                                                            >
                                                                <g.icon className={cn("w-3.5 h-3.5", groupBy === g.id ? "text-amber-600" : "text-slate-400 group-hover:text-slate-500")} />
                                                                <span className="flex-1 text-left">{g.label}</span>
                                                                {groupBy === g.id && g.id === 'date' && (
                                                                    <Calendar className="w-3 h-3 opacity-50" />
                                                                )}
                                                            </button>
                                                            {groupBy === 'date' && g.id === 'date' && (
                                                                <button 
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setIsAdvancedDateOpen(true);
                                                                    }}
                                                                    className="mx-2 mb-1 py-1.5 px-3 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-emerald-100 transition-colors"
                                                                >
                                                                    <Calendar className="w-3 h-3" />
                                                                    {(startDate || endDate) ? "Edit Custom Range" : "Advanced: Custom Range"}
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </motion.div>
                                            ) : (
                                                <motion.div 
                                                    key="date-range"
                                                    initial={{ opacity: 0, x: 10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: 10 }}
                                                    className="p-2 space-y-4"
                                                >
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <button 
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setIsAdvancedDateOpen(false);
                                                            }}
                                                            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                                                        >
                                                            <X className="w-4 h-4 text-slate-400" />
                                                        </button>
                                                        <span className="text-xs font-black font-fredoka text-slate-600">Custom Date Range</span>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div className="flex flex-col gap-1.5">
                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">From</label>
                                                            <div className="relative">
                                                                <input 
                                                                    type="date" 
                                                                    value={startDate || ""}
                                                                    onPointerDown={(e) => e.stopPropagation()}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    onChange={(e) => setStartDate(e.target.value || undefined)}
                                                                    className="w-full bg-slate-100/50 border-2 border-transparent focus:border-emerald-200 rounded-xl px-3 py-2 text-sm font-bold font-nunito outline-none transition-all"
                                                                />
                                                                {startDate && (
                                                                    <button 
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setStartDate(undefined);
                                                                        }} 
                                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col gap-1.5">
                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Until</label>
                                                            <div className="relative">
                                                                <input 
                                                                    type="date" 
                                                                    value={endDate || ""}
                                                                    onPointerDown={(e) => e.stopPropagation()}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    onChange={(e) => setEndDate(e.target.value || undefined)}
                                                                    className="w-full bg-slate-100/50 border-2 border-transparent focus:border-emerald-200 rounded-xl px-3 py-2 text-sm font-bold font-nunito outline-none transition-all"
                                                                />
                                                                {endDate && (
                                                                    <button 
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setEndDate(undefined);
                                                                        }} 
                                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 pt-2">
                                                        {(startDate || endDate) && (
                                                            <button 
                                                                type="button"
                                                                onClick={(e) => { 
                                                                    e.stopPropagation();
                                                                    setStartDate(undefined); 
                                                                    setEndDate(undefined); 
                                                                    setIsAdvancedDateOpen(false); 
                                                                }}
                                                                className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black font-fredoka uppercase tracking-wider hover:bg-slate-200 transition-colors"
                                                            >
                                                                Reset
                             </button>
                                                        )}
                                                        <button 
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setIsAdvancedDateOpen(false);
                                                            }}
                                                            className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black font-fredoka uppercase tracking-wider shadow-clay-sm hover:translate-y-[1px] transition-all"
                                                        >
                                                            Done
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </PopoverContent>
                                </Popover>
                            )}

                            {/* Sort Dropdown */}

                            {/* Sort Dropdown */}
                            {viewType === "words" && (
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <button
                                            className="flex items-center gap-2 px-2 py-2 md:px-3 md:py-2 rounded-xl bg-slate-50/80 hover:bg-white text-slate-600 text-xs font-black font-fredoka border border-slate-100 shadow-sm transition-all outline-none"
                                        >
                                            <ArrowUpDown className="w-3.5 h-3.5 text-indigo-500" />
                                            <span className="hidden md:inline">Sort</span>
                                            <ChevronDown className="w-3 h-3 opacity-50" />
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-48 p-2 rounded-2xl border-none shadow-2xl bg-white/95 backdrop-blur-xl z-[110]">
                                        <div className="grid gap-1">
                                            {[
                                                { id: 'createdAt', label: 'Recent First' },
                                                { id: 'word', label: 'Alphabetical' },
                                                { id: 'reps', label: 'Proficiency' }
                                            ].map((s) => (
                                                <button
                                                    key={s.id}
                                                    onClick={() => setSortBy(s.id as any)}
                                                    className={cn(
                                                        "flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-black font-fredoka transition-all outline-none",
                                                        sortBy === s.id ? "bg-indigo-50 text-indigo-600" : "text-slate-600 hover:bg-slate-50"
                                                    )}
                                                >
                                                    <span>{s.label}</span>
                                                    {sortBy === s.id && (
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                                            }}
                                                            className="p-1 hover:bg-indigo-100 rounded-md transition-colors"
                                                        >
                                                            <ChevronDown className={cn("w-3 h-3 transition-transform", sortOrder === 'asc' && "rotate-180")} />
                                                        </button>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            )}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="search"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex-1 flex items-center"
                    >
                        <div className="relative w-full group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-violet-500 transition-colors" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search your treasury..."
                                className="w-full bg-slate-100/50 border-none rounded-xl py-2.5 pl-10 pr-10 text-sm font-black font-nunito focus:ring-2 focus:ring-violet-200 transition-all outline-none"
                            />
                            <button
                                onClick={() => {
                                    setIsSearchExpanded(false);
                                    setSearchQuery("");
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </PageToolbar>
    );
}
