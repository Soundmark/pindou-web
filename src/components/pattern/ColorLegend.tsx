"use client";

import { useMemo } from "react";
import { BEAD_PALETTE } from "@/utils/beadColors";

interface ColorLegendProps {
  pixels: number[][];
  highlightedColorId: number | null;
  onHighlightColor: (colorId: number | null) => void;
}

export function ColorLegend({
  pixels,
  highlightedColorId,
  onHighlightColor,
}: ColorLegendProps) {
  const stats = useMemo(() => {
    const countMap = new Map<number, number>();
    let total = 0;
    for (let y = 0; y < pixels.length; y++) {
      for (let x = 0; x < pixels[y].length; x++) {
        const colorId = pixels[y][x];
        countMap.set(colorId, (countMap.get(colorId) || 0) + 1);
        total++;
      }
    }
    const entries = Array.from(countMap.entries())
      .map(([colorId, count]) => {
        const color = BEAD_PALETTE[colorId];
        return { colorId, count, color };
      })
      .filter((e) => e.color)
      .sort((a, b) => b.count - a.count);
    return { entries, total };
  }, [pixels]);

  if (stats.entries.length === 0) return null;

  return (
    <div className="w-full">
      <p className="mb-3 text-sm text-text-secondary">
        <span className="font-semibold text-text-primary">{stats.total}</span>{" "}
        beads ·{" "}
        <span className="font-semibold text-text-primary">
          {stats.entries.length}
        </span>{" "}
        colors
      </p>
      <div className="flex flex-wrap gap-2">
        {stats.entries.map(({ colorId, count, color }) => {
          const isActive = highlightedColorId === colorId;
          return (
            <button
              key={colorId}
              onClick={() =>
                onHighlightColor(isActive ? null : colorId)
              }
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-all min-h-[44px] ${
                isActive
                  ? "bg-primary/15 ring-2 ring-primary shadow-sm scale-105"
                  : "bg-white hover:bg-gray-50 shadow-sm"
              }`}
              aria-label={
                isActive
                  ? `Clear highlight for ${color?.name}`
                  : `Highlight ${color?.name}`
              }
            >
              <span
                className="inline-block h-4 w-4 rounded-sm border border-gray-200 flex-shrink-0"
                style={{ backgroundColor: color?.hex ?? "#fff" }}
              />
              <span
                className={`font-mono text-xs font-medium ${
                  isActive ? "text-primary" : "text-text-primary"
                }`}
              >
                {color?.id}
              </span>
              <span className="text-xs text-text-muted">×{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}