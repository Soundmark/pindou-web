/**
 * 社交媒体素材渲染：封面图与带图例/水印的图纸图。
 *
 * 全部在浏览器 Canvas 上完成 —— 项目没有服务端绘图依赖，
 * 像素数据本来也只在客户端存在（从 ZIP 还原）。
 */
import { BEAD_PALETTE } from "@/utils/beadColors";
import {
  getCanvasFontFamily,
  getCanvasHeadingFamily,
  SOCIAL_TAG_TINTS,
  SOCIAL_THEME,
} from "@/utils/canvasTheme";
import { deriveCoverPalette, type CoverPalette } from "@/utils/coverPalette";
import { renderPatternToCanvas } from "@/utils/patternRenderer";

export interface PatternColorStat {
  /** BEAD_PALETTE 下标 */
  index: number;
  /** 珠子色号，如 A01 */
  id: string;
  hex: string;
  count: number;
}

export interface PatternStats {
  beadCount: number;
  colorCount: number;
  entries: PatternColorStat[];
}

export interface SocialCoverMeta {
  name: string;
  width: number;
  height: number;
  tags: string[];
  /** 色系标识（如 MARD），拼在「豆子」统计卡的说明行 */
  brand?: string;
}

const COVER_W = 1080;
const COVER_H = 1440;

/** 图纸卡区间下沿（上方是标题区，下方是数据卡 1108）。 */
const CARD_BAND_BOTTOM = 1024;
/** 卡面内边距 = 图案四周的白边 */
const THUMB_PAD = 36;
const CARD_MIN_H = 440;
const CARD_MAX_H = 700;
/** 图纸卡宽度：回满 920，保证预览窗口的存在感 */
const CARD_W = 920;

interface CoverCard {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
}

interface CoverCardLayout {
  /** drawThumbnail 必须用同一个格子尺寸，卡面才刚好被图案撑满 */
  cell: number;
  card: CoverCard;
}

/**
 * 图纸卡布局：宽度固定 920，高度跟随图案长宽比收缩，
 * 在标题区（含标签行）与数据卡之间垂直居中。不裁剪图案。
 * bandTop 由标题行数决定（1 行 327 / 2 行 391）。
 */
function computeCoverLayout(pixels: number[][], bandTop: number): CoverCardLayout {
  const gridW = pixels[0]?.length ?? 0;
  const gridH = pixels.length;
  const bandH = CARD_BAND_BOTTOM - bandTop;

  if (gridW === 0 || gridH === 0) {
    return {
      cell: 12,
      card: { x: 80, y: bandTop, w: CARD_W, h: Math.min(CARD_MAX_H, bandH), r: 36 },
    };
  }

  const maxH = Math.min(CARD_MAX_H, bandH);
  const cell = Math.max(
    2,
    Math.floor(Math.min((CARD_W - THUMB_PAD * 2) / gridW, (maxH - THUMB_PAD * 2) / gridH))
  );
  const h = Math.max(
    Math.min(CARD_MIN_H, maxH),
    Math.min(maxH, cell * gridH + THUMB_PAD * 2)
  );
  return {
    cell,
    card: {
      x: (COVER_W - CARD_W) / 2,
      y: bandTop + Math.max(0, Math.round((bandH - h) / 2)),
      w: CARD_W,
      h,
      r: 36,
    },
  };
}

/** 统计非空格子的颜色分布，按数量降序。 */
export function computePatternStats(pixels: number[][]): PatternStats {
  const countMap = new Map<number, number>();
  let beadCount = 0;
  for (const row of pixels) {
    if (!row) continue;
    for (const id of row) {
      if (id < 0 || !BEAD_PALETTE[id]) continue;
      countMap.set(id, (countMap.get(id) || 0) + 1);
      beadCount++;
    }
  }
  const entries = Array.from(countMap.entries())
    .map(([index, count]) => {
      const color = BEAD_PALETTE[index];
      return { index, id: color.id, hex: color.hex, count };
    })
    .sort((a, b) => b.count - a.count);
  return { beadCount, colorCount: entries.length, entries };
}

/** 生成合法、不过长的文件名主体（不含扩展名）。 */
export function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, "_")
    .replace(/\s+/g, " ")
    .replace(/^[\s.]+|[\s.]+$/g, "")
    .slice(0, 80);
  return cleaned || "pattern";
}

