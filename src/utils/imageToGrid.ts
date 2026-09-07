/**
 * 图像 → 拼豆网格：LUT 加速 + 双线性缩放 + CIE94 最近色匹配。
 * 从原 useImageProcessor hook 抽出的纯函数（无 React 状态）。
 */
import { BEAD_PALETTE, loadLut, findNearestBeadColorFast } from "@/utils/beadColors";
import { bilinearResize } from "@/utils/imageProcessor";

export async function convertImageToGrid(
  imageData: ImageData,
  gridWidth: number,
  gridHeight: number
): Promise<number[][]> {
  // Ensure LUT is loaded
  await loadLut();

  // Resize to grid dimensions
  const scaled = bilinearResize(
    imageData.data,
    imageData.width,
    imageData.height,
    gridWidth,
    gridHeight
  );

  // Match colors
  const pixels: number[][] = [];
  for (let y = 0; y < gridHeight; y++) {
    const row: number[] = [];
    for (let x = 0; x < gridWidth; x++) {
      const idx = (y * gridWidth + x) * 4;
      const color = findNearestBeadColorFast(
        scaled[idx],
        scaled[idx + 1],
        scaled[idx + 2],
        "cie94"
      );
      row.push(BEAD_PALETTE.indexOf(color));
    }
    pixels.push(row);
  }
  return pixels;
}

/** 把图片 URL 解码为全尺寸 ImageData（仅浏览器环境）。 */
export function loadImageData(src: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, img.width, img.height));
    };
    img.onerror = () => reject(new Error("Image failed to load"));
    img.src = src;
  });
}
