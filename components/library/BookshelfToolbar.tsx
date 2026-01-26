"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/core";
import {
    ArrowUpDown,
    Rocket,
    Clock,
    Baby,
} from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

import { PageToolbar } from "@/components/layout/page-toolbar";
import { 
    LEVEL_OPTIONS, 
    TYPE_OPTIONS, 
    DURATION_OPTIONS 
} from "./toolbar-constants";
import { CollectionTabs } from "./CollectionTabs";
import { CategoryPicker } from "./CategoryPicker";
import { ToolbarSearch, ToolbarSearchTrigger, ToolbarExpandedSearch } from "./ToolbarSearch";
import { FilterSelect } from "./FilterSelect";
import { MobileFilters } from "./MobileFilters";

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
}: BookshelfToolbarProps) {
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);

    const activeCollection = filters.collection || 'discovery';
    const activeCategory = filters.category || 'all';

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
                                <CollectionTabs
                                    activeCollection={activeCollection}
                                    onCollectionChange={(id) => onFilterChange("collection", id)}
                                    currentUserId={currentUserId}
                                />

                                {/* Desktop Filters Group (Now includes Category) */}
                                <div className="hidden lg:flex items-center gap-2 ml-2 border-l border-purple-100 pl-3">
                                    {/* Category Dropdown (Filter) */}
                                    <CategoryPicker
                                        activeCategory={activeCategory}
                                        onCategoryChange={(id) => onFilterChange("category", id)}
                                    />

                                    <FilterSelect
                                        value={filters.level}
                                        onChange={(v: string | undefined) => onFilterChange("level", v)}
                                        prefix="Level"
                                        placeholder="Level"
                                        icon={Baby}
                                        options={LEVEL_OPTIONS}
                                    />
                                    <FilterSelect
                                        value={filters.type}
                                        onChange={(v: string | undefined) => onFilterChange("type", v)}
                                        prefix="Type"
                                        placeholder="Type"
                                        icon={Rocket}
                                        options={TYPE_OPTIONS}
                                    />
                                    <FilterSelect
                                        value={filters.duration}
                                        onChange={(v: string | undefined) => onFilterChange("duration", v)}
                                        prefix="Time"
                                        placeholder="Time"
                                        icon={Clock}
                                        options={DURATION_OPTIONS}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: Search & Actions */}
                        <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                            {/* Desktop Search - Hidden on small mobile */}
                            <ToolbarSearch
                                searchQuery={searchQuery}
                                onSearchChange={onSearchChange}
                            />


                            {/* Mobile Filters Trigger */}
                            <MobileFilters 
                                filters={filters}
                                onFilterChange={onFilterChange}
                            />

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
                                                    {sortBy === option.id && sortBy !== 'relevance' && (
                                                        <div
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc');
                                                            }}
                                                            className="p-1 hover:bg-indigo-100 rounded-md transition-colors cursor-pointer"
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
                            <ToolbarSearchTrigger onClick={() => setIsSearchExpanded(true)} />
                        </div>
                    </motion.div>
                ) : (
                    <ToolbarExpandedSearch
                        searchQuery={searchQuery}
                        onSearchChange={onSearchChange}
                        onCancel={() => setIsSearchExpanded(false)}
                    />
                )}
            </AnimatePresence>
        </PageToolbar>
    );
}

