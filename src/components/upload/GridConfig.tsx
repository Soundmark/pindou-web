"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

interface GridConfigProps {
  onGenerate: (width: number, height: number) => void;
  onBack: () => void;
  initialWidth?: number;
  initialHeight?: number;
  /** 覆盖默认的"生成图案"按钮文案（空白/底图模式为"进入编辑器"） */
  generateLabel?: string;
  /** 额外配置区（底图模式的起步方式单选由页面注入） */
  startModeSlot?: React.ReactNode;
}

export function GridConfig({
  onGenerate,
  onBack,
  initialWidth = 32,
  initialHeight = 32,
  generateLabel,
  startModeSlot,
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
      {startModeSlot}
      <p className="text-sm text-text-secondary">
        {t.rich("totalBeads", { count: width * height, b: bold })}
      </p>
      <div className="flex justify-center gap-3">
        <Button variant="secondary" onClick={onBack}>
          {tc("back")}
        </Button>
        <Button onClick={() => onGenerate(width, height)}>
          {generateLabel ?? t("generate")}
        </Button>
      </div>
    </div>
  );
}