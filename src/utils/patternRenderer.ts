import type { BeadColor } from "./beadColors";
import { BEAD_PALETTE } from "./beadColors";
import { CANVAS_THEME, getCanvasFontFamily, getLuminance, SOCIAL_THEME } from "./canvasTheme";
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
  for (const [cid, count] of colorCountMap) {
    const color = BEAD_PALETTE.find((c) => c.id === cid);
    if (color) {
      const mapping = (colorSystemMapping as Record<string, unknown>)[color.hex.toUpperCase()] as Record<string, string> | undefined;
      const displayColor = mapping ? { ...color, id: mapping[colorSystem] } : color;
      stats.push({ color: displayColor, count, originalId: color.id });
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
    const ly = margin + ph + 30;
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

export interface PatternRenderOptions {
  /** 是否绘制色号（格子 ≥16px 时才生效）。默认 true */
  showLabels?: boolean;
  /** 是否在图纸下方绘制颜色图例。默认 false */
  legend?: boolean;
  /** 平铺在图纸区域的旋转水印文字。默认不画 */
  watermark?: string;
  /** 图纸四周留白（px）。默认 0 */
  padding?: number;
  /** 色系标识（如 MARD）：有图例时拼进图例页眉，无图例时单独画一行页眉 */
  brand?: string;
}

/**
 * 把像素矩阵渲染成静态 PNG 画布（中性打印风格）：
 * 白底 + BEAD_PALETTE 色块 + 细网格线 + 每 5 格粗网格线（对照拼豆板用）。
 * 供详情页与创建页的"导出 PNG"共用；社交媒体素材额外开启图例与水印。
 */
export function renderPatternToCanvas(
  pixels: number[][],
  canvas: HTMLCanvasElement,
  cellSize: number = 20,
  options: PatternRenderOptions = {}
): void {
  const { showLabels = true, legend = false, watermark, padding = 0, brand } = options;

  const h = pixels.length;
  const w = pixels[0]?.length ?? 0;
  const gridW = w * cellSize;
  const gridH = h * cellSize;
  // 无图例时给色系页眉留一行高度
  const headerH = !legend && brand ? 40 : 0;

  // 图例统计：按数量降序
  const counts = new Map<number, number>();
  if (legend) {
    for (let y = 0; y < h; y++) {
      const row = pixels[y];
      if (!row) continue;
      for (let x = 0; x < w; x++) {
        const id = row[x];
        if (id >= 0 && BEAD_PALETTE[id]) counts.set(id, (counts.get(id) || 0) + 1);
      }
    }
  }
  const legendEntries = Array.from(counts.entries())
    .map(([id, count]) => ({ color: BEAD_PALETTE[id], count }))
    .sort((a, b) => b.count - a.count);
  const beadTotal = legendEntries.reduce((sum, e) => sum + e.count, 0);
  const legendCols = Math.max(1, Math.floor(gridW / 170));
  const legendRows = legendEntries.length > 0 ? Math.ceil(legendEntries.length / legendCols) : 0;
  const legendHeight = legendEntries.length > 0 ? 24 + 24 + legendRows * 26 + 16 : 0;

  canvas.width = gridW + padding * 2;
  canvas.height = gridH + padding * 2 + legendHeight + headerH;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 色系页眉（无图例时的导出样式）
  if (headerH > 0 && brand) {
    ctx.fillStyle = CANVAS_THEME.labelDark;
    ctx.font = `600 14px ${getCanvasFontFamily()}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`色系：${brand}`, padding, Math.round(headerH / 2));
  }

  // 格子足够大时在色块中央标注珠子色号，方便对照实拼
  const showLabel = showLabels && cellSize >= 16;
  if (showLabel) {
    ctx.font = `${Math.max(8, cellSize * 0.4)}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
  }

  for (let y = 0; y < h; y++) {
    const row = pixels[y];
    if (!row) continue;
    for (let x = 0; x < w; x++) {
      const colorId = row[x];
      if (colorId < 0) continue; // 空格子留白
      const color = BEAD_PALETTE[colorId];
      const px = padding + x * cellSize;
      const py = padding + headerH + y * cellSize;
      ctx.fillStyle = color?.hex ?? "#ffffff";
      ctx.fillRect(px, py, cellSize, cellSize);
      if (showLabel && color) {
        ctx.fillStyle =
          getLuminance(color.hex) > 0.5 ? CANVAS_THEME.labelDark : CANVAS_THEME.labelLight;
        ctx.fillText(color.id, px + cellSize / 2, py + cellSize / 2);
      }
    }
  }

  // 细网格线（含外边线）
  const gridTop = padding + headerH;
  ctx.strokeStyle = CANVAS_THEME.gridLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= w; x++) {
    const px = Math.round(padding + x * cellSize) + 0.5;
    ctx.moveTo(px, gridTop);
    ctx.lineTo(px, gridTop + gridH);
  }
  for (let y = 0; y <= h; y++) {
    const py = Math.round(gridTop + y * cellSize) + 0.5;
    ctx.moveTo(padding, py);
    ctx.lineTo(padding + gridW, py);
  }
  ctx.stroke();

  // 每 5 格粗网格线（含 0 起点），对应实体拼豆板的定位筋
  ctx.strokeStyle = CANVAS_THEME.gridLineStrong;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 5) {
    const px = Math.round(padding + x * cellSize) + 0.5;
    ctx.moveTo(px, gridTop);
    ctx.lineTo(px, gridTop + gridH);
  }
  for (let y = 0; y <= h; y += 5) {
    const py = Math.round(gridTop + y * cellSize) + 0.5;
    ctx.moveTo(padding, py);
    ctx.lineTo(padding + gridW, py);
  }
  ctx.stroke();

  // 水印：只在图纸区域内平铺，不压图例
  if (watermark) {
    drawTiledWatermark(
      ctx,
      watermark,
      padding,
      gridTop,
      gridW,
      gridH,
      Math.max(18, Math.min(42, cellSize * 1.2))
    );
  }

  // 图例
  if (legendEntries.length > 0) {
    const top = gridTop + gridH;
    ctx.strokeStyle = CANVAS_THEME.gridLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, top + 12);
    ctx.lineTo(padding + gridW, top + 12);
    ctx.stroke();

    ctx.fillStyle = CANVAS_THEME.labelDark;
    ctx.font = `600 14px ${getCanvasFontFamily()}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(
      `${brand ? `${brand} · ` : ""}${legendEntries.length} 种颜色 · ${beadTotal} 颗豆子`,
      padding,
      top + 36
    );

    const swatch = 14;
    const itemTop = top + 60;
    legendEntries.forEach((entry, i) => {
      const col = i % legendCols;
      const row = Math.floor(i / legendCols);
      const x = padding + col * 170;
      const y = itemTop + row * 26;
      ctx.fillStyle = entry.color.hex;
      ctx.fillRect(x, y, swatch, swatch);
      ctx.strokeStyle = CANVAS_THEME.gridLine;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, swatch - 1, swatch - 1);
      ctx.fillStyle = CANVAS_THEME.labelDark;
      ctx.font = `11px ${getCanvasFontFamily()}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`${entry.color.id} ×${entry.count}`, x + swatch + 5, y + swatch / 2);
    });
  }
}

/** 在矩形区域内平铺旋转 -30° 的半透明水印。 */
function drawTiledWatermark(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  w: number,
  h: number,
  fontSize: number
): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(-Math.PI / 6);
  ctx.font = `600 ${fontSize}px ${getCanvasFontFamily()}`;
  ctx.fillStyle = SOCIAL_THEME.watermarkColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const span = Math.hypot(w, h) / 2 + fontSize * 2;
  const stepX = ctx.measureText(text).width + fontSize * 2;
  const stepY = fontSize * 4;
  for (let row = -span; row <= span; row += stepY) {
    for (let col = -span; col <= span; col += stepX) {
      ctx.fillText(text, col, row);
    }
  }
  ctx.restore();
}