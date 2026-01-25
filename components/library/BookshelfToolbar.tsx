"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/core";
import {
    Search,
    BookOpen,
    ArrowUpDown,
    Rocket,
    Wand2,
    Heart,
    LayoutGrid,
    Clock,
    Cloud,
    Scroll,
    Gamepad2,
    Eye,
    Crown,
    Leaf,
    FlaskConical,
    Snowflake,
    Trophy,
    Zap,
    Car,
    Sparkles,
    Filter,
    Baby,
    Microscope,
    Play,
    Flame,
    Palette,
    X,
    LucideIcon
} from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetClose,
} from "@/components/ui/sheet";

import { PageToolbar } from "@/components/layout/page-toolbar";

// --- Shared Constants (Move to shared file in future cleanup) ---
const CATEGORIES = [
    { id: "all", label: "All Stories", icon: LayoutGrid, iconClass: "text-purple-600 fill-purple-100" },
    { id: "animals", label: "Animals", icon: Cloud, iconClass: "text-orange-500 fill-orange-100" },
    { id: "dinosaurs", label: "Dinosaurs", icon: Sparkles, iconClass: "text-emerald-600 fill-emerald-100" },
    { id: "fantasy", label: "Fantasy", icon: Wand2, iconClass: "text-purple-500 fill-purple-100" },
    { id: "friendship", label: "Friendship", icon: Heart, iconClass: "text-pink-500 fill-pink-100" },
    { id: "history", label: "History", icon: Scroll, iconClass: "text-yellow-600 fill-yellow-100" },
    { id: "minecraft", label: "Minecraft", icon: Gamepad2, iconClass: "text-green-600/90 fill-green-100" },
    { id: "mystery", label: "Mystery", icon: Eye, iconClass: "text-indigo-600 fill-indigo-100" },
    { id: "mythology", label: "Mythology", icon: Crown, iconClass: "text-amber-600 fill-amber-100" },
    { id: "nature", label: "Nature", icon: Leaf, iconClass: "text-green-500 fill-green-100" },
    { id: "science", label: "Science", icon: FlaskConical, iconClass: "text-blue-500 fill-blue-100" },
    { id: "seasonal", label: "Seasonal", icon: Snowflake, iconClass: "text-sky-400 fill-sky-100" },
    { id: "space", label: "Space", icon: Rocket, iconClass: "text-indigo-500 fill-indigo-100" },
    { id: "sports", label: "Sports", icon: Trophy, iconClass: "text-orange-500 fill-orange-100" },
    { id: "superheroes", label: "Superheroes", icon: Zap, iconClass: "text-yellow-500 fill-yellow-100" },
    { id: "vehicles", label: "Vehicles", icon: Car, iconClass: "text-red-500 fill-red-100" },
];

const COLLECTIONS = [
    {
        id: "discovery",
        label: "Discovery",
        icon: Sparkles,
        theme: "from-purple-500 to-blue-500",
        bg: "bg-purple-50",
        text: "text-purple-600",
        border: "border-purple-100"
    },
    {
        id: "browse",
        label: "Browse All",
        icon: BookOpen,
        theme: "from-blue-500 to-indigo-500",
        bg: "bg-blue-50",
        text: "text-blue-600",
        border: "border-blue-100"
    },
    {
        id: "my-tales",
        label: "My Tales",
        icon: Wand2,
        theme: "from-rose-400 to-purple-500",
        bg: "bg-rose-50",
        text: "text-rose-600",
        border: "border-rose-100"
    },
    {
        id: "favorites",
        label: "Favorites",
        icon: Heart,
        theme: "from-amber-400 to-rose-500",
        bg: "bg-amber-50",
        text: "text-amber-600",
        border: "border-amber-100"
    },
] as const;

interface BookshelfToolbarProps {
    searchQuery: string;
    onSearchChange: (val: string) => void;
    filters: {
        level?: string;
        type?: "fiction" | "nonfiction";
        duration?: string;
        collection?: "discovery" | "my-tales" | "favorites" | "browse";
        category?: string;
    };
    onFilterChange: (key: string, val: any) => void;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    onSortChange: (val: string) => void;
    onSortOrderChange: (val: 'asc' | 'desc') => void;
    className?: string;
    currentUserId?: string | null;
    activeChild?: { id: string; name: string; avatar_url?: string | null } | null;
    totalStories?: number;
}

