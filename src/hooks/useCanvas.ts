"use client";

import { useRef, useCallback } from "react";
import { CANVAS_THEME } from "@/utils/canvasTheme";

export function useCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const getContext = useCallback(() => {
    return canvasRef.current?.getContext("2d");
  }, []);

  const drawPixelGrid = useCallback(
    (pixels: number[][], getColor: (id: number) => string, cellSize: number = 20) => {
      const ctx = getContext();
      const canvas = canvasRef.current;
      if (!ctx || !canvas) return;

      const h = pixels.length;
      const w = pixels[0].length;
      canvas.width = w * cellSize;
      canvas.height = h * cellSize;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          ctx.fillStyle = getColor(pixels[y][x]);
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
          ctx.strokeStyle = CANVAS_THEME.gridLine;
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    },
    [getContext]
  );

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  return { canvasRef, drawPixelGrid, clear };
}