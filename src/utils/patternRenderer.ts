import type { BeadColor } from "./beadColors";
import { BEAD_PALETTE } from "./beadColors";
import { CANVAS_THEME } from "./canvasTheme";
import colorSystemMapping from "./colorSystemMapping.json";

export type ColorSystemType = "MARD" | "COCO" | "漫漫" | "盼盼" | "咪小窝";

export interface PatternCell {
  x: number;
  y: number;
  color: BeadColor;
}

export interface ColorStat {
  color: BeadColor;
  count: number;
  originalId: string;
}

interface DrawOptions {
  canvas: HTMLCanvasElement;
  cells: PatternCell[];
  width: number;
  height: number;
  cellSize: number;
  colorSystem: ColorSystemType;
  showGrid?: boolean;
  showLegend?: boolean;
  gridColor?: string;
  backgroundColor?: string;
}

export function drawPattern(options: DrawOptions): void {
  const {
    canvas, cells, width, height, cellSize, colorSystem,
    showGrid = true, showLegend = true,
    gridColor = "#e5e7eb", backgroundColor = "#ffffff",
  } = options;

  const ctx = canvas.getContext("2d")!;
  const margin = 20;
  const pw = width * cellSize;
  const ph = height * cellSize;

  // Build color stats
  const colorCountMap = new Map<string, number>();
  for (const cell of cells) {
    if (cell.color.id === "__ERASED__") continue;
    const c = colorCountMap.get(cell.color.id) || 0;
    colorCountMap.set(cell.color.id, c + 1);
  }
  const stats: ColorStat[] = [];
  let total = 0;
  for (const [cid, count] of colorCountMap) {
    const color = BEAD_PALETTE.find((c) => c.id === cid);
    if (color) {
      const mapping = (colorSystemMapping as Record<string, unknown>)[color.hex.toUpperCase()] as Record<string, string> | undefined;
      const displayColor = mapping ? { ...color, id: mapping[colorSystem] } : color;
      stats.push({ color: displayColor, count, originalId: color.id });
      total += count;
    }
  }
  stats.sort((a, b) => b.count - a.count);

  // Calculate legend height
  let legendHeight = 0;
  if (showLegend && stats.length > 0) {
    const itemH = 20;
    const cols = Math.min(stats.length, Math.floor((pw - 60) / 120));
    const rows = Math.ceil(stats.length / cols);
    legendHeight = rows * itemH + 40;
  }

  const cw = pw + margin * 2;
  const ch = ph + margin * 2 + legendHeight + (showLegend && stats.length > 0 ? 20 : 0);
  canvas.width = cw;
  canvas.height = ch;

  // Background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, cw, ch);

  // Draw cells
  const cellMap = new Map<string, PatternCell>();
  for (const cell of cells) {
    cellMap.set(`${cell.x},${cell.y}`, cell);
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = cellMap.get(`${x},${y}`);
      const px = margin + x * cellSize;
      const py = margin + y * cellSize;

      if (cell && cell.color.id !== "__ERASED__") {
        ctx.fillStyle = cell.color.hex;
        ctx.fillRect(px, py, cellSize, cellSize);
      } else {
        ctx.fillStyle = "#f3f4f6";
        ctx.fillRect(px, py, cellSize, cellSize);
      }

      // Grid lines
      if (showGrid) {
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(px, py, cellSize, cellSize);
      }
    }
  }

  // Draw grid borders
  ctx.strokeStyle = "#9ca3af";
  ctx.lineWidth = 2;
  ctx.strokeRect(margin, margin, pw, ph);

  // Draw legend
  if (showLegend && stats.length > 0) {
    const lx = margin + 10;
    let ly = margin + ph + 30;
    const itemH = 20;
    const swatchSize = 12;
    const cols = Math.min(stats.length, Math.floor((pw - 60) / 120));

    ctx.font = "11px sans-serif";
    stats.forEach((stat, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = lx + col * 120;
      const y = ly + row * itemH;

      ctx.fillStyle = stat.color.hex;
      ctx.fillRect(x, y, swatchSize, swatchSize);
      ctx.strokeStyle = "#d1d5db";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, y, swatchSize, swatchSize);

      ctx.fillStyle = "#374151";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`${stat.color.id} x${stat.count}`, x + swatchSize + 4, y + swatchSize / 2);
    });
  }
}

/**
 * 把像素矩阵渲染成静态 PNG 画布（中性打印风格）：
 * 白底 + BEAD_PALETTE 色块 + 细网格线 + 每 5 格粗网格线（对照拼豆板用）。
 * 供详情页与创建页的"导出 PNG"共用。
 */
export function renderPatternToCanvas(
  pixels: number[][],
  canvas: HTMLCanvasElement,
  cellSize: number = 20
): void {
  const h = pixels.length;
  const w = pixels[0]?.length ?? 0;
  canvas.width = w * cellSize;
  canvas.height = h * cellSize;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < h; y++) {
    const row = pixels[y];
    if (!row) continue;
    for (let x = 0; x < w; x++) {
      const colorId = row[x];
      if (colorId < 0) continue; // 空格子留白
      ctx.fillStyle = BEAD_PALETTE[colorId]?.hex ?? "#ffffff";
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
  }

  // 细网格线（含外边线）
  ctx.strokeStyle = CANVAS_THEME.gridLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= w; x++) {
    const px = Math.round(x * cellSize) + 0.5;
    ctx.moveTo(px, 0);
    ctx.lineTo(px, h * cellSize);
  }
  for (let y = 0; y <= h; y++) {
    const py = Math.round(y * cellSize) + 0.5;
    ctx.moveTo(0, py);
    ctx.lineTo(w * cellSize, py);
  }
  ctx.stroke();

  // 每 5 格粗网格线（含 0 起点），对应实体拼豆板的定位筋
  ctx.strokeStyle = CANVAS_THEME.gridLineStrong;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 5) {
    const px = Math.round(x * cellSize) + 0.5;
    ctx.moveTo(px, 0);
    ctx.lineTo(px, h * cellSize);
  }
  for (let y = 0; y <= h; y += 5) {
    const py = Math.round(y * cellSize) + 0.5;
    ctx.moveTo(0, py);
    ctx.lineTo(w * cellSize, py);
  }
  ctx.stroke();
}