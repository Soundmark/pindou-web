import { BEAD_PALETTE, findNearestBeadColorFast, getColorDistance } from "./beadColors";
import type { BeadColor } from "./beadColors";

// Transparent/erased bead color
const ERASED_BEAD: BeadColor = {
  id: "__ERASED__", name: "Erased", hex: "#FFFFFF", r: 255, g: 255, b: 255,
};

// sRGB / Linear conversion
function sRGBToLinear(value: number): number {
  const v = value / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
function linearToSRGB(value: number): number {
  const v = value <= 0.0031308 ? value * 12.92 : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
  return Math.round(v * 255);
}

// Bilinear interpolation with gamma correction
export function bilinearResize(
  src: Uint8ClampedArray, srcW: number, srcH: number, dstW: number, dstH: number
): Uint8ClampedArray {
  const dst = new Uint8ClampedArray(dstW * dstH * 4);
  const processed = new Uint8ClampedArray(src);
  for (let i = 0; i < processed.length; i += 4) {
    if (processed[i + 3] < 10) { processed[i] = 255; processed[i + 1] = 255; processed[i + 2] = 255; }
  }
  const xScale = srcW / dstW, yScale = srcH / dstH;
  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++) {
      const srcX = x * xScale, srcY = y * yScale;
      const x0 = Math.floor(srcX), x1 = Math.min(x0 + 1, srcW - 1);
      const y0 = Math.floor(srcY), y1 = Math.min(y0 + 1, srcH - 1);
      const fx = srcX - x0, fy = srcY - y0;
      const i00 = (y0 * srcW + x0) * 4, i10 = (y0 * srcW + x1) * 4;
      const i01 = (y1 * srcW + x0) * 4, i11 = (y1 * srcW + x1) * 4;
      const di = (y * dstW + x) * 4;
      // Alpha: direct linear
      const a = (processed[i00 + 3] + (processed[i10 + 3] - processed[i00 + 3]) * fx) +
        ((processed[i01 + 3] + (processed[i11 + 3] - processed[i01 + 3]) * fx) - (processed[i00 + 3] + (processed[i10 + 3] - processed[i00 + 3]) * fx)) * fy;
      dst[di + 3] = Math.round(a);
      for (let c = 0; c < 3; c++) {
        const v00 = sRGBToLinear(processed[i00 + c]), v10 = sRGBToLinear(processed[i10 + c]);
        const v01 = sRGBToLinear(processed[i01 + c]), v11 = sRGBToLinear(processed[i11 + c]);
        const v = (v00 + (v10 - v00) * fx) + ((v01 + (v11 - v01) * fx) - (v00 + (v10 - v00) * fx)) * fy;
        dst[di + c] = linearToSRGB(v);
      }
    }
  }
  return dst;
}

// Nearest neighbor resize
export function nearestNeighborResize(
  src: Uint8ClampedArray, srcW: number, srcH: number, dstW: number, dstH: number
): Uint8ClampedArray {
  const dst = new Uint8ClampedArray(dstW * dstH * 4);
  const xScale = srcW / dstW, yScale = srcH / dstH;
  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++) {
      const sx = Math.min(Math.floor(x * xScale), srcW - 1);
      const sy = Math.min(Math.floor(y * yScale), srcH - 1);
      const si = (sy * srcW + sx) * 4, di = (y * dstW + x) * 4;
      dst[di] = src[si]; dst[di + 1] = src[si + 1]; dst[di + 2] = src[si + 2]; dst[di + 3] = src[si + 3];
    }
  }
  return dst;
}

// Sample median color from a region
function sampleMedian(data: Uint8ClampedArray, imgW: number, cx: number, cy: number, radius: number) {
  const x0 = Math.max(0, Math.floor(cx - radius)), y0 = Math.max(0, Math.floor(cy - radius));
  const x1 = Math.min(imgW - 1, Math.ceil(cx + radius));
  const y1 = Math.ceil(cy + radius);
  const pixels: { r: number; g: number; b: number; lum: number }[] = [];
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = (y * imgW + x) * 4;
      pixels.push({ r: data[i], g: data[i + 1], b: data[i + 2], lum: 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2] });
    }
  }
  if (!pixels.length) return { r: 255, g: 255, b: 255 };
  pixels.sort((a, b) => a.lum - b.lum);
  const m = pixels[Math.floor(pixels.length / 2)];
  return { r: m.r, g: m.g, b: m.b };
}

