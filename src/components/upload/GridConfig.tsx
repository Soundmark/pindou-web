"use client";

import { useState } from "react";
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
  const [width, setWidth] = useState(initialWidth);
  const [height, setHeight] = useState(initialHeight);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <label className="mb-2 block text-sm font-medium text-text-primary">
            Grid Width: <span className="text-primary font-bold">{width}</span> beads
          </label>
          <input
            type="range"
            min={10}
            max={100}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="mt-1 flex justify-between text-xs text-text-muted">
            <span>10</span>
            <span>100</span>
          </div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-text-primary">
            Grid Height: <span className="text-primary font-bold">{height}</span> beads
          </label>
          <input
            type="range"
            min={10}
            max={100}
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="mt-1 flex justify-between text-xs text-text-muted">
            <span>10</span>
            <span>100</span>
          </div>
        </div>
      </div>
      <p className="text-sm text-text-secondary">
        Total beads: <span className="font-semibold">{width * height}</span>
      </p>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button onClick={() => onGenerate(width, height)}>
          Generate Pattern
        </Button>
      </div>
    </div>
  );
}