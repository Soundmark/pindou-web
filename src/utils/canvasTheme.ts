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
