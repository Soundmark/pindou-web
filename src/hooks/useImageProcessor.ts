"use client";

import { useState, useCallback } from "react";
import { BEAD_PALETTE, loadLut, findNearestBeadColorFast } from "@/utils/beadColors";
import { bilinearResize } from "@/utils/imageProcessor";

interface ProcessResult {
  pixels: number[][];
  colorCount: number;
  isProcessing: boolean;
  error: string | null;
}

export function useImageProcessor() {
  const [state, setState] = useState<ProcessResult>({
    pixels: [],
    colorCount: 0,
    isProcessing: false,
    error: null,
  });

  const processImage = useCallback(
    async (imageData: ImageData, gridWidth: number, gridHeight: number) => {
      setState((s) => ({ ...s, isProcessing: true, error: null }));

      try {
        // Ensure LUT is loaded
        await loadLut();

        // Resize to grid dimensions
        const scaled = bilinearResize(
          imageData.data,
          imageData.width,
          imageData.height,
          gridWidth,
          gridHeight
        );

        // Match colors
        const pixels: number[][] = [];
        const seen = new Set<string>();

        for (let y = 0; y < gridHeight; y++) {
          const row: number[] = [];
          for (let x = 0; x < gridWidth; x++) {
            const idx = (y * gridWidth + x) * 4;
            const color = findNearestBeadColorFast(
              scaled[idx],
              scaled[idx + 1],
              scaled[idx + 2],
              "cie94"
            );
            const id = BEAD_PALETTE.indexOf(color);
            row.push(id);
            seen.add(color.id);
          }
          pixels.push(row);
        }

        setState({
          pixels,
          colorCount: seen.size,
          isProcessing: false,
          error: null,
        });
      } catch (err) {
        setState({
          pixels: [],
          colorCount: 0,
          isProcessing: false,
          error: err instanceof Error ? err.message : "Processing failed",
        });
      }
    },
    []
  );

  const getColorById = useCallback((id: number): string => {
    return BEAD_PALETTE[id]?.hex || "#ffffff";
  }, []);

  const reset = useCallback(() => {
    setState({ pixels: [], colorCount: 0, isProcessing: false, error: null });
  }, []);

  return { ...state, processImage, getColorById, reset };
}