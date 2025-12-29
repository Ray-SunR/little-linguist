"use client";

import { BookOpen, MousePointer2, ScrollText } from "lucide-react";
import type { ViewMode } from "@/lib/core";

type LayoutControlsProps = {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
};

export default function LayoutControls({
  viewMode,
  onViewModeChange,
}: LayoutControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold text-ink-muted">View:</span>
      <div className="inline-flex rounded-lg bg-white/50 p-1 shadow-soft">
        <button
          type="button"
          onClick={() => onViewModeChange("continuous")}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-all ${viewMode === "continuous"
            ? "bg-white text-ink shadow-sm"
            : "text-ink-muted hover:text-ink"
            }`}
          aria-label="Slide view"
          aria-pressed={viewMode === "continuous"}
        >
          <MousePointer2 className="h-4 w-4" aria-hidden />
          <span>Slide</span>
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange("spread")}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-all ${viewMode === "spread"
            ? "bg-white text-ink shadow-sm"
            : "text-ink-muted hover:text-ink"
            }`}
          aria-label="Book spread view"
          aria-pressed={viewMode === "spread"}
        >
          <BookOpen className="h-4 w-4" aria-hidden />
          <span>Flip</span>
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange("scroll")}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-all ${viewMode === "scroll"
            ? "bg-white text-ink shadow-sm"
            : "text-ink-muted hover:text-ink"
            }`}
          aria-label="Continuous scroll view"
          aria-pressed={viewMode === "scroll"}
        >
          <ScrollText className="h-4 w-4" aria-hidden />
          <span>Scroll</span>
        </button>
      </div>
    </div>
  );
}
