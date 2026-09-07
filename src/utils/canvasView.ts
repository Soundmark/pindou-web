/**
 * Canvas 视口变换工具：CropPreview 与 PatternEditor 共用的
 * 缩放/平移数学。坐标均为 stage（canvas CSS 像素）坐标。
 */

export interface View {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function fitViewFor(
  stage: { w: number; h: number },
  imgW: number,
  imgH: number
): View {
  const scale = Math.min(stage.w / imgW, stage.h / imgH);
  return {
    scale,
    offsetX: (stage.w - imgW * scale) / 2,
    offsetY: (stage.h - imgH * scale) / 2,
  };
}

/** 以 anchor 为锚点缩放（锚点对应的场景点保持不动）。 */
export function zoomAt(anchor: { x: number; y: number }, view: View, newScale: number): View {
  const ratio = newScale / view.scale;
  return {
    scale: newScale,
    offsetX: anchor.x - (anchor.x - view.offsetX) * ratio,
    offsetY: anchor.y - (anchor.y - view.offsetY) * ratio,
  };
}

export function getStagePoint(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
}
