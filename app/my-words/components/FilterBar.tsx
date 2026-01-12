import { motion } from "framer-motion";
import { cn } from "@/lib/core/utils/cn";
import { type WordCategory, type GroupBy } from "../hooks/useMyWordsViewModel";

interface FilterBarProps {
    activeCategory: WordCategory;
    setCategory: (c: WordCategory) => void;
    groupBy: GroupBy;
    setGroupBy: (g: GroupBy) => void;
}

export function FilterBar({ activeCategory, setCategory, groupBy, setGroupBy }: FilterBarProps) {
    return (
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-10">
            {/* Categories */}
            <div role="tablist" className="flex overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0 flex-nowrap md:flex-wrap items-center gap-3 w-full md:w-auto">
                {[
                    { id: "all", label: "All", color: "bg-purple-500", shadow: "shadow-clay-purple", icon: "🌈" },
                    { id: "new", label: "New", color: "bg-blue-500", shadow: "shadow-clay-blue", icon: "✨" },
                    { id: "review", label: "Ready", color: "bg-amber-500", shadow: "shadow-clay-amber", icon: "⭐" },
                ].map((cat) => (
                    <button
                        key={cat.id}
                        role="tab"
                        aria-selected={activeCategory === cat.id}
                        onClick={() => setCategory(cat.id as WordCategory)}
                        className={cn(
                            "relative flex items-center gap-2 px-6 py-3 rounded-2xl font-black font-fredoka text-xs uppercase tracking-wider transition-all border-4 whitespace-nowrap outline-none focus-visible:ring-4 ring-offset-2 ring-accent/30",
                            activeCategory === cat.id
                                ? `${cat.color} text-white ${cat.shadow} border-white shadow-xl scale-105`
                                : "bg-white/60 text-slate-400 border-white hover:bg-white hover:text-slate-600 shadow-sm"
                        )}
                    >
                        <span className="text-lg" aria-hidden="true">{cat.icon}</span>
                        {cat.label}
                    </button>
                ))}
            </div>

            <div className="h-10 w-px bg-slate-200 hidden md:block" />

            {/* Grouping */}
            <div className="flex overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0 flex-nowrap md:flex-wrap items-center gap-3 w-full md:w-auto">
                <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest mr-2 md:hidden">Group by:</span>
                {[
                    { id: "none", label: "No Group", icon: "📦" },
                    { id: "date", label: "By Date", icon: "📅" },
                    { id: "book", label: "By Book", icon: "📖" },
                    { id: "proficiency", label: "By Skill", icon: "🏆" },
                ].map((g) => (
                    <button
                        key={g.id}
                        onClick={() => setGroupBy(g.id as GroupBy)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl font-black font-fredoka text-[10px] uppercase tracking-wider transition-all border-2 outline-none focus-visible:ring-2 ring-accent",
                            groupBy === g.id
                                ? "bg-ink text-white border-white shadow-lg"
                                : "bg-white text-ink/40 border-slate-100 hover:bg-slate-50"
                        )}
                    >
                        <span aria-hidden="true">{g.icon}</span>
                        {g.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
