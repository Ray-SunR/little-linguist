import { Sun, MousePointer2, BookOpen, ScrollText, Star, Wand2, Maximize2, Minimize2, Languages } from "lucide-react";
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
    isMaximized: boolean;
    onToggleMaximized: () => void;
    isDisabled?: boolean;
};

export default function ControlPanel({
    speed,
    onSpeedChange,
    viewMode,
    onViewModeChange,
    theme,
    onThemeToggle,
    isMaximized,
    onToggleMaximized,
    isDisabled = false,
}: ControlPanelProps) {
    const speedOptions: { speed: SpeedOption; label: string; emoji: string }[] = [
        { speed: 0.75, label: "HIKE", emoji: "🐢" },
        { speed: 1, label: "NORMAL", emoji: "⭐" },
        { speed: 1.5, label: "RUN", emoji: "🏃" },
        { speed: 2, label: "ROCKET", emoji: "🚀" },
    ];

    return (
        <div className="w-full max-w-sm rounded-[2rem] bg-white/90 dark:bg-[#1c1f2f]/95 backdrop-blur-xl p-6 shadow-xl transition-all duration-300 border-2 border-purple-100 dark:border-white/10">
            <div className="flex items-center justify-between mb-6 px-1">
                <h2 className="text-[13px] font-fredoka font-black tracking-widest text-ink dark:text-white/90 uppercase text-accent/80">
                    READING TEMPO
                </h2>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 dark:bg-purple-900/30">
                    <span className="text-[10px] font-fredoka font-bold text-purple-400 dark:text-purple-300 uppercase">SET TO</span>
                    <span className="text-sm font-fredoka font-black text-accent dark:text-purple-200">{speed}x</span>
                </div>
            </div>

            {/* Speed Selector Row */}
            <div className="bg-purple-100/80 dark:bg-[#151525] rounded-[2rem] p-1.5 flex gap-1 mb-8">
                {speedOptions.map((opt) => {
                    const isActive = speed === opt.speed;
                    return (
                        <button
                            key={opt.speed}
                            onClick={() => onSpeedChange(opt.speed)}
                            disabled={isDisabled}
                            className={`flex-1 flex flex-col items-center justify-center py-4 px-2 rounded-[1.8rem] transition-all duration-300 ${isActive
                                ? "bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-lg transform scale-105 z-10"
                                : "text-purple-700 dark:text-slate-500 hover:bg-white/80 dark:hover:bg-[#252535]"
                                }`}
                        >
                            <span className={`text-2xl mb-1 ${isActive ? "brightness-110" : "grayscale opacity-60"}`}>
                                {opt.emoji}
                            </span>
                            <span className={`text-[10px] font-fredoka font-black tracking-wide ${isActive ? "text-white" : "text-purple-700 dark:text-slate-500"}`}>
                                {opt.label}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="flex gap-4">
                {/* View Mode Toggle */}
                <div className="flex-1 bg-purple-100/80 dark:bg-[#151525] rounded-full p-1.5 flex gap-1 items-center">
                    <button
                        onClick={() => onViewModeChange("continuous")}
                        className={`flex-1 flex items-center justify-center gap-1 py-2.5 px-3 rounded-full font-fredoka font-black text-[10px] uppercase transition-all ${viewMode === "continuous"
                            ? "bg-gradient-to-r from-purple-500 to-purple-700 text-white shadow-md"
                            : "text-purple-700 dark:text-slate-400 hover:bg-white/80 dark:hover:bg-[#252535]"
                            }`}
                        title="Slide view (Horizontal)"
                    >
                        <MousePointer2 className={`w-3.5 h-3.5 ${viewMode === "continuous" ? "fill-white text-white" : "text-purple-700 dark:text-slate-400"}`} />
                        SLIDE
                    </button>
                    <button
                        onClick={() => onViewModeChange("spread")}
                        className={`flex-1 flex items-center justify-center gap-1 py-2.5 px-3 rounded-full font-fredoka font-black text-[10px] uppercase transition-all ${viewMode === "spread"
                            ? "bg-gradient-to-r from-purple-500 to-purple-700 text-white shadow-md"
                            : "text-purple-700 dark:text-slate-400 hover:bg-white/80 dark:hover:bg-[#252535]"
                            }`}
                        title="Flip view (2-page Spread)"
                    >
                        <BookOpen className={`w-3.5 h-3.5 ${viewMode === "spread" ? "fill-white text-white" : "text-purple-700 dark:text-slate-400"}`} />
                        FLIP
                    </button>
                    <button
                        onClick={() => onViewModeChange("scroll")}
                        className={`flex-1 flex items-center justify-center gap-1 py-2.5 px-3 rounded-full font-fredoka font-black text-[10px] uppercase transition-all ${viewMode === "scroll"
                            ? "bg-gradient-to-r from-purple-500 to-purple-700 text-white shadow-md"
                            : "text-purple-700 dark:text-slate-400 hover:bg-white/80 dark:hover:bg-[#252535]"
                            }`}
                        title="Scroll view (Vertical)"
                    >
                        <ScrollText className={`w-3.5 h-3.5 ${viewMode === "scroll" ? "fill-white text-white" : "text-purple-700 dark:text-slate-400"}`} />
                        SCROLL
                    </button>
                </div>

                {/* Theme Toggle Button */}
                <button
                    onClick={onThemeToggle}
                    className="w-14 h-14 rounded-[1.5rem] flex items-center justify-center bg-gradient-to-br from-yellow-200 to-orange-200 text-orange-500 shadow-md hover:shadow-lg transition-all active:scale-95 border-2 border-yellow-100 dark:from-[#252535] dark:to-[#353545] dark:border-purple-900/50 dark:text-yellow-400"
                    aria-label="Toggle theme"
                    title="Toggle theme"
                >
                    <Sun className="w-6 h-6 fill-current" />
                </button>

                {/* Fullscreen Toggle Button */}
                <button
                    onClick={onToggleMaximized}
                    className="w-14 h-14 rounded-[1.5rem] flex items-center justify-center bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-md hover:shadow-lg transition-all active:scale-95 border-2 border-purple-400/30"
                    aria-label={isMaximized ? "Restore size" : "Fill screen"}
                    title={isMaximized ? "Restore size" : "Fill screen"}
                >
                    {isMaximized ? (
                        <Minimize2 className="w-6 h-6" />
                    ) : (
                        <Maximize2 className="w-6 h-6" />
                    )}
                </button>
            </div>

            {/* Mobile-only secondary actions */}
            <div className="mt-6 pt-6 border-t border-purple-100 dark:border-white/10 flex flex-col gap-3 sm:hidden">
                <Link
                    href="/my-words"
                    className="flex items-center gap-3 w-full p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border-2 border-indigo-200 dark:border-indigo-800/30 text-ink dark:text-white font-bold transition-all active:scale-[0.98]"
                >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center shadow-md">
                        <Languages className="w-4 h-4 text-white" />
                    </div>
                    MY VOCABULARY COLLECTION
                </Link>
                <Link
                    href="/story-maker"
                    className="flex items-center gap-3 w-full p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-800/30 text-ink dark:text-white font-bold transition-all active:scale-[0.98]"
                >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shadow-md">
                        <Wand2 className="w-4 h-4 text-white" />
                    </div>
                    CREATE A STORY
                </Link>
            </div>
        </div>
    );
}

