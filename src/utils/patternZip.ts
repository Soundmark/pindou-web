import JSZip from "jszip";
import { BEAD_PALETTE, HIDDEN_COLOR_REPLACEMENTS } from "./beadColors";
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

export async function loadPatternFromZip(
  blob: Blob | ArrayBuffer
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