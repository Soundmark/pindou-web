/**
 * 屏幕内 canvas 绘制用的 UI 色板。
 * 与 globals.css 的令牌注释保持同步 — canvas 无法低成本读 CSS 变量，
 * 改主题色时需手动同步这里。
 */
export const CANVAS_THEME = {
  gridLine: "#e2ccc7", // 暖灰网格线（对应 --color-gray-300）
  gridLineStrong: "#ab948e", // 每5格粗网格线（对应 --color-gray-400），便于对照拼豆板
  highlight: "#c73a58", // 选中高亮 = --color-primary-strong
  labelDark: "#5b423d", // 单元格编号文字 = --color-gray-700
  labelLight: "#ffffff", // 深色格子上的编号文字
  checkerDark: "#eee1dd", // 暖色棋盘格（透明背景指示）
  cropMask: "rgba(74, 36, 48, 0.40)", // 裁剪遮罩 = primary-ink 40%
  cropOutline: "#c73a58", // 裁剪框描边 = primary-strong，浅/深照片上都可见
} as const;

/** 相对亮度（0~1），用于决定格子上的标签用深字还是浅字。 */
export function getLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * 社交媒体素材（封面/图纸）的 Canvas 色板。
 * 与 globals.css 的 @theme inline 一一对应；改主题色时必须同步这里。
 */
export const SOCIAL_THEME = {
  background: "#fdf8f3", // --color-background
  card: "#ffffff", // --color-card-bg
  border: "#f2d6d9", // --color-clay-border
  borderStrong: "#ecc3c9", // --color-clay-border-strong
  ink: "#4a2430", // --color-primary-ink
  textPrimary: "#4a3436", // --color-text-primary
  textSecondary: "#7a5f5c", // --color-text-secondary
  textMuted: "#a08a86", // --color-text-muted
  primary: "#ff8fa3", // --color-primary
  primaryLight: "#ffc9d4", // --color-primary-light
  primaryStrong: "#c73a58", // --color-primary-strong
  candyMint: "#55efc4", // --color-green-candy
  candyYellow: "#ffeaa7", // --color-yellow-candy
  pillBg: "#fff0f4", // 主粉的浅色底（封面数据胶囊）
  coverPlate: "#ffe3e9", // 封面图纸卡错位底板（主粉 78% 白）
  watermarkColor: "rgba(74, 36, 48, 0.10)",
  watermarkText: "拼豆屋",
} as const;

/** 封面标签的糖果底色轮换（与糖果点缀色同族，深色字保证对比度）。 */
export const SOCIAL_TAG_TINTS = [
  { bg: "#ffe1e8", fg: "#b52e4c" }, // 粉
  { bg: "#d9fff4", fg: "#0f7a5f" }, // 薄荷
  { bg: "#fff6cf", fg: "#8a6a00" }, // 黄
  { bg: "#e6f1ff", fg: "#2d5c99" }, // 蓝
] as const;

/**
 * 读取 next/font 注入的实际 font-family。
 * Canvas 的 ctx.font 无法解析 CSS 变量，只能在这里换成字符串。
 */
export function getCanvasFontFamily(): string {
  if (typeof document === "undefined") return '"PingFang SC", "Microsoft YaHei", sans-serif';
  const root = getComputedStyle(document.documentElement);
  const families = ["--font-nunito", "--font-fredoka"]
    .map((name) => root.getPropertyValue(name).trim())
    .filter(Boolean);
  return [...families, '"PingFang SC"', '"Microsoft YaHei"', "sans-serif"].join(", ");
}

/**
 * 标题/数字用的展示字体：Fredoka 优先。
 * 两个变量解析出来都是完整 fallback 链，拼在一起时 Nunito 恒在前，
 * Fredoka 永远不会命中 —— 展示文本必须单独把 Fredoka 排到最前。
 * Fredoka 只有拉丁子集，中文照旧回退苹方/雅黑。
 */
export function getCanvasHeadingFamily(): string {
  if (typeof document === "undefined") return '"PingFang SC", "Microsoft YaHei", sans-serif';
  const root = getComputedStyle(document.documentElement);
  const families = ["--font-fredoka", "--font-nunito"]
    .map((name) => root.getPropertyValue(name).trim())
    .filter(Boolean);
  return [...families, '"PingFang SC"', '"Microsoft YaHei"', "sans-serif"].join(", ");
}
