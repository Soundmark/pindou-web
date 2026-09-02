/**
 * 屏幕内 canvas 绘制用的 UI 色板。
 * 与 globals.css 的令牌注释保持同步 — canvas 无法低成本读 CSS 变量，
 * 改主题色时需手动同步这里。
 */
export const CANVAS_THEME = {
  gridLine: "#e2ccc7", // 暖灰网格线（对应 --color-gray-300）
  highlight: "#c73a58", // 选中高亮 = --color-primary-strong
  labelDark: "#5b423d", // 单元格编号文字 = --color-gray-700
  labelLight: "#ffffff", // 深色格子上的编号文字
  checkerDark: "#eee1dd", // 暖色棋盘格（透明背景指示）
  cropMask: "rgba(74, 36, 48, 0.40)", // 裁剪遮罩 = primary-ink 40%
  cropOutline: "#c73a58", // 裁剪框描边 = primary-strong，浅/深照片上都可见
} as const;
