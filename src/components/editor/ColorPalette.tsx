"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { BEAD_PALETTE } from "@/utils/beadColors";

interface ColorPaletteProps {
  selectedColorId: number;
  recentColorIds: number[];
  onSelectColor: (id: number) => void;
}

export function ColorPalette({ selectedColorId, recentColorIds, onSelectColor }: ColorPaletteProps) {
  const t = useTranslations("editor");
  const groups = useMemo(
    () => Array.from(new Set(BEAD_PALETTE.map((c) => c.id[0]))),
    []
  );
  const [activeGroup, setActiveGroup] = useState<string>(groups[0] ?? "A");

  const groupColors = BEAD_PALETTE.map((color, index) => ({ color, index })).filter(
    ({ color }) => color.id[0] === activeGroup
  );

  return (
    <div className="flex flex-col gap-4">
      {recentColorIds.length > 0 && (
        <div>
          <p className="mb-2 text-sm text-text-secondary">{t("recentColors")}</p>
          <div className="flex flex-wrap gap-1">
            {recentColorIds.map((id) => {
              const color = BEAD_PALETTE[id];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectColor(id)}
                  aria-label={t("swatchAria", { id: color?.id ?? String(id) })}
                  title={color?.id}
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl border-[3px] transition-transform ${
                    selectedColorId === id
                      ? "border-primary/30 bg-primary/15 shadow-sm scale-105"
                      : "border-transparent"
                  }`}
                >
                  <span
                    className="h-7 w-7 rounded-full border border-gray-200"
                    style={{ backgroundColor: color?.hex ?? "#fff" }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div
        className="flex flex-wrap items-center gap-1 rounded-full border-[3px] border-clay-border bg-gray-100 p-1 shadow-inset"
        role="tablist"
      >
        {groups.map((group) => (
          <button
            key={group}
            type="button"
            role="tab"
            aria-selected={activeGroup === group}
            aria-label={t("paletteGroupAria", { group })}
            onClick={() => setActiveGroup(group)}
            className={`h-11 rounded-full px-4 text-sm font-semibold transition-colors ${
              activeGroup === group
                ? "bg-primary font-bold text-primary-ink shadow-button"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {group}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-6 gap-1 sm:grid-cols-9">
        {groupColors.map(({ color, index }) => (
          <button
            key={color.id}
            type="button"
            onClick={() => onSelectColor(index)}
            aria-label={t("swatchAria", { id: color.id })}
            title={color.id}
            aria-pressed={selectedColorId === index}
            className={`flex min-h-11 items-center justify-center rounded-2xl border-[3px] transition-transform ${
              selectedColorId === index
                ? "border-primary/30 bg-primary/15 shadow-sm scale-105"
                : "border-transparent"
            }`}
          >
            <span
              className="h-7 w-7 rounded-full border border-gray-200"
              style={{ backgroundColor: color.hex }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