export function BookshelfToolbar({
    searchQuery,
    onSearchChange,
    filters,
    onFilterChange,
    sortBy,
    sortOrder,
    onSortChange,
    onSortOrderChange,
    className,
    currentUserId,
    activeChild,
    totalStories = 0
}: BookshelfToolbarProps) {
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);

    const visibleCollections = currentUserId
        ? COLLECTIONS
        : COLLECTIONS.filter(c => c.id === 'discovery');

    const activeCollection = filters.collection || 'discovery';
    const activeCategory = filters.category || 'all';

    // Find active category object for label/icon
    const selectedCategoryObj = CATEGORIES.find(c => c.id === activeCategory) || CATEGORIES[0];
    const CategoryIcon = selectedCategoryObj.icon;

    const onCollectionChange = (id: string) => onFilterChange("collection", id);

    const COLLECTION_THEMES = {
        discovery: "bg-gradient-to-r from-violet-600 to-indigo-600 shadow-lg shadow-indigo-200/50",
        browse: "bg-gradient-to-r from-blue-500 to-indigo-500",
        "my-tales": "bg-gradient-to-r from-rose-400 to-purple-500",
        favorites: "bg-gradient-to-r from-amber-400 to-pink-500"
    };



    return (
        <PageToolbar
            id="library-filters"
            data-tour-target="library-filters"
            activeChild={activeChild ? {
                id: activeChild.id,
                name: activeChild.name,
                avatar_url: activeChild.avatar_url
            } : null}
            themeColor="indigo"
            className={className}
            isSearchExpanded={isSearchExpanded}
        >
            <AnimatePresence mode="wait">
                {!isSearchExpanded ? (
                    <motion.div
                        key="controls"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="flex items-center justify-between w-full min-w-0"
                    >
                        {/* LEFT & CENTER: Descriptive Navigation (Fills the space) */}
                        <div className="flex items-center gap-2 md:gap-4 min-w-0">
                            {/* Tabs & Category Dropdown Wrapper */}
                            <div className="flex items-center min-w-0 gap-1.5 md:gap-2 flex-1">
                                {/* Compact tabs */}
                                <div className="flex items-center gap-0.5 md:gap-1 pl-1 md:pl-0">
                                    {visibleCollections.map((col) => {
                                        const Icon = col.icon;
                                        const isActive = activeCollection === col.id;
                                        const activeTheme = COLLECTION_THEMES[col.id as keyof typeof COLLECTION_THEMES];
                                        const isMultipleTabs = visibleCollections.length > 1;

                                        return (
                                            <button
                                                key={col.id}
                                                onClick={() => onCollectionChange(col.id)}
                                                className={cn(
                                                    "relative flex items-center justify-center font-fredoka font-bold text-sm transition-all duration-300 py-2 rounded-full",
                                                    isActive
                                                        ? `${activeTheme} text-white shadow-lg shadow-purple-200/50 scale-105 z-10 px-3 md:px-4`
                                                        : "text-purple-400 bg-purple-50/30 hover:text-purple-600 hover:bg-purple-50/50 px-2 md:px-3",
                                                    !isMultipleTabs && "px-4"
                                                )}
                                                title={col.label}
                                            >
                                                <Icon className={cn("w-4 h-4 flex-shrink-0 transition-transform", isActive && "scale-110")} />

                                                <AnimatePresence initial={false}>
                                                    {(isActive || !isMultipleTabs) && (
                                                        <motion.span
                                                            initial={{ width: 0, opacity: 0, marginLeft: 0 }}
                                                            animate={{ width: "auto", opacity: 1, marginLeft: 8 }}
                                                            exit={{ width: 0, opacity: 0, marginLeft: 0 }}
                                                            transition={{ duration: 0.3, ease: "easeOut" }}
                                                            className="hidden lg:inline overflow-hidden whitespace-nowrap text-xs md:text-sm"
                                                        >
                                                            {col.label}
                                                        </motion.span>
                                                    )}
                                                </AnimatePresence>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Desktop Filters Group (Now includes Category) */}
                                <div className="hidden lg:flex items-center gap-2 ml-2 border-l border-purple-100 pl-3">
                                    {/* Category Dropdown (Filter) */}
                                    <Popover open={isCategoryOpen} onOpenChange={setIsCategoryOpen}>
                                        <PopoverTrigger asChild>
                                            <button
                                                className={cn(
                                                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold font-fredoka transition-all outline-none border active:scale-95",
                                                    activeCategory !== 'all'
                                                        ? "bg-purple-50 border-purple-100 text-purple-600 shadow-purple-100/30 shadow-sm"
                                                        : "bg-purple-50/30 border-purple-100/50 text-purple-600/70 hover:bg-purple-50 hover:text-purple-600 shadow-sm"
                                                )}
                                            >
                                                <CategoryIcon className={cn("w-3.5 h-3.5", activeCategory !== 'all' ? "text-purple-600" : "text-purple-400")} />
                                                <span>
                                                    {activeCategory === 'all' ? 'Everywhere' : selectedCategoryObj.label}
                                                </span>
                                            </button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            className="w-[480px] p-4 rounded-3xl border-none shadow-2xl bg-white/95 backdrop-blur-xl z-[110]"
                                            align="start"
                                        >
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between px-1">
                                                    <h3 className="font-fredoka font-black text-slate-400 text-[10px] uppercase tracking-widest flex items-center gap-2">
                                                        <Wand2 className="w-3 h-3" />
                                                        Choose a Theme
                                                    </h3>
                                                    <button
                                                        onClick={() => onFilterChange("category", "all")}
                                                        className="text-[10px] font-black text-purple-500 hover:text-purple-600 uppercase tracking-widest px-2 py-1 rounded-lg hover:bg-purple-50 transition-colors"
                                                    >
                                                        Reset
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-3 gap-2">
                                                    {CATEGORIES.map((cat) => {
                                                        const Icon = cat.icon;
                                                        const isActive = activeCategory === cat.id;

                                                        return (
                                                            <button
                                                                key={cat.id}
                                                                onClick={() => {
                                                                    onFilterChange("category", cat.id);
                                                                    setIsCategoryOpen(false);
                                                                }}
                                                                className={cn(
                                                                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold font-fredoka transition-all text-left group",
                                                                    isActive
                                                                        ? "bg-purple-600 text-white shadow-lg shadow-purple-100 ring-2 ring-purple-100"
                                                                        : "bg-slate-50 text-slate-600 hover:bg-white hover:shadow-md hover:scale-[1.02] border border-transparent hover:border-slate-100"
                                                                )}
                                                            >
                                                                <div className={cn(
                                                                    "p-1.5 rounded-lg transition-colors bg-white/20 group-hover:scale-110 duration-300",
                                                                )}>
                                                                    <Icon className={cn("w-3.5 h-3.5", isActive ? "text-white" : cat.iconClass)} />
                                                                </div>
                                                                <span className="flex-1 truncate">{cat.label}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </PopoverContent>
                                    </Popover>

                                    <FilterSelect
                                        value={filters.level}
                                        onChange={(v: string | undefined) => onFilterChange("level", v)}
                                        prefix="Level"
                                        placeholder="Level"
                                        icon={Baby}
                                        options={[
                                            {
                                                value: "toddler",
                                                label: "Toddler",
                                                icon: Baby,
                                                theme: "bg-rose-500 text-white shadow-rose-200",
                                                iconColor: "text-rose-500",
                                                // Pre-calculate hover states
                                                hoverRx: "hover:bg-rose-50 group-hover:text-rose-500",
                                                activeIconColor: "text-white"
                                            },
                                            {
                                                value: "preschool",
                                                label: "Preschool",
                                                icon: Palette,
                                                theme: "bg-amber-500 text-white shadow-amber-200",
                                                iconColor: "text-amber-500",
                                                hoverRx: "hover:bg-amber-50 group-hover:text-amber-500",
                                                activeIconColor: "text-white"
                                            },
                                            {
                                                value: "elementary",
                                                label: "Elementary",
                                                icon: Rocket,
                                                theme: "bg-indigo-500 text-white shadow-indigo-200",
                                                iconColor: "text-indigo-500",
                                                hoverRx: "hover:bg-indigo-50 group-hover:text-indigo-500",
                                                activeIconColor: "text-white"
                                            },
                                            {
                                                value: "intermediate",
                                                label: "Intermediate",
                                                icon: FlaskConical,
                                                theme: "bg-violet-600 text-white shadow-violet-200",
                                                iconColor: "text-violet-500",
                                                hoverRx: "hover:bg-violet-50 group-hover:text-violet-500",
                                                activeIconColor: "text-white"
                                            },
                                        ]}
                                    />
                                    <FilterSelect
                                        value={filters.type}
                                        onChange={(v: string | undefined) => onFilterChange("type", v)}
                                        prefix="Type"
                                        placeholder="Type"
                                        icon={Sparkles}
                                        options={[
                                            {
                                                value: "fiction",
                                                label: "Stories",
                                                icon: Wand2,
                                                theme: "bg-purple-500 text-white shadow-purple-200",
                                                iconColor: "text-purple-500",
                                                hoverRx: "hover:bg-purple-50 group-hover:text-purple-500",
                                                activeIconColor: "text-white"
                                            },
                                            {
                                                value: "nonfiction",
                                                label: "Facts",
                                                icon: Microscope,
                                                theme: "bg-blue-500 text-white shadow-blue-200",
                                                iconColor: "text-blue-500",
                                                hoverRx: "hover:bg-blue-50 group-hover:text-blue-500",
                                                activeIconColor: "text-white"
                                            },
                                        ]}
                                    />
                                    <FilterSelect
                                        value={filters.duration}
                                        onChange={(v: string | undefined) => onFilterChange("duration", v)}
                                        prefix="Time"
                                        placeholder="Time"
                                        icon={Clock}
                                        options={[
                                            {
                                                value: "short",
                                                label: "< 5m",
                                                icon: Zap,
                                                theme: "bg-teal-500 text-white shadow-teal-200",
                                                iconColor: "text-teal-500",
                                                hoverRx: "hover:bg-teal-50 group-hover:text-teal-500",
                                                activeIconColor: "text-white"
                                            },
                                            {
                                                value: "medium",
                                                label: "5-10m",
                                                icon: Play,
                                                theme: "bg-sky-500 text-white shadow-sky-200",
                                                iconColor: "text-sky-500",
                                                hoverRx: "hover:bg-sky-50 group-hover:text-sky-500",
                                                activeIconColor: "text-white"
                                            },
                                            {
                                                value: "long",
                                                label: "> 10m",
                                                icon: Flame,
                                                theme: "bg-orange-500 text-white shadow-orange-200",
                                                iconColor: "text-orange-500",
                                                hoverRx: "hover:bg-orange-50 group-hover:text-orange-500",
                                                activeIconColor: "text-white"
                                            },
                                        ]}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: Search & Actions */}
                        <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                            {/* Desktop Search - Hidden on small mobile */}
                            <div className="hidden lg:block relative w-40 md:w-52 max-w-md group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => onSearchChange(e.target.value)}
                                    placeholder="Find a story..."
                                    className="w-full bg-purple-50/30 hover:bg-purple-50 border-none rounded-xl py-2 md:py-2.5 pl-10 pr-4 text-sm font-fredoka focus:ring-2 focus:ring-purple-200 transition-all outline-none"
                                />
                            </div>


                            {/* Mobile Filters Trigger */}
                            <Sheet>
                                <SheetTrigger asChild>
                                    <button
                                        className={cn(
                                            "lg:hidden p-2 rounded-xl transition-colors",
                                            (filters.level || filters.type || filters.duration || (filters.category && filters.category !== 'all'))
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
                                        {/* Theme/Category Section (New for Mobile Sheet) */}
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
                                                            <Icon className={cn("w-4 h-4", isActive ? "text-purple-500" : "text-slate-300")} />
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
                                                {[
                                                    {
                                                        id: "toddler",
                                                        label: "Toddler",
                                                        icon: Baby,
                                                        activeClass: "bg-white border-rose-400 text-rose-600 shadow-lg shadow-rose-100",
                                                        activeIconClass: "text-rose-500"
                                                    },
                                                    {
                                                        id: "preschool",
                                                        label: "Preschool",
                                                        icon: Palette,
                                                        activeClass: "bg-white border-amber-400 text-amber-600 shadow-lg shadow-amber-100",
                                                        activeIconClass: "text-amber-500"
                                                    },
                                                    {
                                                        id: "elementary",
                                                        label: "Elementary",
                                                        icon: Rocket,
                                                        activeClass: "bg-white border-indigo-400 text-indigo-600 shadow-lg shadow-indigo-100",
                                                        activeIconClass: "text-indigo-500"
                                                    },
                                                    {
                                                        id: "intermediate",
                                                        label: "Intermediate",
                                                        icon: FlaskConical,
                                                        activeClass: "bg-white border-violet-400 text-violet-600 shadow-lg shadow-violet-100",
                                                        activeIconClass: "text-violet-500"
                                                    },
                                                ].map((opt) => {
                                                    const isActive = filters.level === opt.id;
                                                    const Icon = opt.icon;
                                                    return (
                                                        <button
                                                            key={opt.id}
                                                            onClick={() => onFilterChange("level", isActive ? undefined : opt.id)}
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
                                                {[
                                                    {
                                                        id: "fiction",
                                                        label: "Stories",
                                                        icon: Wand2,
                                                        activeClass: "bg-white border-purple-400 text-purple-600 shadow-lg shadow-purple-100",
                                                        activeIconClass: "text-purple-500"
                                                    },
                                                    {
                                                        id: "nonfiction",
                                                        label: "Facts",
                                                        icon: Microscope,
                                                        activeClass: "bg-white border-blue-400 text-blue-600 shadow-lg shadow-blue-100",
                                                        activeIconClass: "text-blue-500"
                                                    },
                                                ].map((opt) => {
                                                    const isActive = filters.type === opt.id;
                                                    const Icon = opt.icon;
                                                    return (
                                                        <button
                                                            key={opt.id}
                                                            onClick={() => onFilterChange("type", isActive ? undefined : opt.id)}
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
                                                {[
                                                    {
                                                        id: "short",
                                                        label: "< 5m",
                                                        icon: Zap,
                                                        activeClass: "bg-white border-teal-400 text-teal-600 shadow-lg shadow-teal-100",
                                                        activeIconClass: "text-teal-500"
                                                    },
                                                    {
                                                        id: "medium",
                                                        label: "5-10m",
                                                        icon: Play,
                                                        activeClass: "bg-white border-sky-400 text-sky-600 shadow-lg shadow-sky-100",
                                                        activeIconClass: "text-sky-500"
                                                    },
                                                    {
                                                        id: "long",
                                                        label: "> 10m",
                                                        icon: Flame,
                                                        activeClass: "bg-white border-orange-400 text-orange-600 shadow-lg shadow-orange-100",
                                                        activeIconClass: "text-orange-500"
                                                    },
                                                ].map((opt) => {
                                                    const isActive = filters.duration === opt.id;
                                                    const Icon = opt.icon;
                                                    return (
                                                        <button
                                                            key={opt.id}
                                                            onClick={() => onFilterChange("duration", isActive ? undefined : opt.id)}
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

                            {/* Sort Button - Full UI or Compact based on screen */}
                            <div className="relative">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <button
                                            className={cn(
                                                "flex items-center gap-2 px-2 py-2 md:px-3 md:py-2 rounded-xl text-xs font-black font-fredoka transition-all outline-none border shadow-sm",
                                                sortBy !== "last_opened"
                                                    ? "bg-indigo-100 border-indigo-200 text-indigo-700 shadow-sm"
                                                    : "bg-indigo-50/30 border-indigo-100/50 text-indigo-600/70 hover:bg-indigo-50 hover:text-indigo-600"
                                            )}
                                        >
                                            <ArrowUpDown className={cn("w-3.5 h-3.5", sortBy !== "last_opened" ? "text-indigo-600" : "text-slate-400")} />
                                            <span className="hidden lg:inline">Sort</span>
                                            <div className="hidden lg:flex items-center">
                                                <span className="text-[10px] opacity-40 ml-0.5">•</span>
                                                <span className={cn(
                                                    "text-xs font-bold ml-1",
                                                    sortOrder === 'desc' ? "text-rose-400" : "text-emerald-400"
                                                )}>
                                                    {sortOrder === 'desc' ? 'New' : 'Old'}
                                                </span>
                                            </div>
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-48 p-2 rounded-2xl border-none shadow-2xl bg-white/95 backdrop-blur-xl z-[110]" align="end">
                                        <div className="grid gap-1">
                                            {[
                                                ...(searchQuery ? [{ id: 'relevance', label: 'Best Match' }] : []),
                                                { id: 'last_opened', label: 'Recently Read' },
                                                { id: 'created_at', label: 'Recently Added' },
                                                { id: 'lexile_level', label: 'Reading Level' },
                                                { id: 'reading_time', label: 'Reading Time' },
                                                { id: 'title', label: 'Alphabetical' }
                                            ].map((option) => (
                                                <div
                                                    key={option.id}
                                                    onClick={() => onSortChange(option.id)}
                                                    className={cn(
                                                        "flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-xs font-black font-fredoka transition-all outline-none cursor-pointer",
                                                        sortBy === option.id ? "bg-indigo-50 text-indigo-600" : "text-slate-600 hover:bg-slate-50"
                                                    )}
                                                >
                                                    <span>{option.label}</span>
                                                    {sortBy === option.id && (
                                                        <div
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc');
                                                            }}
                                                            className="p-1 hover:bg-indigo-100 rounded-md transition-colors"
                                                        >
                                                            <ArrowUpDown className={cn("w-3 h-3 transition-transform", sortOrder === 'asc' && "rotate-180")} />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Reordered Mobile Search Trigger */}
                            <button
                                onClick={() => setIsSearchExpanded(true)}
                                className="lg:hidden p-2 rounded-xl bg-purple-50/30 border border-purple-100/50 text-purple-600/70 hover:bg-purple-50 hover:text-purple-600 transition-all active:scale-95"
                            >
                                <Search className="w-5 h-5" />
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="search"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="flex items-center gap-2 w-full"
                    >
                        <div className="relative flex-1 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
                            <input
                                autoFocus
                                type="text"
                                value={searchQuery}
                                onChange={(e) => onSearchChange(e.target.value)}
                                placeholder="Search stories..."
                                className="w-full bg-slate-50 border-2 border-transparent focus:border-purple-200 rounded-xl py-2 pl-10 pr-4 text-base font-fredoka outline-none transition-all"
                            />
                        </div>
                        <button
                            onClick={() => setIsSearchExpanded(false)}
                            className="font-fredoka font-black text-slate-400 hover:text-slate-600 px-2 transition-colors"
                        >
                            Cancel
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </PageToolbar>
    );
}

// --- Helper Components ---

function FilterSelect({ value, onChange, options, placeholder, icon: BaseIcon, prefix }: any) {
    const activeOption = options.find((o: any) => o.value === value);
    const ActiveIcon = activeOption?.icon || BaseIcon;

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    className={`
                        flex items-center gap-1.5 px-3 lg:px-4 py-1.5 rounded-full border transition-all text-sm font-bold font-fredoka outline-none active:scale-95
                        ${value
                            ? `${activeOption.theme} border-transparent shadow-lg scale-105`
                            : 'bg-indigo-50/30 border-indigo-100/50 text-indigo-600/70 hover:bg-indigo-50 hover:text-indigo-600 shadow-sm'
                        }
                    `}
                >
                    <div className="relative flex items-center justify-center">
                        {value && (
                            <motion.div
                                layoutId={`glow-${placeholder}`}
                                className={`absolute inset-0 blur-md opacity-60 ${activeOption.iconColor} bg-current rounded-full`}
                            />
                        )}
                        <ActiveIcon className={`
                            w-3.5 h-3.5 stroke-[2.5] relative z-10 transition-colors duration-300
                            ${value ? (activeOption.activeIconColor || 'text-white') : 'text-slate-400'}
                        `} />
                    </div>
                    <span className="truncate max-w-[110px]">
                        {value ? (prefix ? `${prefix}: ${activeOption.label}` : activeOption.label) : placeholder}
                    </span>
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-2 rounded-[24px] shadow-2xl border-2 border-slate-100/50 bg-white/95 backdrop-blur-md" align="start">
                <div className="space-y-1">
                    {options.map((opt: any) => {
                        const isActive = value === opt.value;
                        const OptIcon = opt.icon || BaseIcon;
                        return (
                            <button
                                key={opt.value}
                                onClick={() => onChange(isActive ? undefined : opt.value)}
                                className={`
                                    w-full flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 group
                                    ${isActive
                                        ? `${opt.theme} shadow-lg scale-[1.02] z-10`
                                        : `${opt.hoverRx || 'hover:bg-slate-100'} text-slate-600 hover:text-slate-900 border border-transparent`}
                                `}
                            >
                                <div className={`
                                    w-10 h-10 flex items-center justify-center rounded-xl relative transition-all duration-300
                                    ${isActive
                                        ? 'bg-white/20'
                                        : `bg-slate-50 ${opt.hoverRx?.split(' ')[0] || 'hover:bg-slate-100'}`}
                                `}>
                                    <OptIcon className={`
                                        w-5 h-5 relative z-10 transition-colors duration-300
                                        ${isActive
                                            ? (opt.activeIconColor || 'text-white')
                                            : `text-slate-400 ${opt.hoverRx?.split(' ')[1] || 'group-hover:text-slate-600'}`}
                                    `} />
                                    {isActive && (
                                        <div className={`absolute inset-0 blur-md opacity-40 ${opt.iconColor} bg-current rounded-full`} />
                                    )}
                                </div>
                                <span className={`font-fredoka font-bold text-[15px] transition-colors ${isActive ? 'text-white' : 'group-hover:text-slate-900'}`}>{opt.label}</span>
                                {isActive && (
                                    <div className="ml-auto flex items-center justify-center w-6 h-6 rounded-full bg-white/20">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </PopoverContent>
        </Popover>
    );
}

const CategoryDropdown = React.memo(function CategoryDropdown({
    isOpen,
    onOpenChange,
    activeCategory,
    onFilterChange,
    selectedCategoryObj,
    CategoryIcon
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    activeCategory: string;
    onFilterChange: (key: string, val: any) => void;
    selectedCategoryObj: { id: string; label: string; iconClass: string };
    CategoryIcon: LucideIcon;
}) {
    // Helper to calculate common classes
    const containerClasses = `
        flex items-center rounded-full border border-slate-200 bg-white transition-all shadow-sm
        ${activeCategory !== 'all' ? 'ring-2 ring-purple-100 border-purple-200 pl-1 pr-1 gap-1' : 'hover:bg-slate-50 px-0'}
    `;

    return (
        <Popover open={isOpen} onOpenChange={onOpenChange}>
            {activeCategory === 'all' ? (
                // Default State: Single Trigger Button
                <PopoverTrigger asChild>
                    <button
                        data-tour-target="library-category-btn"
                        className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 lg:px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition-all font-bold font-fredoka text-slate-700 shadow-sm"
                        aria-label="Category Filter"
                    >
                        <div className="flex items-center justify-center w-5 h-5 rounded-full text-slate-400 bg-slate-100">
                            <CategoryIcon className={`w-4 h-4 ${selectedCategoryObj.iconClass}`} />
                        </div>
                        <span className="hidden md:inline font-fredoka font-bold text-sm truncate max-w-[120px]">
                            {selectedCategoryObj.label}
                        </span>
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-50 hidden md:block" />
                    </button>
                </PopoverTrigger>
            ) : (
                // Active State: Split Trigger + Clear Button
                <div className={containerClasses}>
                    <PopoverTrigger asChild>
                        <button
                            className="flex items-center gap-1.5 md:gap-2 px-2 md:px-2 py-1.5 rounded-full hover:bg-slate-50 transition-all font-bold font-fredoka text-slate-700"
                            aria-label={`Category: ${selectedCategoryObj.label}`}
                        >
                            <div className="flex items-center justify-center w-5 h-5 rounded-full text-purple-700">
                                <CategoryIcon className={`w-4 h-4 ${selectedCategoryObj.iconClass}`} />
                            </div>
                            <span className="hidden md:inline font-fredoka font-bold text-sm truncate max-w-[120px]">
                                {selectedCategoryObj.label}
                            </span>
                        </button>
                    </PopoverTrigger>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onFilterChange("category", undefined);
                        }}
                        className="p-1 hover:bg-purple-100 rounded-full transition-colors text-purple-500"
                        aria-label="Clear Category Filter"
                        title="Clear Category"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            <PopoverContent className="w-[90vw] max-w-[340px] p-4 rounded-[24px] shadow-xl border-2 border-purple-100" align="start">
                <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto scrollbar-hide">
                    {CATEGORIES.map((cat) => {
                        const isActive = activeCategory === cat.id;
                        const Icon = cat.icon;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => {
                                    onFilterChange("category", cat.id === 'all' ? undefined : cat.id);
                                    onOpenChange(false);
                                }}
                                className={`
                                     flex items-center gap-2.5 p-2 rounded-xl text-left transition-colors
                                     ${isActive ? 'bg-purple-50 text-purple-700 border border-purple-100' : 'hover:bg-slate-50 text-slate-600 border border-transparent'}
                                 `}
                            >
                                <div className={`p-2 rounded-lg ${isActive ? 'bg-white shadow-sm' : 'bg-slate-100'}`}>
                                    <Icon className={`w-4 h-4 ${cat.iconClass}`} />
                                </div>
                                <span className="text-sm font-bold font-fredoka">{cat.label}</span>
                            </button>
                        )
                    })}
                </div>
            </PopoverContent>
        </Popover>
    );
});
