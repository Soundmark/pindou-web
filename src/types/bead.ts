export interface BeadColor {
  id: string;
  name: string;
  hex: string;
  r: number;
  g: number;
  b: number;
}

export type ColorSystemType = "MARD" | "COCO" | "漫漫" | "盼盼" | "咪小窝";

export type ColorSimplifyLevel = "none" | "low" | "medium" | "high";

export type StyleType = "cartoon" | "anime" | "flat" | "none";

export interface PatternCell {
  x: number;
  y: number;
  color: BeadColor;
}

export interface ColorStat {
  color: BeadColor;
  count: number;
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PatternData {
  version: number;
  width: number;
  height: number;
  pixels: number[][];
  name: string;
  brand: string;
  createdAt: string;
  updatedAt: string;
}