// Merge similar bead colors (Delta E < 3)
function mergeSimilar(cells: { x: number; y: number; color: BeadColor }[]): typeof cells {
  const counts = new Map<string, { bead: BeadColor; count: number }>();
  for (const c of cells) {
    const e = counts.get(c.color.id);
    if (e) e.count++; else counts.set(c.color.id, { bead: c.color, count: 1 });
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1].count - a[1].count);
  const mergeMap = new Map<string, string>();
  for (const [id] of sorted) mergeMap.set(id, id);
  for (let i = 0; i < sorted.length; i++) {
    const [idA, infoA] = sorted[i];
    if (mergeMap.get(idA) !== idA) continue;
    for (let j = i + 1; j < sorted.length; j++) {
      const [idB] = sorted[j];
      if (mergeMap.get(idB) !== idB) continue;
      if (getColorDistance(infoA.bead, sorted[j][1].bead) < 3) mergeMap.set(idB, idA);
    }
  }
  return cells.map(c => {
    const fid = mergeMap.get(c.color.id);
    if (fid && fid !== c.color.id) {
      const merged = BEAD_PALETTE.find(b => b.id === fid);
      if (merged) return { ...c, color: merged };
    }
    return c;
  });
}

// Extract cell colors from pixel data
export function extractCellColors(
  data: Uint8ClampedArray, cropW: number, cropH: number, gridW: number, gridH: number
): { x: number; y: number; color: BeadColor }[] {
  const cells: { x: number; y: number; color: BeadColor }[] = [];
  const cellPW = cropW / gridW, cellPH = cropH / gridH;
  const isPixelArt = cellPW <= 3 || cellPH <= 3;
  const radius = Math.max(1, Math.min(cellPW * 0.3, cellPH * 0.3));
  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      const cx = (x + 0.5) * cellPW, cy = (y + 0.5) * cellPH;
      let r: number, g: number, b: number;
      if (isPixelArt) {
        const pi = (Math.min(Math.floor(cy), cropH - 1) * cropW + Math.min(Math.floor(cx), cropW - 1)) * 4;
        r = data[pi]; g = data[pi + 1]; b = data[pi + 2];
      } else {
        const s = sampleMedian(data, cropW, cx, cy, radius);
        r = s.r; g = s.g; b = s.b;
      }
      const ai = (Math.min(Math.floor(cy), cropH - 1) * cropW + Math.min(Math.floor(cx), cropW - 1)) * 4 + 3;
      if (data[ai] < 128) { cells.push({ x, y, color: ERASED_BEAD }); continue; }
      cells.push({ x, y, color: findNearestBeadColorFast(r, g, b, "ciede2000") });
    }
  }
  return mergeSimilar(cells);
}

// Process image: load → resize → extract colors
export async function processImage(
  img: HTMLImageElement | HTMLCanvasElement, gridW: number, gridH: number
): Promise<{ pixels: number[][]; colorCount: number }> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const scaled = bilinearResize(imageData.data, canvas.width, canvas.height, gridW, gridH);
  const pixels: number[][] = [];
  const seen = new Set<string>();
  for (let y = 0; y < gridH; y++) {
    const row: number[] = [];
    for (let x = 0; x < gridW; x++) {
      const i = (y * gridW + x) * 4;
      const color = findNearestBeadColorFast(scaled[i], scaled[i + 1], scaled[i + 2], "ciede2000");
      row.push(BEAD_PALETTE.indexOf(color));
      seen.add(color.id);
    }
    pixels.push(row);
  }
  return { pixels, colorCount: seen.size };
}