"use client";

import { useTranslations } from "next-intl";
import { EyeIcon, EyeOffIcon } from "./icons";

interface UnderlayControlsProps {
  visible: boolean;
  opacity: number;
  onToggleVisible: () => void;
  onOpacityChange: (opacity: number) => void;
}

export function UnderlayControls({ visible, opacity, onToggleVisible, onOpacityChange }: UnderlayControlsProps) {
  const t = useTranslations("editor");

  return (
    <div className="flex w-full max-w-md flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <button
        type="button"
        onClick={onToggleVisible}
        aria-pressed={visible}
        className={`flex min-h-11 items-center justify-center gap-2 rounded-full border-[3px] px-4 text-sm font-semibold transition-colors ${
          visible
            ? "border-primary-light bg-primary text-primary-ink shadow-button"
            : "border-clay-border bg-surface text-text-secondary shadow-button-secondary"
        }`}
      >
        {visible ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
        {visible ? t("underlayHide") : t("underlayShow")}
      </button>
      <label className="flex flex-1 items-center gap-3 text-sm text-text-secondary">
        <span className="whitespace-nowrap">{t("underlayOpacity")}</span>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(opacity * 100)}
          onChange={(e) => onOpacityChange(Number(e.target.value) / 100)}
          className="clay-slider w-full"
          aria-label={t("underlayOpacity")}
        />
      </label>
    </div>
  );
}
