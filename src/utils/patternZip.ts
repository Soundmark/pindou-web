import JSZip from "jszip";
import { BEAD_PALETTE, HIDDEN_COLOR_REPLACEMENTS, findNearestBeadColor } from "./beadColors";
import { createEmptyGrid } from "./pixelGrid";
import type { BeadColor } from "./beadColors";

export interface PatternCell {
  x: number;
  y: number;
  color: BeadColor;
}

export type ColorSystemType = "MARD" | "COCO" | "漫漫" | "盼盼" | "咪小窝";

export interface PatternMeta {
  version: string;
  width: number;
  height: number;
  colorSystem: string;
  cells: { x: number; y: number; colorId: string; colorName: string; colorHex: string }[];
  createdAt: string;
  isFromRecognition?: boolean;
  recognitionCropRect?: unknown;
}

export async function buildPatternZip(
  cells: PatternCell[],
  width: number,
  height: number,
  colorSystem: ColorSystemType = "MARD"
): Promise<Blob> {
  const zip = new JSZip();
  const patternData: PatternMeta = {
    version: "1.0",
    width,
    height,
    colorSystem,
    cells: cells
      .filter((c) => c.color.id !== "__ERASED__")
      .map((c) => ({
        x: c.x,
        y: c.y,
        colorId: c.color.id,
        colorName: c.color.name,
        colorHex: c.color.hex,
      })),
    createdAt: new Date().toISOString(),
  };
  zip.file("pattern.json", JSON.stringify(patternData, null, 2));
  return zip.generateAsync({ type: "blob" });
}

export async function buildPatternZipBase64(
  cells: PatternCell[],
  width: number,
  height: number,
  colorSystem: ColorSystemType = "MARD"
): Promise<string> {
  const zip = new JSZip();
  const patternData: PatternMeta = {
    version: "1.0",
    width,
    height,
    colorSystem,
    cells: cells
      .filter((c) => c.color.id !== "__ERASED__")
      .map((c) => ({
        x: c.x,
        y: c.y,
        colorId: c.color.id,
        colorName: c.color.name,
        colorHex: c.color.hex,
      })),
    createdAt: new Date().toISOString(),
  };
  zip.file("pattern.json", JSON.stringify(patternData, null, 2));
  return zip.generateAsync({ type: "base64" }) as Promise<string>;
}

export async function loadPatternFromZip(  blob: Blob | ArrayBuffer
): Promise<{
  cells: PatternCell[];
  width: number;
  height: number;
  colorSystem: ColorSystemType;
  replacementMap?: Record<string, string>;
}> {
  const zip = await JSZip.loadAsync(blob);
  const file = zip.file("pattern.json");
  if (!file) throw new Error("pattern.json not found in zip");

  const text = await file.async("string");
  const data: PatternMeta = JSON.parse(text);
  if (!data.cells || !Array.isArray(data.cells)) throw new Error("Invalid pattern data");

  const cells: PatternCell[] = [];
  const replacementMap = new Map<string, string>();

  for (const cell of data.cells) {
    let color = BEAD_PALETTE.find((c) => c.id === cell.colorId);
    if (!color) {
      const replacementId = HIDDEN_COLOR_REPLACEMENTS[cell.colorId];
      if (replacementId) {
        color = BEAD_PALETTE.find((c) => c.id === replacementId);
        if (color) replacementMap.set(cell.colorId, replacementId);
      }
    }
    if (!color) {
      color = { id: cell.colorId, name: cell.colorName, hex: cell.colorHex, r: 0, g: 0, b: 0 };
    }
    cells.push({ x: cell.x, y: cell.y, color });
  }

  return {
    cells,
    width: data.width,
    height: data.height,
    colorSystem: (data.colorSystem as ColorSystemType) || "MARD",
    replacementMap: replacementMap.size > 0 ? Object.fromEntries(replacementMap) : undefined,
  };
}

// =============================================================================
// 像素矩阵 ⇄ 图案单元格
//
// 编辑器内部用 `pixels: number[][]`（BEAD_PALETTE 下标，-1 = 空格）；
// 后端只存 ZIP 里的 `cells[]`（带颜色 id/hex）。两端在发布/加载时各转一次。
// =============================================================================

/** 编辑器网格 → ZIP 单元格（跳过空格子） */
export function pixelsToCells(pixels: number[][]): PatternCell[] {
  const cells: PatternCell[] = [];
  for (let y = 0; y < pixels.length; y++) {
    const row = pixels[y] || [];
    for (let x = 0; x < row.length; x++) {
      const index = row[x];
      if (index < 0) continue;
      const color = BEAD_PALETTE[index];
      if (!color) continue;
      cells.push({ x, y, color });
    }
  }
  return cells;
}

/**
 * ZIP 单元格 → 编辑器网格。
 *
 * 颜色解析三级兜底，缺一不可：
 *   1. colorId 直接命中调色板（正常情况）；
 *   2. colorId 是已隐藏的旧色号 → 走 HIDDEN_COLOR_REPLACEMENTS；
 *   3. 都不认识 → 按 hex 取最近色。
 * 少了兜底，旧图纸会出现空洞（pixels 里被填成 EMPTY_CELL）。
 */
export function cellsToPixels(
  cells: PatternCell[],
  width: number,
  height: number
): number[][] {
  const grid = createEmptyGrid(width, height);
  const indexById = new Map(BEAD_PALETTE.map((c, i) => [c.id, i]));

  for (const cell of cells) {
    if (cell.x < 0 || cell.y < 0 || cell.x >= width || cell.y >= height) continue;

    let index = indexById.get(cell.color.id);
    if (index === undefined) {
      const replacement = HIDDEN_COLOR_REPLACEMENTS[cell.color.id];
      if (replacement) index = indexById.get(replacement);
    }
    if (index === undefined) {
      const rgb = hexToRgb(cell.color.hex);
      if (rgb) index = BEAD_PALETTE.indexOf(findNearestBeadColor(rgb.r, rgb.g, rgb.b));
    }
    if (index === undefined || index < 0) continue;

    grid[cell.y][cell.x] = index;
  }

  return grid;
}

function hexToRgb(hex: string | undefined): { r: number; g: number; b: number } | null {
  if (typeof hex !== "string") return null;
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

/** 统计网格里的颜色数（跳过空格子），发布时填 colorCount */
export function countGridColors(pixels: number[][]): number {
  const seen = new Set<number>();
  for (const row of pixels) {
    for (const index of row) {
      if (index >= 0) seen.add(index);
    }
  }
  return seen.size;
}

/** 统计贴珠格子数，发布时填 cellCount */
export function countGridCells(pixels: number[][]): number {
  let count = 0;
  for (const row of pixels) {
    for (const index of row) {
      if (index >= 0) count++;
    }
  }
  return count;
}
