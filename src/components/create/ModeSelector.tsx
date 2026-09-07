"use client";

import { useTranslations } from "next-intl";
import { GridSquareIcon, LayersIcon, PhotoIcon } from "@/components/editor/icons";

export type CreateMode = "convert" | "underlay" | "blank";

interface ModeSelectorProps {
  onSelectMode: (mode: CreateMode) => void;
}

export function ModeSelector({ onSelectMode }: ModeSelectorProps) {
  const t = useTranslations("create");

  const modes: {
    key: CreateMode;
    title: string;
    desc: string;
    Icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { key: "convert", title: t("modeConvertTitle"), desc: t("modeConvertDesc"), Icon: PhotoIcon },
    { key: "underlay", title: t("modeUnderlayTitle"), desc: t("modeUnderlayDesc"), Icon: LayersIcon },
    { key: "blank", title: t("modeBlankTitle"), desc: t("modeBlankDesc"), Icon: GridSquareIcon },
  ];

  return (
    <div className="w-full">
      <p className="mb-6 text-center text-lg font-semibold text-text-primary">{t("modeTitle")}</p>
      <div className="grid gap-4 sm:grid-cols-3">
        {modes.map(({ key, title, desc, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => onSelectMode(key)}
            className="clay-press flex min-h-11 flex-col items-center gap-3 rounded-2xl border-[3px] border-clay-border bg-card-bg p-6 text-center shadow-card transition-[transform,box-shadow,border-color] duration-150 hover:border-clay-border-strong active:translate-y-1 active:shadow-button-secondary-pressed"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-primary-light bg-primary/15 text-primary-strong">
              <Icon className="h-7 w-7" />
            </span>
            <span className="font-heading text-base font-bold text-text-primary">{title}</span>
            <span className="text-sm text-text-secondary">{desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
