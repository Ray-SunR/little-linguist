import React, { useState } from "react";
import { Wand2 } from "lucide-react";
import { cn } from "@/lib/core";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { CATEGORIES } from "./toolbar-constants";

interface CategoryPickerProps {
    activeCategory: string;
    onCategoryChange: (id: string) => void;
}

export function CategoryPicker({
    activeCategory,
    onCategoryChange,
}: CategoryPickerProps) {
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);

    const selectedCategoryObj = CATEGORIES.find(c => c.id === activeCategory) || CATEGORIES[0];
    const CategoryIcon = selectedCategoryObj.icon;

    return (
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
                            onClick={() => onCategoryChange("all")}
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
                                        onCategoryChange(cat.id);
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
    );
}
