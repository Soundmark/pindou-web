/**
 * 封面智能配色：从图纸使用最多的珠子颜色推导封面的点缀色。
 *
 * 纯函数、无 DOM 依赖，只做 sRGB/HSL 运算，不引入第三方库。
 * 主色取「有彩度、亮度适中」的最高频颜色 —— 近黑/近白/灰会被跳过，
 * 所以黑白线稿也能推出里面的彩色；全灰图案回退品牌色板，渲染结果与旧版一致。
 */
import { SOCIAL_THEME } from "@/utils/canvasTheme";

export interface CoverPaletteInput {
  hex: string;
  count: number;
}

export interface CoverPalette {
  /** 奶油底 + 主色微调 */
  background: string;
  /** 三个大装饰圆（颜色 + 透明度） */
  decor: { color: string; alpha: number }[];
  /** 四颗散珠 */
  beadDots: string[];
  /** 图纸卡错位底板 */
  plate: string;
  /** 图纸卡柔和投影（主色 22% 透明） */
  cardShadow: string;
  /** 标题下划线 */
  underline: string;
  /** 左上胶带 / 右上胶带 */
  tapeA: string;
  tapeB: string;
  /** 三张数据卡的数字 */
  statValue: string;
  /** 页脚胶囊底 / 水印文字 */
  footerBg: string;
  footerInk: string;
  /** 3×3 Logo 中心格 */
  logoCenter: string;
  /** 是否退回品牌色板（空图案/全灰/全白黑） */
  isFallback: boolean;
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

interface Hsl {
  h: number;
  s: number;
  l: number;
}

const WHITE = "#ffffff";

/** 主色可用范围：太黑会糊，太白/太灰没有彩度 */
const MIN_LIGHTNESS = 0.12;
const MAX_LIGHTNESS = 0.85;
const MIN_SATURATION = 0.18;
/** 副色 / 第三色与已选色的最小色相距离（度） */
const MIN_HUE_DISTANCE = 40;

export function deriveCoverPalette(
  entries: ReadonlyArray<CoverPaletteInput>
): CoverPalette {
  // computePatternStats 已按数量降序，这里再排一次，保证纯函数不依赖调用方顺序
  const sorted = [...entries].sort((a, b) => b.count - a.count);
  const picked: { hex: string; hsl: Hsl }[] = [];

  for (const entry of sorted) {
    const hsl = usableHsl(entry.hex);
    if (!hsl) continue;
    if (picked.some((item) => hueDistance(item.hsl.h, hsl.h) < MIN_HUE_DISTANCE)) continue;
    picked.push({ hex: entry.hex, hsl });
    if (picked.length === 3) break;
  }

  if (picked.length === 0) return fallbackPalette();

  // 只借主色的色相，把亮度和饱和度抬到「展示色」区间：
  // 深棕/墨绿这类图案主色直接做粉彩会发灰，提亮后才有糖果感。
  const display = displayTone(picked[0].hsl);
  const displaySecondary = picked[1]
    ? displayTone(picked[1].hsl)
    : SOCIAL_THEME.candyMint;
  const displayTertiary = picked[2]
    ? displayTone(picked[2].hsl)
    : SOCIAL_THEME.candyYellow;

  const footerBg = mix(display, WHITE, 0.82);
  // 数据卡数字与页脚水印都按 4.5:1 兜底；浅黄这类高亮色会被继续压暗
  const statValue = ensureContrast(withLightness(display, 0.32, 0.6), [
    WHITE,
    footerBg,
  ]);
  const footerInk = ensureContrast(statValue, [footerBg]);
  const midTone = withLightness(display, 0.62, 0.62);

  return {
    background: mix(SOCIAL_THEME.background, display, 0.1),
    decor: [
      { color: pastel(display, 0.42), alpha: 0.38 },
      { color: pastel(displaySecondary, 0.38), alpha: 0.26 },
      { color: pastel(displayTertiary, 0.38), alpha: 0.32 },
    ],
    // 散珠保留图纸里的真实颜色，让它们看起来就是图案上的豆子
    beadDots: [
      picked[0].hex,
      picked[1]?.hex ?? SOCIAL_THEME.candyMint,
      SOCIAL_THEME.candyYellow,
      picked[2]?.hex ?? SOCIAL_THEME.candyYellow,
    ],
    plate: mix(display, WHITE, 0.68),
    cardShadow: withAlpha(display, 0.22),
    underline: midTone,
    tapeA: pastel(display, 0.5),
    tapeB: SOCIAL_THEME.candyYellow,
    statValue,
    footerBg,
    footerInk,
    logoCenter: midTone,
    isFallback: false,
  };
}

/** 与旧版封面逐像素一致的品牌 fallback。 */
function fallbackPalette(): CoverPalette {
  return {
    background: SOCIAL_THEME.background,
    decor: [
      { color: SOCIAL_THEME.primaryLight, alpha: 0.35 },
      { color: SOCIAL_THEME.candyMint, alpha: 0.22 },
      { color: SOCIAL_THEME.candyYellow, alpha: 0.3 },
    ],
    beadDots: [
      SOCIAL_THEME.primary,
      SOCIAL_THEME.candyYellow,
      SOCIAL_THEME.candyMint,
      SOCIAL_THEME.primaryLight,
    ],
    plate: SOCIAL_THEME.coverPlate,
    cardShadow: "rgba(214, 120, 138, 0.22)",
    underline: SOCIAL_THEME.primary,
    tapeA: SOCIAL_THEME.candyYellow,
    tapeB: SOCIAL_THEME.primaryLight,
    statValue: SOCIAL_THEME.ink,
    footerBg: SOCIAL_THEME.pillBg,
    footerInk: SOCIAL_THEME.primaryStrong,
    logoCenter: SOCIAL_THEME.primary,
    isFallback: true,
  };
}

// =============================================================================
// 颜色运算
// =============================================================================

function usableHsl(hex: string): Hsl | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const hsl = rgbToHsl(rgb);
  if (hsl.l < MIN_LIGHTNESS || hsl.l > MAX_LIGHTNESS) return null;
  if (hsl.s < MIN_SATURATION) return null;
  return hsl;
}

function hueDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/** 向白色混合，得到品牌同族的粉彩色。 */
function pastel(hex: string, amount: number): string {
  return mix(hex, WHITE, amount);
}

/** amount 为 `to` 的占比。 */
function mix(from: string, to: string, amount: number): string {
  const a = parseHex(from);
  const b = parseHex(to);
  if (!a || !b) return from;
  const t = Math.max(0, Math.min(1, amount));
  return toHex({
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  });
}

/** 给颜色套一层 alpha，用于 Canvas 的 shadowColor。 */
function withAlpha(hex: string, alpha: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function withLightness(hex: string, lightness: number, minSaturation: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const hsl = rgbToHsl(rgb);
  return toHex(
    hslToRgb({
      h: hsl.h,
      s: Math.max(hsl.s, minSaturation),
      l: lightness,
    })
  );
}

/**
 * 展示色：保留色相，把亮度和饱和度夹到糖果色区间。
 * 图案主色常常偏深（深棕、墨绿）或偏灰，直接做粉彩会显得脏。
 */
function displayTone(hsl: Hsl): string {
  return toHex(
    hslToRgb({
      h: hsl.h,
      s: Math.min(0.95, Math.max(hsl.s, 0.55)),
      l: Math.min(0.66, Math.max(hsl.l, 0.55)),
    })
  );
}

function shiftLightness(hex: string, delta: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const hsl = rgbToHsl(rgb);
  return toHex(hslToRgb({ ...hsl, l: Math.max(0, Math.min(1, hsl.l + delta)) }));
}

/** 不满足对比度时逐步压暗；仍不满足则回退品牌深色。 */
function ensureContrast(
  hex: string,
  backgrounds: readonly string[],
  minimum = 4.5
): string {
  let current = hex;
  for (let i = 0; i < 12; i++) {
    if (backgrounds.every((bg) => contrastRatio(current, bg) >= minimum)) {
      return current;
    }
    current = shiftLightness(current, -0.04);
  }
  const fallback = SOCIAL_THEME.ink;
  return backgrounds.every((bg) => contrastRatio(fallback, bg) >= minimum)
    ? fallback
    : SOCIAL_THEME.primaryStrong;
}

/** WCAG 相对亮度（sRGB 线性化）。 */
function relativeLuminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const linear = (value: number) => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * linear(rgb.r) + 0.7152 * linear(rgb.g) + 0.0722 * linear(rgb.b)
  );
}

function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

function parseHex(hex: string): Rgb | null {
  const value = hex.trim().replace(/^#/, "");
  const expanded =
    value.length === 3
      ? value
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : value;
  if (!/^[0-9a-f]{6}$/i.test(expanded)) return null;
  return {
    r: parseInt(expanded.slice(0, 2), 16),
    g: parseInt(expanded.slice(2, 4), 16),
    b: parseInt(expanded.slice(4, 6), 16),
  };
}

function toHex({ r, g, b }: Rgb): string {
  const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
  return `#${[r, g, b]
    .map((value) => clamp(value).toString(16).padStart(2, "0"))
    .join("")}`;
}

function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return { h: 0, s: 0, l };

  const s = delta / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) h = ((gn - bn) / delta) % 6;
  else if (max === gn) h = (bn - rn) / delta + 2;
  else h = (rn - gn) / delta + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s, l };
}

function hslToRgb({ h, s, l }: Hsl): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let rgb: [number, number, number];
  if (hp < 1) rgb = [c, x, 0];
  else if (hp < 2) rgb = [x, c, 0];
  else if (hp < 3) rgb = [0, c, x];
  else if (hp < 4) rgb = [0, x, c];
  else if (hp < 5) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  const m = l - c / 2;
  return {
    r: (rgb[0] + m) * 255,
    g: (rgb[1] + m) * 255,
    b: (rgb[2] + m) * 255,
  };
}
