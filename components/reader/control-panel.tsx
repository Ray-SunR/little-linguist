import { Sun, MousePointer2, BookOpen, ScrollText, Star, Wand2 } from "lucide-react";
import Link from "next/link";
import type { ViewMode } from "@/lib/core";
import type { SpeedOption } from "@/lib/features/narration/internal/speed-options";

type ControlPanelProps = {
    speed: SpeedOption;
    onSpeedChange: (speed: SpeedOption) => void;
    viewMode: ViewMode;
    onViewModeChange: (mode: ViewMode) => void;
    theme: "light" | "dark";
    onThemeToggle: () => void;
    isDisabled?: boolean;
};

export default function ControlPanel({
    speed,
    onSpeedChange,
    viewMode,
    onViewModeChange,
    theme,
    onThemeToggle,
    isDisabled = false,
}: ControlPanelProps) {
    const speedOptions: { speed: SpeedOption; label: string; emoji: string; color: string }[] = [
        { speed: 0.75, label: "HIKE", emoji: "🐢", color: "#A5D6A7" },
        { speed: 1, label: "NORMAL", emoji: "⭐", color: "#0AA3FF" },
        { speed: 1.5, label: "RUN", emoji: "🏃", color: "#FFB74D" },
        { speed: 2, label: "ROCKET", emoji: "🚀", color: "#EF5350" },
    ];

    return (
        <div className="w-full max-w-sm rounded-[2rem] bg-card p-6 shadow-strong transition-all duration-300 border-2 border-[#E9E9F0] dark:border-white/10">
            <div className="flex items-center justify-between mb-6 px-1">
                <h2 className="text-[13px] font-black tracking-widest text-[#2f3352] dark:text-[#E0E0E0] uppercase">
                    READING TEMPO
                </h2>
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">SET TO</span>
                    <span className="text-sm font-black text-[#2f3352] dark:text-white">{speed}x</span>
                </div>
            </div>

            {/* Speed Selector Row */}
            <div className="bg-[#F5F7FA] dark:bg-[#151525] rounded-[2rem] p-1.5 flex gap-1 mb-8">
                {speedOptions.map((opt) => {
                    const isActive = speed === opt.speed;
                    return (
                        <button
                            key={opt.speed}
                            onClick={() => onSpeedChange(opt.speed)}
                            disabled={isDisabled}
                            className={`flex-1 flex flex-col items-center justify-center py-4 px-2 rounded-[1.8rem] transition-all duration-300 ${isActive
                                ? "bg-[#0AA3FF] text-white shadow-lg transform scale-105 z-10"
                                : "text-slate-400 dark:text-slate-500 hover:bg-white dark:hover:bg-[#252535]"
                                }`}
                        >
                            <span className={`text-2xl mb-1 ${isActive ? "brightness-110" : "grayscale opacity-60"}`}>
                                {opt.emoji}
                            </span>
                            <span className={`text-[10px] font-black tracking-wide ${isActive ? "text-white" : "text-slate-400 dark:text-slate-500"}`}>
                                {opt.label}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="flex gap-4">
                {/* View Mode Toggle */}
                <div className="flex-1 bg-[#F5F7FA] dark:bg-[#151525] rounded-full p-1.5 flex gap-1 items-center">
                    <button
                        onClick={() => onViewModeChange("continuous")}
                        className={`flex-1 flex items-center justify-center gap-1 py-2.5 px-3 rounded-full font-black text-[10px] transition-all ${viewMode === "continuous"
                            ? "bg-[#0AA3FF] text-white shadow-md font-black"
                            : "text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-[#252535]"
                            }`}
                        title="Slide view (Horizontal)"
                    >
                        <MousePointer2 className={`w-3.5 h-3.5 ${viewMode === "continuous" ? "fill-white" : ""}`} />
                        SLIDE
                    </button>
                    <button
                        onClick={() => onViewModeChange("spread")}
                        className={`flex-1 flex items-center justify-center gap-1 py-2.5 px-3 rounded-full font-black text-[10px] transition-all ${viewMode === "spread"
                            ? "bg-[#0AA3FF] text-white shadow-md font-black"
                            : "text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-[#252535]"
                            }`}
                        title="Flip view (2-page Spread)"
                    >
                        <BookOpen className={`w-3.5 h-3.5 ${viewMode === "spread" ? "fill-white" : ""}`} />
                        FLIP
                    </button>
                    <button
                        onClick={() => onViewModeChange("scroll")}
                        className={`flex-1 flex items-center justify-center gap-1 py-2.5 px-3 rounded-full font-black text-[10px] transition-all ${viewMode === "scroll"
                            ? "bg-[#0AA3FF] text-white shadow-md font-black"
                            : "text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-[#252535]"
                            }`}
                        title="Scroll view (Vertical)"
                    >
                        <ScrollText className={`w-3.5 h-3.5 ${viewMode === "scroll" ? "fill-white" : ""}`} />
                        SCROLL
                    </button>
                </div>

                {/* Theme Toggle Button */}
                <button
                    onClick={onThemeToggle}
                    className="w-14 h-14 rounded-[1.5rem] flex items-center justify-center bg-[#FFF9C4] text-[#FBC02D] shadow-sm hover:shadow-md transition-all active:scale-95 border-2 border-[#FFF59D] dark:bg-[#252535] dark:border-[#353545] dark:text-[#FFD740]"
                    aria-label="Toggle theme"
                >
                    <Sun className="w-6 h-6 fill-current" />
                </button>
            </div>

            {/* Mobile-only secondary actions */}
            <div className="mt-6 pt-6 border-t border-[#E9E9F0] dark:border-white/10 flex flex-col gap-3 sm:hidden">
                <Link
                    href="/my-words"
                    className="flex items-center gap-3 w-full p-4 rounded-2xl bg-white dark:bg-[#252535] border border-[#E9E9F0] dark:border-white/10 text-ink dark:text-white font-bold"
                >
                    <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                        <Star className="w-4 h-4 text-yellow-600 dark:text-yellow-400 fill-current" />
                    </div>
                    MY WORD COLLECTION
                </Link>
                <Link
                    href="/story-maker"
                    className="flex items-center gap-3 w-full p-4 rounded-2xl bg-white dark:bg-[#252535] border border-[#E9E9F0] dark:border-white/10 text-ink dark:text-white font-bold"
                >
                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <Wand2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    CREATE A STORY
                </Link>
            </div>
        </div>
    );
}
