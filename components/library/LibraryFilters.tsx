"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
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
    Filter
} from "lucide-react";
import { clayVariants } from "@/lib/clay-utils";
import { ClaySelect } from "./clay-select";

interface LibraryFiltersProps {
    searchQuery: string;
    onSearchChange: (val: string) => void;
    filters: {
        level?: string;
        type?: "fiction" | "nonfiction";
        origin?: string;
        duration?: string;
        collection?: "discovery" | "my-tales" | "favorites";
    };
    onFilterChange: (key: string, val: any) => void;
    sortBy: string;
    onSortChange: (val: string) => void;
    activeCategory?: string;
    onCategoryChange?: (val: string) => void;
    className?: string;
    currentUserId?: string | null;
}

const CATEGORIES = [
    { id: "all", label: "All Stories", icon: Star, iconClass: "text-amber-400 fill-amber-100" },
    { id: "animals", label: "Animals", icon: Cloud, iconClass: "text-orange-500 fill-orange-100" }, // Placeholder icon if Cat/Dog not available
    { id: "dinosaurs", label: "Dinosaurs", icon: Sparkles, iconClass: "text-emerald-600 fill-emerald-100" }, // Placeholder
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
    { id: "discovery", label: "Discovery", icon: Sparkles, iconClass: "text-purple-500 fill-purple-100" },
    { id: "my-tales", label: "My Tales", icon: Wand2, iconClass: "text-blue-500 fill-blue-100" },
    { id: "favorites", label: "Treasures", icon: Heart, iconClass: "text-rose-500 fill-rose-100" },
] as const;

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetClose,
} from "@/components/ui/sheet"

// ... (existing helper function or constants if any)

