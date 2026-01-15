"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, History, Search, Filter, X, LayoutGrid, Heart, Wand2 } from "lucide-react";
import { cn } from "@/lib/core/utils/cn";
import { useState, useRef, useEffect } from "react";
import { CachedImage } from "@/components/ui/cached-image";
import { WordCategory, GroupBy } from "../hooks/useMyWordsV2ViewModel";

interface MyWordsToolbarProps {
    activeChild?: any;
    viewType: "words" | "history";
    setViewType: (v: "words" | "history") => void;
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    activeCategory: WordCategory;
    setCategory: (c: WordCategory) => void;
    groupBy: GroupBy;
    setGroupBy: (g: GroupBy) => void;
}

export function MyWordsToolbar({
    activeChild,
    viewType,
    setViewType,
    searchQuery,
    setSearchQuery,
    activeCategory,
    setCategory,
    groupBy,
    setGroupBy
}: MyWordsToolbarProps) {
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [isFilterExpanded, setIsFilterExpanded] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isSearchExpanded && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isSearchExpanded]);

    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4">
            <div className="backdrop-blur-xl bg-white/90 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.04)] border border-white/80 ring-1 ring-slate-200/30 rounded-full px-2 py-2 flex items-center justify-between gap-2 overflow-hidden transition-all duration-500">
                
                {/* Child Avatar */}
                <div className="shrink-0 ml-1">
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm bg-slate-100">
                        {activeChild?.avatar_url ? (
                            <CachedImage
                                src={activeChild.avatar_url}
                                storagePath={activeChild.storage_path}
                                alt={activeChild.name}
                                width={40}
                                height={40}
                                bucket="user-assets"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                                👶
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Controls Wrapper */}
                <div className="flex-1 flex items-center justify-center gap-1 min-w-0">
                    <AnimatePresence mode="wait">
                        {isSearchExpanded ? (
                            <motion.div
                                key="search-area"
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: "100%", opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                className="flex items-center gap-2 px-2 w-full"
                            >
                                <Search className="w-4 h-4 text-slate-400" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search words..."
                                    className="bg-transparent border-none outline-none font-nunito font-bold text-sm text-ink placeholder:text-slate-400 w-full"
                                />
                                <button 
                                    onClick={() => {
                                        setIsSearchExpanded(false);
                                        setSearchQuery("");
                                    }}
                                    className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                                >
                                    <X className="w-4 h-4 text-slate-400" />
                                </button>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="tools-area"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center gap-1 sm:gap-4"
                            >
                                {/* Find Button (Words View) */}
                                <button
                                    onClick={() => setViewType("words")}
                                    className={cn(
                                        "flex items-center gap-2 px-6 py-2.5 rounded-full font-fredoka font-bold transition-all duration-300",
                                        viewType === "words"
                                            ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-200"
                                            : "hover:bg-slate-50 text-slate-400"
                                    )}
                                >
                                    <Sparkles className={cn("w-5 h-5", viewType === "words" ? "text-white" : "text-slate-400")} />
                                    <span className="hidden sm:inline">Find</span>
                                </button>

                                {/* Magic History Toggle */}
                                <button
                                    onClick={() => setViewType("history")}
                                    className={cn(
                                        "p-2.5 rounded-full transition-all duration-300",
                                        viewType === "history"
                                            ? "bg-purple-50 text-purple-600"
                                            : "text-slate-400 hover:bg-slate-50"
                                    )}
                                    title="Magic History"
                                >
                                    <Wand2 className="w-5 h-5" />
                                </button>

                                {/* Favorites? (Placeholer for now as per screenshot layout) */}
                                <button className="p-2.5 rounded-full text-slate-300 hover:bg-slate-50 cursor-not-allowed hidden sm:block">
                                    <Heart className="w-5 h-5" />
                                </button>

                                <div className="hidden sm:block w-px h-6 bg-slate-100 mx-1" />

                                {/* Grouping Toggle */}
                                <div className="flex items-center gap-0.5 sm:gap-1">
                                    <button 
                                        onClick={() => setIsSearchExpanded(true)}
                                        className="p-2.5 rounded-full text-slate-400 hover:bg-slate-50 transition-all"
                                        title="Search"
                                    >
                                        <Search className="w-5 h-5" />
                                    </button>

                                    <button 
                                        onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                                        className={cn(
                                            "p-2.5 rounded-full transition-all",
                                            isFilterExpanded ? "bg-purple-50 text-purple-600" : "text-slate-400 hover:bg-slate-50"
                                        )}
                                        title="Filter & Group"
                                    >
                                        <Filter className="w-5 h-5" />
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Expanded Filters Popover */}
            <AnimatePresence>
                {isFilterExpanded && (
                    <motion.div
                        initial={{ y: -20, opacity: 0, scale: 0.95 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: -20, opacity: 0, scale: 0.95 }}
                        className="absolute top-20 left-4 right-4 bg-white/95 backdrop-blur-xl border border-white shadow-2xl rounded-[2rem] p-6 z-40"
                    >
                        <div className="space-y-6">
                            {/* Category Selection */}
                            <div>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Categories</h4>
                                <div className="flex gap-2 flex-wrap">
                                    {[
                                        { id: "all", label: "All Words", icon: "🌈" },
                                        { id: "new", label: "New", icon: "✨" },
                                        { id: "review", label: "Ready", icon: "⭐" },
                                    ].map((cat) => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setCategory(cat.id as WordCategory)}
                                            className={cn(
                                                "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                                                activeCategory === cat.id
                                                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                                                    : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                                            )}
                                        >
                                            <span className="mr-2">{cat.icon}</span>
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Grouping Selection */}
                            <div>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Group By</h4>
                                <div className="flex gap-2 flex-wrap">
                                    {[
                                        { id: "none", label: "List", icon: "📦" },
                                        { id: "date", label: "Date", icon: "📅" },
                                        { id: "book", label: "Book", icon: "📖" },
                                        { id: "proficiency", label: "Skill", icon: "🏆" },
                                    ].map((g) => (
                                        <button
                                            key={g.id}
                                            onClick={() => setGroupBy(g.id as GroupBy)}
                                            className={cn(
                                                "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                                                groupBy === g.id
                                                    ? "bg-purple-600 text-white shadow-md shadow-purple-100"
                                                    : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                                            )}
                                        >
                                            <span className="mr-2">{g.icon}</span>
                                            {g.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={() => setIsFilterExpanded(false)}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