/** 封面图：缩略图 + 图纸名 + 配色 + 颜色数/豆子数/尺寸 + 标签。 */
export function renderSocialCover(
  pixels: number[][],
  meta: SocialCoverMeta,
  canvas: HTMLCanvasElement
): void {
  canvas.width = COVER_W;
  canvas.height = COVER_H;
  const ctx = canvas.getContext("2d")!;
  const family = getCanvasFontFamily();
  const headingFamily = getCanvasHeadingFamily();
  const stats = computePatternStats(pixels);
  const palette = deriveCoverPalette(stats.entries);

  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, COVER_W, COVER_H);
  drawBackgroundDecor(ctx, palette);

  // ── 品牌栏 ─────────────────────────────────────────────
  drawBeadLogo(ctx, 80, 58, 46, palette.logoCenter);
  ctx.fillStyle = SOCIAL_THEME.ink;
  ctx.font = `700 44px ${family}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("拼豆屋", 142, 82);

  const badgeText = "拼豆图纸";
  const badgeFont = `700 24px ${family}`;
  ctx.font = badgeFont;
  const badgeW = ctx.measureText(badgeText).width + 48;
  drawPill(ctx, badgeText, {
    x: COVER_W - 80 - badgeW / 2,
    y: 82,
    width: badgeW,
    font: badgeFont,
    color: SOCIAL_THEME.primaryStrong,
    background: SOCIAL_THEME.pillBg,
    padX: 24,
    padY: 12,
  });

  // ── 标题 ───────────────────────────────────────────────
  const displayName = meta.name.trim() || "拼豆图纸";
  ctx.fillStyle = SOCIAL_THEME.ink;
  ctx.font = `700 72px ${headingFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // 中文标题加一点字距更透气；measureText 会把字距算进宽度，折行与绘制必须同开关
  const spacingCtx = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  spacingCtx.letterSpacing = "2px";
  const lines = wrapText(ctx, displayName, 900, 2);
  const titleTop = lines.length > 1 ? 170 : 190;
  lines.forEach((line, i) => {
    ctx.fillText(line, COVER_W / 2, titleTop + i * 84);
  });
  spacingCtx.letterSpacing = "0px";
  const titleBottom = titleTop + Math.max(0, lines.length - 1) * 84;

  // 标题下的一笔强调色标记
  ctx.fillStyle = palette.underline;
  roundedRectPath(ctx, COVER_W / 2 - 60, titleBottom + 34, 120, 8, 4);
  ctx.fill();

  // ── 标签行：标题正下方居中（胶囊自带 #，无需前置说明） ──
  if (meta.tags.length > 0) {
    drawTags(ctx, meta.tags, family, titleBottom + 86);
  }

  // ── 图纸展示：错位色板 + 白卡 + 两角胶带 ────────────────
  // 宽度回满 920；高度跟随图案长宽比，在标题区（含标签行）与数据卡之间垂直居中。
  const layout = computeCoverLayout(pixels, titleBottom + 140);
  const card = layout.card;
  roundedRectPath(ctx, card.x + 16, card.y + 18, card.w, card.h, card.r);
  ctx.fillStyle = palette.plate;
  ctx.fill();

  ctx.save();
  ctx.shadowColor = palette.cardShadow;
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 12;
  roundedRectPath(ctx, card.x, card.y, card.w, card.h, card.r);
  ctx.fillStyle = SOCIAL_THEME.card;
  ctx.fill();
  ctx.restore();

  roundedRectPath(ctx, card.x, card.y, card.w, card.h, card.r);
  ctx.strokeStyle = SOCIAL_THEME.border;
  ctx.lineWidth = 3;
  ctx.stroke();

  drawThumbnail(ctx, pixels, layout.cell, {
    x: card.x + 36,
    y: card.y + 36,
    w: card.w - 72,
    h: card.h - 72,
    radius: 24,
  });

  drawTape(ctx, card.x + 88, card.y - 4, -0.2, palette.tapeA);
  drawTape(ctx, card.x + card.w - 88, card.y - 4, 0.2, palette.tapeB);

  // ── 数据卡 + 用色色卡条 ────────────────────────────────
  // 标准 midi 拼豆直径 5mm，成品尺寸 = 格数 × 0.5cm
  const fmtCm = (cells: number) => `${Number((cells * 0.5).toFixed(1))}`;
  const showStrip = stats.entries.length > 0;
  const statsY = showStrip ? 1072 : 1096;
  const statH = 132;
  const statItems = [
    { value: String(stats.colorCount), label: "颜色" },
    { value: String(stats.beadCount), label: meta.brand ? `豆子·${meta.brand}` : "豆子" },
    {
      value: `${meta.width}×${meta.height}`,
      label: `成品约 ${fmtCm(meta.width)}×${fmtCm(meta.height)} cm`,
    },
  ];
  const statW = 293;
  const statGap = 20;
  statItems.forEach((item, i) => {
    const x = 80 + i * (statW + statGap);
    const y = statsY;
    roundedRectPath(ctx, x, y, statW, statH, 26);
    ctx.fillStyle = SOCIAL_THEME.card;
    ctx.fill();
    ctx.strokeStyle = SOCIAL_THEME.border;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = palette.statValue;
    ctx.font = `700 60px ${headingFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(item.value, x + statW / 2, y + 46);

    ctx.fillStyle = SOCIAL_THEME.textSecondary;
    ctx.font = `700 26px ${family}`;
    ctx.fillText(item.label, x + statW / 2, y + 102);
  });

  // 色卡条：图纸全部用色，块数越多块越小，一行放下
  if (showStrip) {
    drawColorStrip(ctx, stats.entries, (statsY + statH + 1300) / 2);
  }

  // ── 页脚 / 水印 ────────────────────────────────────────
  const footY = 1300;
  const footH = 78;
  roundedRectPath(ctx, 80, footY, 920, footH, 24);
  ctx.fillStyle = palette.footerBg;
  ctx.fill();
  ctx.strokeStyle = SOCIAL_THEME.border;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = palette.footerInk;
  ctx.font = `700 30px ${family}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(SOCIAL_THEME.watermarkText, 112, footY + footH / 2);

  ctx.fillStyle = SOCIAL_THEME.textSecondary;
  ctx.font = `500 22px ${family}`;
  ctx.textAlign = "right";
  ctx.fillText("把照片变成拼豆图纸", 968, footY + footH / 2);
}

/** 图纸图：自适应格子尺寸 + 色系/图例 + 水印。 */
export function renderSocialPattern(
  pixels: number[][],
  canvas: HTMLCanvasElement,
  brand?: string
): void {
  const h = pixels.length;
  const w = pixels[0]?.length ?? 0;
  if (w === 0 || h === 0) return;
  const cellSize = Math.max(4, Math.min(48, Math.floor(1600 / Math.max(w, h))));
  renderPatternToCanvas(pixels, canvas, cellSize, {
    showLabels: true,
    legend: true,
    watermark: SOCIAL_THEME.watermarkText,
    padding: 24,
    brand,
  });
}

/** 把 Canvas 转成 PNG 并触发下载。 */
export function downloadCanvas(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("PNG export failed"));
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      resolve();
    }, "image/png");
  });
}

