"use client";

import { useEffect } from "react";
import { useCanvas } from "@/hooks/useCanvas";
import { BEAD_PALETTE } from "@/utils/beadColors";
import { CANVAS_THEME, getLuminance } from "@/utils/canvasTheme";

interface PatternCanvasProps {
  pixels: number[][];
  cellSize?: number;
  highlightedColorId?: number | null;
  showLabels?: boolean;
}

export function PatternCanvas({
  pixels,
  cellSize = 20,
  highlightedColorId = null,
  showLabels = false,
}: PatternCanvasProps) {
  const { canvasRef } = useCanvas();

  useEffect(() => {
    if (pixels.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const h = pixels.length;
    const w = pixels[0].length;
    const cw = w * cellSize;
    const ch = h * cellSize;

    canvas.width = cw;
    canvas.height = ch;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isHighlighting = highlightedColorId !== null && highlightedColorId !== undefined;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const colorId = pixels[y][x];
        const color = BEAD_PALETTE[colorId];
        const px = x * cellSize;
        const py = y * cellSize;

        if (colorId < 0) {
          // 空格子（不贴珠）：迷你棋盘格，与白色珠子区分
          const q = Math.max(3, Math.floor(cellSize / 4));
          ctx.fillStyle = CANVAS_THEME.checkerDark;
          ctx.fillRect(px, py, q, q);
          ctx.fillRect(px + q, py + q, q, q);
        } else {
          // Set alpha for highlighting
          if (isHighlighting) {
            ctx.globalAlpha = colorId === highlightedColorId ? 1.0 : 0.25;
          }

          ctx.fillStyle = color?.hex ?? "#ffffff";
          ctx.fillRect(px, py, cellSize, cellSize);

          // Reset alpha
          ctx.globalAlpha = 1.0;
        }

        // Grid lines
        ctx.strokeStyle = CANVAS_THEME.gridLine;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(px, py, cellSize, cellSize);

        // Highlight border on matching cells
        if (isHighlighting && colorId === highlightedColorId) {
          ctx.strokeStyle = CANVAS_THEME.highlight;
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
        }

        // Labels
        if (showLabels && cellSize >= 20 && color) {
          const luminance = getLuminance(color.hex);
          ctx.fillStyle = luminance > 0.5 ? CANVAS_THEME.labelDark : CANVAS_THEME.labelLight;
          ctx.font = `${Math.max(8, cellSize * 0.4)}px monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(color.id, px + cellSize / 2, py + cellSize / 2);
        }
      }
    }
  }, [pixels, cellSize, canvasRef, highlightedColorId, showLabels]);

  if (pixels.length === 0) return null;

  const h = pixels.length;
  const w = pixels[0].length;
  const cw = w * cellSize;
  const ch = h * cellSize;

  return (
    <div className="overflow-auto rounded-3xl border-[3px] border-clay-border shadow-card">
      <canvas
        ref={canvasRef}
        width={cw}
        height={ch}
        className="bg-white"
        style={{ width: cw, height: ch }}
      />
    </div>
  );
}