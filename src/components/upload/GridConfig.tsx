"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

interface GridConfigProps {
  onGenerate: (width: number, height: number) => void;
  onBack: () => void;
  initialWidth?: number;
  initialHeight?: number;
}

export function GridConfig({
  onGenerate,
  onBack,
  initialWidth = 32,
  initialHeight = 32,
}: GridConfigProps) {
  const t = useTranslations("grid");
  const tc = useTranslations("common");
  const [width, setWidth] = useState(initialWidth);
  const [height, setHeight] = useState(initialHeight);

  const bold = (chunks: React.ReactNode) => (
    <span className="font-heading font-bold text-primary-strong">{chunks}</span>
  );

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <label className="mb-2 block text-sm font-medium text-text-primary">
            {t.rich("gridWidth", { width, b: bold })}
          </label>
          <input
            type="range"
            min={10}
            max={100}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            className="clay-slider w-full"
          />
          <div className="mt-1 flex justify-between text-xs text-text-muted">
            <span>10</span>
            <span>100</span>
          </div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-text-primary">
            {t.rich("gridHeight", { height, b: bold })}
          </label>
          <input
            type="range"
            min={10}
            max={100}
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
            className="clay-slider w-full"
          />
          <div className="mt-1 flex justify-between text-xs text-text-muted">
            <span>10</span>
            <span>100</span>
          </div>
        </div>
      </div>
      <p className="text-sm text-text-secondary">
        {t.rich("totalBeads", { count: width * height, b: bold })}
      </p>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack}>
          {tc("back")}
        </Button>
        <Button onClick={() => onGenerate(width, height)}>
          {t("generate")}
        </Button>
      </div>
    </div>
  );
}