// =============================================================================
// 绘制辅助
// =============================================================================

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

function drawBackgroundDecor(
  ctx: CanvasRenderingContext2D,
  palette: CoverPalette
): void {
  // 大色块只作氛围，压在内容下方
  const circles = [
    { x: 1010, y: 118, r: 210, ...palette.decor[0] },
    { x: 36, y: 1330, r: 160, ...palette.decor[1] },
    { x: 1020, y: 690, r: 90, ...palette.decor[2] },
  ];
  for (const circle of circles) {
    ctx.save();
    ctx.globalAlpha = circle.alpha;
    ctx.fillStyle = circle.color;
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 边角散落的“珠子”，带孔，点题拼豆
  const beads = [
    { x: 52, y: 330, r: 11, color: palette.beadDots[0] },
    { x: 1028, y: 352, r: 9, color: palette.beadDots[1] },
    { x: 54, y: 860, r: 12, color: palette.beadDots[2] },
    { x: 1026, y: 1040, r: 10, color: palette.beadDots[3] },
  ];
  for (const bead of beads) {
    ctx.save();
    ctx.fillStyle = bead.color;
    ctx.beginPath();
    ctx.arc(bead.x, bead.y, bead.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(bead.x, bead.y, bead.r * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/** 左上角 3×3 珠子 Logo；centerColor 只替换中心格（封面用来呼应图纸主色）。 */
function drawBeadLogo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  centerColor?: string
): void {
  const gap = 4;
  const cell = (size - gap * 2) / 3;
  const colors = [
    SOCIAL_THEME.primary,
    SOCIAL_THEME.primaryLight,
    SOCIAL_THEME.primaryStrong,
    SOCIAL_THEME.candyYellow,
    centerColor ?? SOCIAL_THEME.primary,
    SOCIAL_THEME.candyMint,
    SOCIAL_THEME.primaryLight,
    SOCIAL_THEME.primaryStrong,
    SOCIAL_THEME.primary,
  ];
  colors.forEach((color, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    roundedRectPath(
      ctx,
      x + col * (cell + gap),
      y + row * (cell + gap),
      cell,
      cell,
      cell * 0.28
    );
    ctx.fillStyle = color;
    ctx.fill();
  });
}

/** 贴在卡片边角的胶带。 */
function drawTape(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  angle: number,
  color: string
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = color;
  roundedRectPath(ctx, -70, -18, 140, 36, 4);
  ctx.fill();
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  for (let i = -40; i <= 40; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, -18);
    ctx.lineTo(i, 18);
    ctx.stroke();
  }
  ctx.restore();
}

interface PillOptions {
  x: number;
  y: number;
  font: string;
  color: string;
  background: string;
  padX: number;
  padY: number;
  /** 不传时按文字宽度自动计算 */
  width?: number;
  /** 可选描边色（半透明），用于让标签更立体 */
  borderColor?: string;
}

function drawPill(ctx: CanvasRenderingContext2D, text: string, options: PillOptions): void {
  const { x, y, font, color, background, padX, padY, borderColor } = options;
  ctx.save();
  ctx.font = font;
  const width = options.width ?? ctx.measureText(text).width + padX * 2;
  const height = padY * 2 + 32;
  roundedRectPath(ctx, x - width / 2, y - height / 2, width, height, height / 2);
  ctx.fillStyle = background;
  ctx.fill();
  if (borderColor) {
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    roundedRectPath(ctx, x - width / 2, y - height / 2, width, height, height / 2);
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y + 1);
  ctx.restore();
}

/** CJK（含假名/谚文/全角标点）：断行以单字为单位 */
const CJK_CHAR_RE =
  /[ᄀ-ᇿ⺀-鿿가-힯豈-﫿︰-﹏＀-￯　-〿]/;

/** 折行 token：拉丁词保持完整，CJK 拆成单字，空白是独立断行点。 */
function tokenizeForWrap(text: string): string[] {
  const tokens: string[] = [];
  const words = text.trim().split(/\s+/);
  words.forEach((word, wordIndex) => {
    if (wordIndex > 0) tokens.push(" ");
    let latinRun = "";
    for (const ch of Array.from(word)) {
      if (CJK_CHAR_RE.test(ch)) {
        if (latinRun) {
          tokens.push(latinRun);
          latinRun = "";
        }
        tokens.push(ch);
      } else {
        latinRun += ch;
      }
    }
    if (latinRun) tokens.push(latinRun);
  });
  return tokens;
}

/** 按词/字折行，最多 maxLines 行，超出截断加省略号。 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const tokens = tokenizeForWrap(text);
  const lines: string[] = [];
  let line = "";
  let index = 0;

  while (index < tokens.length) {
    const token = tokens[index];
    if (line && ctx.measureText(line + token).width > maxWidth) {
      lines.push(line.replace(/\s+$/, ""));
      line = "";
      if (lines.length === maxLines) break;
      if (token === " ") {
        index += 1;
        continue;
      }
    }
    line += token;
    index += 1;
  }
  if (lines.length < maxLines) {
    if (line) lines.push(line.replace(/\s+$/, ""));
    return lines;
  }
  // 行数用尽仍有剩余 → 截断最后一行放省略号
  let last = lines[maxLines - 1];
  while (last && ctx.measureText(`${last}…`).width > maxWidth) {
    last = last.slice(0, -1);
  }
  lines[maxLines - 1] = `${last}…`;
  return lines;
}

function drawThumbnail(
  ctx: CanvasRenderingContext2D,
  pixels: number[][],
  cell: number,
  box: { x: number; y: number; w: number; h: number; radius: number }
): void {
  const h = pixels.length;
  const w = pixels[0]?.length ?? 0;
  if (w === 0 || h === 0) return;

  const drawW = cell * w;
  const drawH = cell * h;
  const ox = box.x + (box.w - drawW) / 2;
  const oy = box.y + (box.h - drawH) / 2;

  ctx.save();
  roundedRectPath(ctx, box.x, box.y, box.w, box.h, box.radius);
  ctx.clip();
  ctx.fillStyle = SOCIAL_THEME.card;
  ctx.fillRect(box.x, box.y, box.w, box.h);

  // 卡面底纹：淡淡的对齐孔位，像拼豆板，也填补图案四周的留白
  ctx.fillStyle = "rgba(74, 36, 48, 0.055)";
  const step = 20;
  for (let gy = box.y + step / 2; gy < box.y + box.h; gy += step) {
    for (let gx = box.x + step / 2; gx < box.x + box.w; gx += step) {
      ctx.beginPath();
      ctx.arc(gx, gy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (let y = 0; y < h; y++) {
    const row = pixels[y];
    if (!row) continue;
    for (let x = 0; x < w; x++) {
      const id = row[x];
      if (id < 0) continue;
      const color = BEAD_PALETTE[id];
      if (!color) continue;
      ctx.fillStyle = color.hex;
      ctx.fillRect(ox + x * cell, oy + y * cell, cell, cell);
    }
  }
  ctx.restore();
}

function drawTags(
  ctx: CanvasRenderingContext2D,
  tags: string[],
  family: string,
  y: number
): void {
  const font = `700 28px ${family}`;
  const padX = 26;
  const gap = 16;
  const available = 920;

  ctx.save();
  ctx.font = font;
  const items = tags.slice(0, 6).map((tag) => `#${tag}`);
  const widths = items.map((text) => ctx.measureText(text).width + padX * 2);
  const ellipsisWidth = ctx.measureText("…").width + padX * 2;

  const kept: { text: string; width: number; index: number }[] = [];
  let used = 0;
  for (let i = 0; i < items.length; i++) {
    const next = used + widths[i] + (kept.length > 0 ? gap : 0);
    const reserve = i < items.length - 1 ? gap + ellipsisWidth : 0;
    if (next + reserve > available) break;
    kept.push({ text: items[i], width: widths[i], index: i });
    used = next;
  }
  if (kept.length === 0) {
    ctx.restore();
    return;
  }

  const hasMore = kept.length < items.length;
  const totalWidth = hasMore ? used + gap + ellipsisWidth : used;
  // 标题居中，标签行也居中：单个标签不再孤零零靠左
  const startX = Math.max((COVER_W - available) / 2, (COVER_W - totalWidth) / 2);

  let x = startX;
  kept.forEach((item) => {
    const tint = SOCIAL_TAG_TINTS[item.index % SOCIAL_TAG_TINTS.length];
    drawPill(ctx, item.text, {
      x: x + item.width / 2,
      y,
      width: item.width,
      font,
      color: tint.fg,
      background: tint.bg,
      borderColor: tint.fg,
      padX,
      padY: 14,
    });
    x += item.width + gap;
  });

  if (hasMore) {
    drawPill(ctx, "…", {
      x: x + ellipsisWidth / 2,
      y,
      width: ellipsisWidth,
      font,
      color: SOCIAL_THEME.textMuted,
      background: SOCIAL_THEME.card,
      padX,
      padY: 14,
    });
  }
  ctx.restore();
}

/**
 * 用色色卡条：一行圆角色块展示图纸全部用色。
 * 色少块大（上限 44px）、色多块小（下限 4px），恒定一行放下并居中；
 * 大块中心画白点呼应拼珠孔位，小块保持纯色。
 */
function drawColorStrip(
  ctx: CanvasRenderingContext2D,
  entries: readonly PatternColorStat[],
  centerY: number
): void {
  const n = entries.length;
  if (n === 0) return;
  const gap = n > 20 ? 6 : 12;
  const size = Math.max(4, Math.floor(Math.min(44, (920 - gap * (n - 1)) / n)));
  const totalWidth = size * n + gap * (n - 1);
  const startX = Math.round((COVER_W - totalWidth) / 2);
  const y = Math.round(centerY - size / 2);
  const radius = size * 0.28;

  ctx.save();
  entries.forEach((entry, i) => {
    const x = startX + i * (size + gap);
    roundedRectPath(ctx, x, y, size, size, radius);
    ctx.fillStyle = entry.hex;
    ctx.fill();
    if (size >= 20) {
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  });
  ctx.restore();
}
