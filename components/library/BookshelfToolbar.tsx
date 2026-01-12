"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/core";
import {
    Search,
    GraduationCap,
    BookOpen,
    ArrowUpDown,
    Star,
    Compass,
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
    X,
    Baby,
    Microscope,
    Library,
    Play,
    Flame,
    Palette,
    User,
    LucideIcon
} from "lucide-react";
import { clayVariants } from "@/lib/clay-utils";
import { ClaySelect } from "./clay-select";
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

import { CachedImage } from "@/components/ui/cached-image";

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
        collection?: "discovery" | "my-tales" | "favorites";
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
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

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
        "my-tales": "bg-gradient-to-r from-rose-400 to-purple-500",
        favorites: "bg-gradient-to-r from-amber-400 to-pink-500"
    };



    return (
        <div className={`
             sticky top-0 z-30 transition-all duration-300
             mx-auto w-full max-w-7xl
             ${className}
        `}>
            {/* Glass Container - Flexible Occupied Layout */}
            <div className={`
                backdrop-blur-xl bg-white/90 shadow-[0_8px_32px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]
                border border-white/80 ring-1 ring-slate-200/30
                rounded-2xl px-2.5 py-2 md:px-4 md:py-3
                flex items-center gap-2 md:gap-4
                transition-all duration-500
            `}>

                {/* LEFT & CENTER: Descriptive Navigation (Fills the space) */}
                <div className="flex items-center gap-2 md:gap-6 min-w-0 flex-1">
                    {/* Profile Button or Logo */}
                    <div className="flex-shrink-0">
                        {activeChild ? (
                            <Link href="/dashboard" className="block">
                                <div className="relative w-8 h-8 md:w-9 md:h-9 rounded-full overflow-hidden ring-2 ring-purple-200 hover:ring-purple-400 transition-all cursor-pointer shadow-sm hover:shadow-md">
                                    {activeChild.avatar_url ? (
                                        <CachedImage
                                            src={activeChild.avatar_url}
                                            alt={activeChild.name}
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-fredoka font-bold text-sm">
                                            {activeChild.name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                            </Link>
                        ) : (
                            <Link href="/login" className="block">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white hover:shadow-md transition-all cursor-pointer" title="Sign In">
                                    <User className="w-4 h-4 stroke-[2.5]" />
                                </div>
                            </Link>
                        )}
                    </div>

                    {/* Tabs (Icon-only on mobile for authenticated users, full text on desktop) */}
                    {/* Tabs & Category Dropdown Wrapper */}
                    <div className="flex items-center min-w-0 gap-1.5 md:gap-2 flex-1">
                        {/* Compact tabs - no scrolling needed now */}
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
                                                ? `${activeTheme} text-white shadow-lg shadow-purple-200/50 scale-105 z-10 px-4`
                                                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50/80 px-3",
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
                                                    transition={{ duration: 0.2, ease: "easeOut" }}
                                                    className="whitespace-nowrap overflow-hidden"
                                                >
                                                    {col.id === 'discovery' ? 'Find' : col.id === 'my-tales' ? 'Me' : 'Saved'}
                                                </motion.span>
                                            )}
                                        </AnimatePresence>

                                        {/* Desktop-only full label for inactive tabs */}
                                        {!isActive && isMultipleTabs && (
                                            <span className="hidden md:inline ml-2 whitespace-nowrap">
                                                {col.label}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {activeCollection === 'discovery' && (
                            <div className="flex-shrink-0 block">
                                <CategoryDropdown
                                    isOpen={isCategoryOpen}
                                    onOpenChange={setIsCategoryOpen}
                                    activeCategory={activeCategory}
                                    onFilterChange={onFilterChange}
                                    selectedCategoryObj={selectedCategoryObj}
                                    CategoryIcon={CategoryIcon}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: Global Actions (Compact Search + Filters) */}
                <div className="flex items-center gap-1.5 md:gap-3 flex-shrink-0">

                    {/* Desktop Items */}
                    <div className="hidden md:flex items-center gap-2 flex-shrink-0">
                        {/* Mini Filters */}
                        <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
                            <FilterSelect
                                value={filters.level}
                                onChange={(v: string | undefined) => onFilterChange("level", v)}
                                placeholder="Lvl"
                                icon={GraduationCap}
                                options={[
                                    { value: "toddler", label: "Toddler", icon: Baby, theme: "bg-rose-500 text-white shadow-rose-200", iconColor: "text-rose-500", lightBg: "bg-rose-50", activeIconColor: "text-white" },
                                    { value: "preschool", label: "Preschool", icon: Palette, theme: "bg-amber-500 text-white shadow-amber-200", iconColor: "text-amber-500", lightBg: "bg-amber-50", activeIconColor: "text-white" },
                                    { value: "elementary", label: "Elementary", icon: Rocket, theme: "bg-indigo-500 text-white shadow-indigo-200", iconColor: "text-indigo-500", lightBg: "bg-indigo-50", activeIconColor: "text-white" },
                                    { value: "intermediate", label: "Intermediate", icon: FlaskConical, theme: "bg-violet-600 text-white shadow-violet-200", iconColor: "text-violet-500", lightBg: "bg-violet-50", activeIconColor: "text-white" },
                                ]}
                            />
                            <FilterSelect
                                value={filters.type}
                                onChange={(v: string | undefined) => onFilterChange("type", v)}
                                placeholder="Type"
                                icon={Sparkles}
                                options={[
                                    { value: "fiction", label: "Stories", icon: Wand2, theme: "bg-purple-500 text-white shadow-purple-200", iconColor: "text-purple-500", lightBg: "bg-purple-50", activeIconColor: "text-white" },
                                    { value: "nonfiction", label: "Facts", icon: Microscope, theme: "bg-blue-500 text-white shadow-blue-200", iconColor: "text-blue-500", lightBg: "bg-blue-50", activeIconColor: "text-white" },
                                ]}
                            />
                            <FilterSelect
                                value={filters.duration}
                                onChange={(v: string | undefined) => onFilterChange("duration", v)}
                                placeholder="Time"
                                icon={Clock}
                                options={[
                                    { value: "short", label: "< 5m", icon: Zap, theme: "bg-teal-500 text-white shadow-teal-200", iconColor: "text-teal-500", lightBg: "bg-teal-50", activeIconColor: "text-white" },
                                    { value: "medium", label: "5-10m", icon: Play, theme: "bg-sky-500 text-white shadow-sky-200", iconColor: "text-sky-500", lightBg: "bg-sky-50", activeIconColor: "text-white" },
                                    { value: "long", label: "> 10m", icon: Flame, theme: "bg-orange-500 text-white shadow-orange-200", iconColor: "text-orange-500", lightBg: "bg-orange-50", activeIconColor: "text-white" },
                                ]}
                            />
                        </div>

                        {/* Sort */}
                        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-fredoka pl-1">Sort</span>
                            <FilterSelect
                                value={sortBy}
                                onChange={onSortChange}
                                placeholder="Order"
                                prefix="Sort"
                                icon={ArrowUpDown}
                                options={[
                                    { value: "last_opened", label: "Recent", icon: Clock, theme: "bg-gradient-to-r from-emerald-400 to-teal-500 text-white shadow-emerald-200", iconColor: "text-emerald-200", lightBg: "bg-emerald-50", activeIconColor: "text-white" },
                                    { value: "newest", label: "Date", icon: Star, theme: "bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-amber-200", iconColor: "text-amber-200", lightBg: "bg-amber-50", activeIconColor: "text-white" },
                                    { value: "alphabetical", label: "A-Z", icon: BookOpen, theme: "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-purple-200", iconColor: "text-purple-200", lightBg: "bg-purple-50", activeIconColor: "text-white" },
                                    { value: "reading_time", label: "Time", icon: Compass, theme: "bg-gradient-to-r from-sky-400 to-indigo-500 text-white shadow-sky-200", iconColor: "text-sky-200", lightBg: "bg-sky-50", activeIconColor: "text-white" },
                                ]}
                            />
                            <button
                                onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
                                title={sortOrder === 'asc' ? 'Sorted Ascending' : 'Sorted Descending'}
                                className={`
                                    w-8 h-8 flex items-center justify-center rounded-full border transition-all active:scale-90
                                    ${sortOrder === 'asc' ? 'bg-purple-50 border-purple-200 text-purple-600' : 'bg-slate-50 border-slate-200 text-slate-500'}
                                `}
                            >
                                <motion.div
                                    animate={{ rotate: sortOrder === 'asc' ? 0 : 180 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                >
                                    <ArrowUpDown className="w-3.5 h-3.5" />
                                </motion.div>
                            </button>
                        </div>
                    </div>

                    {/* Search (Icon-first trigger for all) */}
                    <div className={`
                        flex items-center bg-white border border-slate-200 rounded-full transition-all duration-300 shadow-sm hover:shadow-md hover:border-purple-200
                        ${isMobileSearchOpen || searchQuery ? 'w-[160px] sm:w-[240px] px-3' : 'w-10 h-10'}
                    `}>
                        <div className="w-full h-full flex items-center">
                            {(isMobileSearchOpen || searchQuery) ? (
                                <>
                                    <Search className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
                                    <input
                                        autoFocus
                                        className="flex-1 min-w-0 bg-transparent border-none outline-none font-fredoka font-medium text-slate-700 placeholder:text-slate-400 text-sm"
                                        placeholder="Search..."
                                        value={searchQuery}
                                        onChange={(e) => onSearchChange(e.target.value)}
                                        onBlur={() => !searchQuery && setIsMobileSearchOpen(false)}
                                    />
                                    {searchQuery && (
                                        <button onClick={() => onSearchChange("")} className="p-1 hover:bg-slate-100 rounded-full">
                                            <X className="w-3 h-3 text-slate-400" />
                                        </button>
                                    )}
                                </>
                            ) : (
                                <button
                                    onClick={() => setIsMobileSearchOpen(true)}
                                    className="w-full h-full flex items-center justify-center text-slate-400 hover:text-purple-500"
                                >
                                    <Search className="w-4 h-4 stroke-[2.5]" />
                                </button>
                            )}
                        </div>
                    </div>



                    {/* Mobile Filter Sheet Trigger */}
                    <div className="md:hidden">
                        <Sheet>
                            <SheetTrigger asChild>
                                <button className={`
                                   w-10 h-10 flex items-center justify-center rounded-full border transition-all
                                   ${(filters.level || filters.type || filters.duration)
                                        ? 'bg-purple-100 text-purple-600 border-purple-200'
                                        : 'bg-white border-slate-200 text-slate-400'}
                                `}>
                                    <Filter className="w-4 h-4 stroke-[3px]" />
                                </button>
                            </SheetTrigger>
                            <SheetContent side="bottom" className="rounded-t-[32px] h-[85vh] p-0 overflow-hidden bg-slate-50">
                                <SheetHeader className="p-6 bg-white border-b border-slate-100">
                                    <SheetTitle className="text-left font-fredoka text-2xl font-black text-slate-800">Filters</SheetTitle>
                                    <SheetDescription>Refine your bookshelf to find the perfect story.</SheetDescription>
                                </SheetHeader>

                                <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(85vh-120px)] scrollbar-hide pb-24">
                                    {/* Level Section */}
                                    <div className="space-y-2">
                                        <h3 className="font-fredoka font-bold text-slate-400 text-xs uppercase tracking-wider flex items-center gap-2 mb-1">
                                            <GraduationCap className="w-3.5 h-3.5" /> Reading Level
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                { value: "toddler", label: "Toddler", icon: Baby, theme: "bg-rose-500 border-rose-500 text-white shadow-rose-100", iconColor: "text-rose-400", lightBg: "bg-rose-50/50" },
                                                { value: "preschool", label: "Preschool", icon: Palette, theme: "bg-amber-500 border-amber-500 text-white shadow-amber-100", iconColor: "text-amber-400", lightBg: "bg-amber-50/50" },
                                                { value: "elementary", label: "Elementary", icon: Rocket, theme: "bg-indigo-500 border-indigo-500 text-white shadow-indigo-100", iconColor: "text-indigo-400", lightBg: "bg-indigo-50/50" },
                                                { value: "intermediate", label: "Intermediate", icon: FlaskConical, theme: "bg-violet-600 border-violet-600 text-white shadow-violet-100", iconColor: "text-violet-400", lightBg: "bg-violet-50/50" },
                                            ].map((opt) => {
                                                const isActive = filters.level === opt.value;
                                                const OptIcon = opt.icon;
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => onFilterChange("level", isActive ? undefined : opt.value)}
                                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-fredoka font-bold text-sm transition-all ${isActive
                                                            ? `${opt.theme} scale-105 z-10 shadow-lg`
                                                            : `${opt.lightBg} border-transparent text-slate-500 hover:border-slate-200`
                                                            }`}
                                                    >
                                                        <div className={`
                                                            w-8 h-8 flex items-center justify-center rounded-lg relative
                                                            ${isActive ? 'bg-white/20' : 'bg-white shadow-sm'}
                                                        `}>
                                                            <OptIcon className={`w-4 h-4 relative z-10 ${isActive ? 'text-white' : opt.iconColor}`} />
                                                            {isActive && (
                                                                <div className={`absolute inset-0 blur-md opacity-40 text-white bg-current rounded-full`} />
                                                            )}
                                                        </div>
                                                        {opt.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Type Section */}
                                    <div className="space-y-2">
                                        <h3 className="font-fredoka font-bold text-slate-400 text-xs uppercase tracking-wider flex items-center gap-2 mb-1">
                                            <Sparkles className="w-3.5 h-3.5" /> Story Type
                                        </h3>
                                        <div className="flex gap-2">
                                            {[
                                                { value: "fiction", label: "Stories", icon: Wand2, theme: "bg-gradient-to-br from-purple-500 to-indigo-600 border-purple-500 text-white shadow-purple-100", iconColor: "text-purple-400", lightBg: "bg-purple-50/50" },
                                                { value: "nonfiction", label: "Facts", icon: Microscope, theme: "bg-gradient-to-br from-blue-500 to-cyan-500 border-blue-500 text-white shadow-blue-100", iconColor: "text-blue-400", lightBg: "bg-blue-50/50" },
                                            ].map((opt) => {
                                                const isActive = filters.type === opt.value;
                                                const OptIcon = opt.icon;
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => onFilterChange("type", isActive ? undefined : (opt.value as any))}
                                                        className={`flex-1 flex flex-row items-center justify-center gap-2 py-2 rounded-xl border-2 font-fredoka font-bold text-xs transition-all ${isActive
                                                            ? `${opt.theme} scale-[1.02] shadow-sm`
                                                            : `${opt.lightBg} border-transparent text-slate-500`
                                                            }`}
                                                    >
                                                        <div className={`
                                                            w-7 h-7 flex items-center justify-center rounded-lg relative
                                                            ${isActive ? 'bg-white/20' : 'bg-white shadow-sm'}
                                                        `}>
                                                            <OptIcon className={`w-4 h-4 relative z-10 ${isActive ? 'text-white' : opt.iconColor}`} />
                                                            {isActive && (
                                                                <div className={`absolute inset-0 blur-lg opacity-40 text-white bg-current rounded-full`} />
                                                            )}
                                                        </div>
                                                        {opt.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Duration Section */}
                                    <div className="space-y-2">
                                        <h3 className="font-fredoka font-bold text-slate-400 text-xs uppercase tracking-wider flex items-center gap-2 mb-1">
                                            <Clock className="w-3.5 h-3.5" /> Reading Time
                                        </h3>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { value: "short", label: "< 5m", icon: Zap, theme: "bg-teal-500 border-teal-500 text-white shadow-teal-100", iconColor: "text-teal-400", lightBg: "bg-teal-50/50" },
                                                { value: "medium", label: "5-10m", icon: Play, theme: "bg-sky-500 border-sky-500 text-white shadow-sky-100", iconColor: "text-sky-400", lightBg: "bg-sky-50/50" },
                                                { value: "long", label: "> 10m", icon: Flame, theme: "bg-orange-500 border-orange-500 text-white shadow-orange-100", iconColor: "text-orange-400", lightBg: "bg-orange-50/50" },
                                            ].map((opt) => {
                                                const isActive = filters.duration === opt.value;
                                                const OptIcon = opt.icon;
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => onFilterChange("duration", isActive ? undefined : opt.value)}
                                                        className={`flex flex-row items-center justify-center gap-1.5 py-2 rounded-xl border-2 font-fredoka font-bold text-xs transition-all ${isActive
                                                            ? `${opt.theme} scale-105 shadow-sm`
                                                            : `${opt.lightBg} border-transparent text-slate-500`
                                                            }`}
                                                    >
                                                        <div className={`
                                                            w-6 h-6 flex items-center justify-center rounded-md relative
                                                            ${isActive ? 'bg-white/20' : 'bg-white shadow-sm'}
                                                        `}>
                                                            <OptIcon className={`w-4 h-4 relative z-10 ${isActive ? 'text-white' : opt.iconColor}`} />
                                                        </div>
                                                        {opt.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Sort Section */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="font-fredoka font-bold text-slate-400 text-xs uppercase tracking-wider flex items-center gap-2">
                                                <ArrowUpDown className="w-3.5 h-3.5" /> Order By
                                            </h3>
                                            <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200/50 shadow-inner group scale-90 origin-right">
                                                <button
                                                    onClick={() => onSortOrderChange('asc')}
                                                    className={`
                                                        flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-fredoka font-bold text-xs transition-all
                                                        ${sortOrder === 'asc'
                                                            ? 'bg-white text-purple-600 shadow-sm scale-[1.02] z-10'
                                                            : 'text-slate-400 hover:text-slate-600'}
                                                    `}
                                                >
                                                    <ArrowUpDown className={`w-3 h-3 transition-transform ${sortOrder === 'asc' ? 'rotate-0' : 'opacity-40'}`} />
                                                    Asc
                                                </button>
                                                <button
                                                    onClick={() => onSortOrderChange('desc')}
                                                    className={`
                                                        flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-fredoka font-bold text-xs transition-all
                                                        ${sortOrder === 'desc'
                                                            ? 'bg-purple-600 text-white shadow-md scale-[1.02] z-10'
                                                            : 'text-slate-400 hover:text-slate-600'}
                                                    `}
                                                >
                                                    <ArrowUpDown className={`w-3 h-3 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : 'opacity-40'}`} />
                                                    Desc
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            {[
                                                { value: "last_opened", label: "Recently Read", icon: Clock, theme: "bg-gradient-to-r from-emerald-400 to-teal-500 border-transparent text-white shadow-clay-lg", iconColor: "text-emerald-300", lightBg: "bg-emerald-50/30" },
                                                { value: "newest", label: "Recently Updated", icon: Star, theme: "bg-gradient-to-r from-amber-400 to-orange-500 border-transparent text-white shadow-clay-lg", iconColor: "text-amber-300", lightBg: "bg-amber-50/30" },
                                                { value: "alphabetical", label: "Alphabetical (A-Z)", icon: BookOpen, theme: "bg-gradient-to-r from-indigo-500 to-purple-600 border-transparent text-white shadow-clay-lg", iconColor: "text-indigo-200", lightBg: "bg-indigo-50/30" },
                                                { value: "reading_time", label: "Reading Duration", icon: Compass, theme: "bg-gradient-to-r from-sky-400 to-indigo-500 border-transparent text-white shadow-clay-lg", iconColor: "text-sky-200", lightBg: "bg-sky-50/30" },
                                            ].map((opt) => {
                                                const isActive = sortBy === opt.value;
                                                const OptIcon = opt.icon;
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => onSortChange(opt.value)}
                                                        className={`w-full p-2 rounded-xl border-2 text-left font-fredoka font-bold transition-all flex items-center justify-between ${isActive
                                                            ? `${opt.theme} scale-[1.02]`
                                                            : 'bg-white border-slate-100 text-slate-500'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`
                                                                w-7 h-7 flex items-center justify-center rounded-lg relative
                                                                ${isActive ? 'bg-white/10' : 'bg-white shadow-sm'}
                                                            `}>
                                                                <OptIcon className={`w-4 h-4 relative z-10 ${isActive ? 'text-white' : opt.iconColor}`} />
                                                                {isActive && (
                                                                    <div className={`absolute inset-0 blur-sm opacity-50 ${opt.iconColor} bg-current rounded-full`} />
                                                                )}
                                                            </div>
                                                            <span className="text-sm">{opt.label}</span>
                                                        </div>
                                                        {isActive && <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-100 flex gap-3">
                                    <SheetClose asChild>
                                        <button className="flex-1 py-4 bg-slate-900 text-white font-fredoka font-bold rounded-2xl shadow-xl active:scale-95 transition-all">
                                            Show Stories ({totalStories})
                                        </button>
                                    </SheetClose>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                    {/* Count Badge (Desktop) */}
                    <div className="hidden xl:flex items-center justify-center h-8 px-3 bg-slate-100 rounded-full text-xs font-bold text-slate-400">
                        {totalStories}
                    </div>

                </div>
            </div>

            {/* Category Grid Popover for Mobile is handled by the regular dropdown on desktop, 
                but for mobile we might need a separate sheet or drawer if the popover is too small. 
                For now the popover works okay on mobile if styled right. 
            */}
        </div>
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
                            : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200 hover:text-slate-700'
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
                    {!value && <ArrowUpDown className="w-2.5 h-2.5 opacity-30 ml-0.5" />}
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
                                        : `hover:${opt.lightBg || 'bg-slate-100'} text-slate-600 hover:text-slate-900 border border-transparent`}
                                `}
                            >
                                <div className={`
                                    w-10 h-10 flex items-center justify-center rounded-xl relative transition-all duration-300
                                    ${isActive
                                        ? 'bg-white/20'
                                        : `bg-slate-50 group-hover:${opt.lightBg || 'bg-slate-100'}`}
                                `}>
                                    <OptIcon className={`
                                        w-5 h-5 relative z-10 transition-colors duration-300
                                        ${isActive
                                            ? (opt.activeIconColor || 'text-white')
                                            : `text-slate-400 group-hover:${opt.iconColor}`}
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
