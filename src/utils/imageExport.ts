/**
 * 客户端图片导出与 R2 上传工具。
 * 仅在浏览器环境使用（依赖 canvas / fetch）。
 */
import { BEAD_PALETTE } from "@/utils/beadColors";
import { CANVAS_THEME } from "@/utils/canvasTheme";

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

/**
 * 把图纸（像素矩阵）渲染成缩略图 Blob，风格与 PatternCanvas 一致：
 * BEAD_PALETTE 色块 + 细网格线 + 白底。
 */
export function createPatternThumbnailBlob(
  pixels: number[][],
  targetMaxEdge = 512
): Promise<Blob> {
  const h = pixels.length;
  const w = pixels[0]?.length ?? 0;
  const cellSize = Math.max(2, Math.floor(targetMaxEdge / Math.max(w, h)));
  const canvas = document.createElement("canvas");
  canvas.width = w * cellSize;
  canvas.height = h * cellSize;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const color = BEAD_PALETTE[pixels[y][x]];
      const px = x * cellSize;
      const py = y * cellSize;
      ctx.fillStyle = color?.hex ?? "#ffffff";
      ctx.fillRect(px, py, cellSize, cellSize);
      ctx.strokeStyle = CANVAS_THEME.gridLine;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(px, py, cellSize, cellSize);
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Pattern thumbnail generation failed"))),
      "image/png"
    );
  });
}

/**
 * 向 /api/upload 申请预签名地址，然后直传 R2，返回公开访问 URL。
 */
export async function uploadImageToR2(
  blob: Blob,
  contentType: string,
  filename: string
): Promise<string> {
  const presignRes = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, contentType }),
  });
  const presignJson = await presignRes.json();
  if (!presignRes.ok || !presignJson.data) {
    throw new Error(presignJson.error ?? "Failed to request upload URL");
  }

  const { uploadUrl, publicUrl } = presignJson.data;
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });
  if (!putRes.ok) throw new Error("Failed to upload file");

  return publicUrl;
}
