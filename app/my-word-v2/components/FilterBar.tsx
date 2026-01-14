import { motion } from "framer-motion";
import { cn } from "@/lib/core/utils/cn";
import { type WordCategory, type GroupBy } from "../hooks/useMyWordsV2ViewModel";

interface FilterBarProps {
    activeCategory: WordCategory;
    setCategory: (c: WordCategory) => void;
    groupBy: GroupBy;
    setGroupBy: (g: GroupBy) => void;
}

export function FilterBar({ activeCategory, setCategory, groupBy, setGroupBy }: FilterBarProps) {
    return (
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
            {/* Categories - Sleek Pills */}
            <div className="flex bg-slate-100/50 p-1.5 rounded-[1.5rem] w-full md:w-auto relative overflow-hidden backdrop-blur-sm">
                {[
                    { id: "all", label: "All Words", icon: "🌈" },
                    { id: "new", label: "New", icon: "✨" },
                    { id: "review", label: "Ready", icon: "⭐" },
                ].map((cat) => {
                    const isActive = activeCategory === cat.id;
                    return (
                        <button
                            key={cat.id}
                            onClick={() => setCategory(cat.id as WordCategory)}
                            aria-pressed={isActive}
                            className={cn(
                                "relative flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-[1.2rem] font-bold text-sm transition-all duration-300 outline-none focus-visible:ring-2 ring-indigo-500/30",
                                isActive
                                    ? "bg-white text-indigo-600 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                            )}
                        >
                            <span className="text-base">{cat.icon}</span>
                            <span>{cat.label}</span>
                        </button>
                    )
                })}
            </div>

            {/* Separator - Hidden on mobile */}
            {/* <div className="h-px w-full md:w-px md:h-10 bg-gradient-to-r md:bg-gradient-to-b from-transparent via-slate-200 to-transparent" /> */}

            {/* Grouping - Minimalist Toggles */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-center md:justify-end">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2 hidden md:inline-block">View:</span>
                {[
                    { id: "none", label: "Grid", icon: "📦" },
                    { id: "date", label: "Date", icon: "📅" },
                    { id: "book", label: "Book", icon: "📖" },
                    { id: "proficiency", label: "Skill", icon: "🏆" },
                ].map((g) => {
                    const isActive = groupBy === g.id;
                    return (
                        <button
                            key={g.id}
                            onClick={() => setGroupBy(g.id as GroupBy)}
                            aria-pressed={isActive}
                            className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-xl font-bold text-xs transition-all border outline-none",
                                isActive
                                    ? "bg-indigo-50 text-indigo-600 border-indigo-200 shadow-sm"
                                    : "bg-transparent text-slate-400 border-transparent hover:bg-slate-50 hover:text-slate-600"
                            )}
                            title={g.label}
                        >
                            <span className="text-sm">{g.icon}</span>
                            <span className="hidden sm:inline">{g.label}</span>
                        </button>
                    )
                })}
            </div>
        </div>
    );
}
