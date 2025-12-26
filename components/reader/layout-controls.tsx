"use client";

import { BookOpen, ScrollText, LayoutGrid, Columns2 } from "lucide-react";
import type { ViewMode, FlowMode } from "../../lib/types";

type LayoutControlsProps = {
  viewMode: ViewMode;
  flowMode: FlowMode;
  onViewModeChange: (mode: ViewMode) => void;
  onFlowModeChange: (mode: FlowMode) => void;
};

export default function LayoutControls({
  viewMode,
  flowMode,
  onViewModeChange,
  onFlowModeChange,
}: LayoutControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* View Mode Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-ink-muted">View:</span>
        <div className="inline-flex rounded-lg bg-white/50 p-1 shadow-soft">
          <button
            type="button"
            onClick={() => onViewModeChange("single")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-all ${
              viewMode === "single"
                ? "bg-white text-ink shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
            aria-label="Single page view"
            aria-pressed={viewMode === "single"}
          >
            <BookOpen className="h-4 w-4" aria-hidden />
            <span>Single</span>
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("spread")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-all ${
              viewMode === "spread"
                ? "bg-white text-ink shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
            aria-label="Two-page spread view"
            aria-pressed={viewMode === "spread"}
          >
            <Columns2 className="h-4 w-4" aria-hidden />
            <span>Spread</span>
          </button>
        </div>
      </div>

      {/* Flow Mode Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-ink-muted">Flow:</span>
        <div className="inline-flex rounded-lg bg-white/50 p-1 shadow-soft">
          <button
            type="button"
            onClick={() => onFlowModeChange("paged")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-all ${
              flowMode === "paged"
                ? "bg-white text-ink shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
            aria-label="Paged flow"
            aria-pressed={flowMode === "paged"}
          >
            <LayoutGrid className="h-4 w-4" aria-hidden />
            <span>Paged</span>
          </button>
          <button
            type="button"
            onClick={() => onFlowModeChange("continuous")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-all ${
              flowMode === "continuous"
                ? "bg-white text-ink shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
            aria-label="Continuous scroll"
            aria-pressed={flowMode === "continuous"}
          >
            <ScrollText className="h-4 w-4" aria-hidden />
            <span>Continuous</span>
          </button>
        </div>
      </div>
    </div>
  );
}