export function LibraryFilters({
    searchQuery,
    onSearchChange,
    filters,
    onFilterChange,
    sortBy,
    onSortChange,
    activeCategory,
    onCategoryChange,
    className,
    currentUserId
}: LibraryFiltersProps) {
    const [isCategoryExpanded, setIsCategoryExpanded] = useState(false);

    const visibleCollections = currentUserId
        ? COLLECTIONS
        : COLLECTIONS.filter(c => c.id === 'discovery');

    // Desktop Filters (Dropdowns)
    const renderDesktopFilters = () => (
        <>
            {/* Level Filter */}
            <div className="flex-shrink-0">
                <ClaySelect
                    value={filters.level}
                    onChange={(val) => onFilterChange("level", val)}
                    placeholder="Level"
                    icon={GraduationCap}
                    variant="white"
                    iconClass="text-amber-500 fill-amber-100"
                    options={[
                        { value: "toddler", label: "Toddler (0-3)" },
                        { value: "preschool", label: "Preschool (3-5)" },
                        { value: "elementary", label: "Elementary (5-8)" },
                        { value: "intermediate", label: "Intermediate (8-12)" },
                    ]}
                />
            </div>

            {/* Type Filter */}
            <div className="flex-shrink-0">
                <ClaySelect
                    value={filters.type}
                    onChange={(val) => onFilterChange("type", val)}
                    placeholder="Type"
                    icon={BookOpen}
                    variant="white"
                    iconClass="text-emerald-500 fill-emerald-100"
                    options={[
                        { value: "fiction", label: "Stories (Fiction)" },
                        { value: "nonfiction", label: "Facts (Non-fiction)" },
                    ]}
                />
            </div>

            {/* Duration Filter */}
            <div className="flex-shrink-0">
                <ClaySelect
                    value={filters.duration}
                    onChange={(val) => onFilterChange("duration", val)}
                    placeholder="Time"
                    icon={Clock}
                    variant="white"
                    iconClass="text-rose-500 fill-rose-100"
                    options={[
                        { value: "short", label: "Short (< 5 min)" },
                        { value: "medium", label: "Medium (5-10 min)" },
                        { value: "long", label: "Long (> 10 min)" },
                    ]}
                />
            </div>

            {/* Sort Filter */}
            <div className="flex-shrink-0">
                <ClaySelect
                    value={sortBy}
                    onChange={(val) => onSortChange(val || "newest")}
                    placeholder="Sort"
                    icon={ArrowUpDown}
                    variant="white"
                    iconClass="text-sky-500 stroke-[3px]"
                    options={[
                        { value: "newest", label: "Newest First" },
                        { value: "oldest", label: "Oldest First" },
                        { value: "alphabetical", label: "A-Z" },
                        { value: "reading_time", label: "Reading Time" },
                    ]}
                />
            </div>
        </>
    );

    // Mobile Visual Drawer Content
    const renderMobileDrawerContent = () => (
        <div className="flex flex-col gap-8 py-6 px-1 pb-10 overflow-y-auto max-h-[85vh] scrollbar-hide">

            {/* Collection Section */}
            <div className="space-y-4">
                <h4 className="text-xl font-fredoka font-bold text-slate-800 flex items-center gap-3">
                    <div className="p-2.5 bg-purple-100 rounded-2xl text-purple-600">
                        <LayoutGrid className="w-6 h-6 stroke-[2.5px]" />
                    </div>
                    Magic Shelf
                </h4>
                <div className="grid grid-cols-3 gap-2">
                    {visibleCollections.map((col) => {
                        const isSelected = filters.collection === col.id;
                        const Icon = col.icon;
                        return (
                            <button
                                key={col.id}
                                onClick={() => onFilterChange("collection", col.id)}
                                className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-200 active:scale-95 ${isSelected
                                        ? 'bg-purple-50 text-purple-600 ring-2 ring-purple-200'
                                        : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                    }`}
                            >
                                <div className={`p-2 rounded-full ${isSelected ? 'bg-purple-200/50' : 'bg-white'}`}>
                                    <Icon className={`w-5 h-5 ${isSelected ? 'stroke-[2.5px]' : 'opacity-70'}`} />
                                </div>
                                <span className="text-[10px] font-bold font-fredoka uppercase tracking-wider">{col.label}</span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Level Section */}
            <div className="space-y-4">
                <h4 className="text-xl font-fredoka font-bold text-slate-800 flex items-center gap-3">
                    <div className="p-2.5 bg-amber-100 rounded-2xl text-amber-600">
                        <GraduationCap className="w-6 h-6 stroke-[2.5px]" />
                    </div>
                    Reading Level
                </h4>
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { value: "toddler", label: "Toddler", sub: "0-3 years", bg: "bg-amber-500", color: "amber" },
                        { value: "preschool", label: "Preschool", sub: "3-5 years", bg: "bg-orange-500", color: "orange" },
                        { value: "elementary", label: "Elementary", sub: "5-8 years", bg: "bg-emerald-500", color: "emerald" },
                        { value: "intermediate", label: "Intermediate", sub: "8-12 years", bg: "bg-sky-500", color: "sky" },
                    ].map((opt) => {
                        const isSelected = filters.level === opt.value;

                        // Static color map to ensure Tailwind generates classes
                        const colorStyles = {
                            amber: {
                                active: "bg-amber-500 shadow-amber-100 ring-amber-50",
                                text: "text-amber-600"
                            },
                            orange: {
                                active: "bg-orange-500 shadow-orange-100 ring-orange-50",
                                text: "text-orange-600"
                            },
                            emerald: {
                                active: "bg-emerald-500 shadow-emerald-100 ring-emerald-50",
                                text: "text-emerald-600"
                            },
                            sky: {
                                active: "bg-sky-500 shadow-sky-100 ring-sky-50",
                                text: "text-sky-600"
                            }
                        };

                        const styles = colorStyles[opt.color as keyof typeof colorStyles];

                        return (
                            <button
                                key={opt.value}
                                onClick={() => onFilterChange("level", isSelected ? undefined : opt.value)}
                                className={`relative p-5 rounded-3xl transition-all duration-200 active:scale-95 flex flex-col items-start gap-1.5 ${isSelected
                                        ? `${styles.active} text-white shadow-xl ring-4`
                                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                    }`}
                            >
                                <div className="w-full flex justify-between items-start">
                                    <span className={`text-lg font-bold font-fredoka`}>
                                        {opt.label}
                                    </span>
                                    {isSelected && <div className="bg-white/20 p-1.5 rounded-full"><Sparkles className="w-3.5 h-3.5 text-white" /></div>}
                                </div>
                                <span className={`text-sm font-bold ${isSelected ? 'text-white/90' : 'text-slate-400'}`}>
                                    {opt.sub}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Type Section */}
            <div className="space-y-4">
                <h4 className="text-xl font-fredoka font-bold text-slate-800 flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-100 rounded-2xl text-emerald-600">
                        <BookOpen className="w-6 h-6 stroke-[2.5px]" />
                    </div>
                    Story Type
                </h4>
                <div className="flex bg-slate-100 p-1.5 rounded-[20px] md:max-w-md">
                    {[
                        { value: "fiction", label: "Stories", icon: Wand2 },
                        { value: "nonfiction", label: "Facts", icon: FlaskConical },
                    ].map((opt) => {
                        const isSelected = filters.type === opt.value;
                        const Icon = opt.icon;
                        return (
                            <button
                                key={opt.value}
                                onClick={() => onFilterChange("type", isSelected ? undefined : opt.value)}
                                className={`flex-1 py-4 rounded-2xl font-bold font-fredoka text-lg transition-all duration-200 flex items-center justify-center gap-2.5 ${isSelected
                                        ? 'bg-white text-purple-600 shadow-md ring-1 ring-black/5'
                                        : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                <Icon className={`w-5 h-5 ${isSelected ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                                {opt.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Time Section */}
            <div className="space-y-4">
                <h4 className="text-xl font-fredoka font-bold text-slate-800 flex items-center gap-3">
                    <div className="p-2.5 bg-rose-100 rounded-2xl text-rose-500">
                        <Clock className="w-6 h-6 stroke-[2.5px]" />
                    </div>
                    Time
                </h4>
                <div className="flex flex-wrap gap-3">
                    {[
                        { value: "short", label: "Short", sub: "Under 5m" },
                        { value: "medium", label: "Medium", sub: "5-10m" },
                        { value: "long", label: "Long", sub: "Over 10m" },
                    ].map((opt) => {
                        const isSelected = filters.duration === opt.value;
                        return (
                            <button
                                key={opt.value}
                                onClick={() => onFilterChange("duration", isSelected ? undefined : opt.value)}
                                className={`px-6 py-3.5 rounded-full font-bold transition-all duration-200 active:scale-95 flex items-center gap-2.5 ${isSelected
                                        ? 'bg-rose-500 text-white shadow-lg shadow-rose-200 ring-4 ring-rose-50'
                                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                    }`}
                            >
                                <span className="text-base">{opt.label}</span>
                                <span className={`text-xs uppercase tracking-wide font-bold ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>{opt.sub}</span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Sort Section */}
            <div className="space-y-4">
                <h4 className="text-xl font-fredoka font-bold text-slate-800 flex items-center gap-3">
                    <div className="p-2.5 bg-sky-100 rounded-2xl text-sky-500">
                        <ArrowUpDown className="w-6 h-6 stroke-[2.5px]" />
                    </div>
                    Sort By
                </h4>
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { value: "newest", label: "Newest First", icon: Sparkles },
                        { value: "oldest", label: "Oldest First", icon: Scroll },
                        { value: "alphabetical", label: "A-Z", icon: Filter },
                        { value: "reading_time", label: "By Duration", icon: Clock },
                    ].map(opt => {
                        const isSelected = sortBy === opt.value;
                        const Icon = opt.icon;
                        return (
                            <button
                                key={opt.value}
                                onClick={() => onSortChange(opt.value)}
                                className={`flex items-center gap-3 p-4 rounded-3xl transition-all duration-200 text-left active:scale-95 ${isSelected
                                        ? 'bg-sky-50 text-sky-700 ring-2 ring-sky-200'
                                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                                    }`}
                            >
                                <div className={`p-2 rounded-full ${isSelected ? 'bg-sky-200' : 'bg-white'}`}>
                                    <Icon className={`w-4 h-4 ${isSelected ? 'text-sky-700' : 'text-slate-400'}`} />
                                </div>
                                <span className="text-sm font-bold font-fredoka">{opt.label}</span>
                            </button>
                        )
                    })}
                </div>
            </div>

            <button
                onClick={() => document.getElementById("close-drawer")?.click()}
                className="w-full py-5 mt-6 bg-slate-900 text-white rounded-3xl font-bold font-fredoka text-xl shadow-xl active:scale-95 transition-all hover:bg-slate-800"
            >
                Show Stories
            </button>
        </div>
    );

    return (
        <div className={`flex flex-col gap-6 w-full ${className}`}>
            {/* Primary Control Row: Magic Dock + Search (Desktop Grouping) */}
            <div className="flex flex-col md:flex-row items-center gap-6 w-full lg:px-2">

                {/* Collection Selector - "The Magic Dock" */}
                <div className="flex-1 flex justify-center md:justify-start w-full md:w-auto order-1">
                    <div className={clayVariants({ color: "white", shape: "pill", intensity: "medium" }) + " flex p-1.5 gap-1.5 border-2 border-white/60 shadow-clay-sm w-full md:w-auto max-w-lg md:max-w-none"}>
                        {visibleCollections.map((col) => {
                            const isActive = (filters.collection || "discovery") === col.id;
                            const Icon = col.icon;

                            return (
                                <motion.button
                                    key={col.id}
                                    onClick={() => onFilterChange("collection", col.id)}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={`flex-1 md:flex-initial flex items-center justify-center gap-2.5 px-4 md:px-7 py-3 rounded-full transition-all duration-300 relative group overflow-hidden`}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="active-collection-bg"
                                            className="absolute inset-0 bg-purple-50 rounded-full border border-purple-100 shadow-sm"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                    <div className="relative z-10 flex items-center gap-2.5 whitespace-nowrap">
                                        <Icon className={`w-5 h-5 stroke-[2.5px] transition-all duration-300 ${isActive ? 'text-purple-600 scale-110' : 'text-slate-400 group-hover:text-slate-600'}`} />
                                        <span className={`font-fredoka font-bold text-base md:text-lg transition-all duration-300 ${isActive ? 'text-purple-700' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                            {col.label}
                                        </span>
                                    </div>
                                </motion.button>
                            )
                        })}
                    </div>
                </div>

                {/* Search Bar - Integrated in Primary Row on Desktop */}
                <div className="w-full md:w-72 order-3 md:order-2 flex gap-3">
                    <div className={clayVariants({ color: "white", shape: "pill", intensity: "medium" }) + " flex items-center px-5 py-2 border-2 border-white/60 transition-all hover:scale-[1.02] focus-within:scale-[1.02] focus-within:ring-2 focus-within:ring-purple-200 focus-within:border-purple-300 shadow-clay-sm flex-1 h-14"}>
                        <div className="mr-3 text-purple-400">
                            <Search className="w-5 h-5 stroke-[3px]" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="Search..."
                            aria-label="Search stories"
                            className="bg-transparent border-none outline-none w-full text-slate-700 font-bold font-fredoka text-lg placeholder:text-slate-400/80 h-full"
                        />
                    </div>

                    {/* Mobile Filter Trigger (Condensed into search row on mobile) */}
                    <div className="md:hidden">
                        <Sheet>
                            <SheetTrigger asChild>
                                <button className={clayVariants({ color: "white", shape: "circle", intensity: "medium" }) + " relative w-14 h-14 flex items-center justify-center border-2 border-white/60 shadow-clay-sm active:scale-95 transition-transform"}>
                                    <Filter className="w-5 h-5 text-purple-500 stroke-[3px]" />
                                    {(filters.level || filters.type || filters.duration) && (
                                        <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-sm" />
                                    )}
                                </button>
                            </SheetTrigger>
                            <SheetContent side="bottom" className="rounded-t-[40px] border-none bg-white shadow-2xl h-[90vh]">
                                <SheetClose id="close-drawer" className="hidden" />
                                <SheetHeader className="mb-4 pt-4">
                                    <div className="mx-auto w-12 h-1.5 bg-slate-100 rounded-full mb-4" />
                                    <SheetTitle className="text-3xl font-fredoka text-center text-slate-800">Filters</SheetTitle>
                                    <SheetDescription className="text-center font-nunito text-lg font-bold text-slate-400">
                                        Magical adjustments
                                    </SheetDescription>
                                </SheetHeader>
                                {renderMobileDrawerContent()}
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </div>

            {/* Secondary Filter Row: Desktop Specific Dropdowns */}
            <div className="hidden md:flex items-center gap-4 flex-wrap justify-start lg:px-2">
                {renderDesktopFilters()}
            </div>

            {/* Categories Grid - Only visible in Discovery Mode */}
            {onCategoryChange && (!filters.collection || filters.collection === 'discovery') && (
                <div className="w-full">
                    {/* Mobile Grid Layout */}
                    <div className="md:hidden">
                        <div className="grid grid-cols-4 gap-y-6 gap-x-2 transition-all duration-300 ease-in-out">
                            {(isCategoryExpanded ? CATEGORIES : CATEGORIES.slice(0, 8)).map((cat) => {
                                const isActive = activeCategory === cat.id;
                                const Icon = cat.icon;

                                return (
                                    <motion.button
                                        key={cat.id}
                                        onClick={() => onCategoryChange(cat.id)}
                                        whileTap={{ scale: 0.95 }}
                                        className="flex flex-col items-center gap-2 relative group"
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="mobile-category-glow"
                                                className="absolute -inset-2 bg-purple-100/50 rounded-full blur-xl -z-10"
                                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                            />
                                        )}
                                        <div className={clayVariants({
                                            color: isActive ? "purple" : "white",
                                            shape: "circle",
                                            intensity: isActive ? "high" : "medium"
                                        }) + ` w-14 h-14 border-2 transition-all duration-300 ${isActive ? 'border-purple-300 scale-110' : 'border-white'} flex items-center justify-center shadow-clay-sm`}>
                                            <Icon className={`w-6 h-6 stroke-[2.5px] ${cat.iconClass} transition-all duration-300 ${isActive ? 'opacity-100 scale-110' : 'opacity-70 saturate-[0.8]'}`} />
                                        </div>
                                        <span className={`text-[10px] sm:text-xs font-bold font-fredoka truncate w-full text-center transition-all ${isActive ? 'text-purple-600 scale-110' : 'text-slate-400'}`}>
                                            {cat.label}
                                        </span>
                                    </motion.button>
                                );
                            })}
                        </div>
                        {CATEGORIES.length > 8 && (
                            <button
                                onClick={() => setIsCategoryExpanded(!isCategoryExpanded)}
                                className="w-full mt-4 text-center text-sm font-bold text-purple-500 py-2"
                            >
                                {isCategoryExpanded ? "Show Less" : "View All Categories"}
                            </button>
                        )}
                    </div>

                    {/* Desktop Flex Layout (Existing) */}
                    <div className="hidden md:flex flex-wrap gap-5 justify-start py-6 relative">
                        {CATEGORIES.map((cat) => {
                            const isActive = activeCategory === cat.id;
                            const Icon = cat.icon;

                            return (
                                <motion.button
                                    key={cat.id}
                                    onClick={() => onCategoryChange(cat.id)}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className={`flex flex-col items-center gap-3 min-w-[90px] group relative py-3`}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="category-liquid-bg"
                                            className="absolute inset-0 bg-white rounded-3xl shadow-clay-md -z-10"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                    <div className={clayVariants({
                                        color: isActive ? "purple" : "white",
                                        shape: "circle",
                                        intensity: isActive ? "high" : "medium"
                                    }) + ` w-16 h-16 border-[3px] transition-all duration-300 ${isActive ? 'border-purple-200' : 'border-white group-hover:border-purple-50'} relative flex items-center justify-center`}>
                                        <div className={`relative p-2 transition-all duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
                                            <Icon className={`w-8 h-8 stroke-[2.5px] drop-shadow-sm transition-all duration-300 ${cat.iconClass} ${isActive ? 'opacity-100 saturate-110' : 'opacity-60 saturate-[0.8]'}`} />
                                        </div>
                                    </div>
                                    <span className={`text-sm font-bold font-fredoka transition-all duration-300 whitespace-nowrap ${isActive ? 'text-purple-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                        {cat.label}
                                    </span>
                                </motion.button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
