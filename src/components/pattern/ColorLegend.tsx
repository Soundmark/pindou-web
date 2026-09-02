"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("legend");
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

  const bold = (chunks: React.ReactNode) => (
    <span className="font-semibold text-text-primary">{chunks}</span>
  );

  return (
    <div className="w-full">
      <p className="mb-3 text-sm text-text-secondary">
        {t.rich("stats", {
          total: stats.total,
          colors: stats.entries.length,
          b: bold,
        })}
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
              className={`flex clay-press items-center gap-1.5 rounded-full border-[3px] px-3 py-1.5 text-sm min-h-[44px] ${
                isActive
                  ? "border-primary/30 bg-primary/15 shadow-sm scale-105"
                  : "border-clay-border bg-surface shadow-button-secondary"
              }`}
              aria-label={
                isActive
                  ? t("clearHighlightAria", { name: color?.name })
                  : t("highlightAria", { name: color?.name })
              }
            >
              <span
                className="inline-block h-4 w-4 rounded-sm border border-gray-200 flex-shrink-0"
                style={{ backgroundColor: color?.hex ?? "#fff" }}
              />
              <span
                className={`font-mono text-xs font-medium ${
                  isActive ? "text-primary-strong" : "text-text-primary"
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