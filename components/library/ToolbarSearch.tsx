import React from "react";
import { Search } from "lucide-react";
import { motion } from "framer-motion";

interface ToolbarSearchProps {
    searchQuery: string;
    onSearchChange: (val: string) => void;
}

export function ToolbarSearch({ searchQuery, onSearchChange }: ToolbarSearchProps) {
    return (
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
    );
}

interface ToolbarSearchTriggerProps {
    onClick: () => void;
}

export function ToolbarSearchTrigger({ onClick }: ToolbarSearchTriggerProps) {
    return (
        <button
            onClick={onClick}
            className="lg:hidden p-2 rounded-xl bg-purple-50/30 border border-purple-100/50 text-purple-600/70 hover:bg-purple-50 hover:text-purple-600 transition-all active:scale-95 cursor-pointer"
        >
            <Search className="w-5 h-5" />
        </button>
    );
}

interface ToolbarExpandedSearchProps {
    searchQuery: string;
    onSearchChange: (val: string) => void;
    onCancel: () => void;
}

export function ToolbarExpandedSearch({
    searchQuery,
    onSearchChange,
    onCancel
}: ToolbarExpandedSearchProps) {
    return (
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
                onClick={onCancel}
                className="font-fredoka font-black text-slate-400 hover:text-slate-600 px-2 transition-colors"
            >
                Cancel
            </button>
        </motion.div>
    );
}
