"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";

interface CropPreviewProps {
  imageUrl: string;
  onCrop: (imageData: ImageData, width: number, height: number) => void;
  onBack: () => void;
}

interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

type DragMode = "move" | "nw" | "ne" | "sw" | "se" | "n" | "s" | "w" | "e";

const EDGE_THRESHOLD = 12;
const MIN_CROP_SIZE = 20;

function getEventCoords(
  e: React.MouseEvent | React.TouchEvent,
  rect: DOMRect
): { x: number; y: number } {
  if ("touches" in e) {
    return {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top,
    };
  }
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function getDragMode(
  mx: number,
  my: number,
  crop: CropRect
): DragMode | null {
  const { x, y, w, h } = crop;
  const right = x + w;
  const bottom = y + h;

  // Check corners first (they take priority)
  const nearLeft = Math.abs(mx - x) < EDGE_THRESHOLD;
  const nearRight = Math.abs(mx - right) < EDGE_THRESHOLD;
  const nearTop = Math.abs(my - y) < EDGE_THRESHOLD;
  const nearBottom = Math.abs(my - bottom) < EDGE_THRESHOLD;

  if (nearLeft && nearTop) return "nw";
  if (nearRight && nearTop) return "ne";
  if (nearLeft && nearBottom) return "sw";
  if (nearRight && nearBottom) return "se";

  // Check edges (only if not on a corner)
  if (nearLeft && my > y + EDGE_THRESHOLD && my < bottom - EDGE_THRESHOLD) return "w";
  if (nearRight && my > y + EDGE_THRESHOLD && my < bottom - EDGE_THRESHOLD) return "e";
  if (nearTop && mx > x + EDGE_THRESHOLD && mx < right - EDGE_THRESHOLD) return "n";
  if (nearBottom && mx > x + EDGE_THRESHOLD && mx < right - EDGE_THRESHOLD) return "s";

  // Check if inside the crop rectangle
  if (mx > x && mx < right && my > y && my < bottom) return "move";

  return null;
}

function getCursor(mode: DragMode | null): string {
  switch (mode) {
    case "nw":
    case "se":
      return "nwse-resize";
    case "ne":
    case "sw":
      return "nesw-resize";
    case "n":
    case "s":
      return "ns-resize";
    case "w":
    case "e":
      return "ew-resize";
    case "move":
      return "move";
    default:
      return "crosshair";
  }
}

function clampCropRect(crop: CropRect, imgW: number, imgH: number): CropRect {
  let { x, y, w, h } = crop;
  // Clamp position
  x = Math.max(0, x);
  y = Math.max(0, y);
  // Clamp size
  w = Math.max(MIN_CROP_SIZE, Math.min(w, imgW - x));
  h = Math.max(MIN_CROP_SIZE, Math.min(h, imgH - y));
  // If crop would go out of bounds, push it back
  if (x + w > imgW) x = Math.max(0, imgW - w);
  if (y + h > imgH) y = Math.max(0, imgH - h);
  return { x, y, w, h };
}

export function CropPreview({ imageUrl, onCrop, onBack }: CropPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragMode, setDragMode] = useState<DragMode | null>(null);
  const [hoverMode, setHoverMode] = useState<DragMode | null>(null);
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, w: 100, h: 100 });
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const dragStart = useRef({ x: 0, y: 0 });
  const cropStart = useRef<CropRect>({ x: 0, y: 0, w: 100, h: 100 });

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const maxW = 400,
        maxH = 400;
      let w = img.naturalWidth,
        h = img.naturalHeight;
      if (w > maxW) {
        h = (h * maxW) / w;
        w = maxW;
      }
      if (h > maxH) {
        w = (w * maxH) / h;
        h = maxH;
      }
      setImgSize({ w, h });
      setCrop({ x: 0, y: 0, w, h });
      setImgLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    if (!imgLoaded || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.onload = () => {
      canvas.width = imgSize.w;
      canvas.height = imgSize.h;
      ctx.drawImage(img, 0, 0, imgSize.w, imgSize.h);
      // Draw crop overlay
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(0, 0, canvas.width, crop.y);
      ctx.fillRect(0, crop.y + crop.h, canvas.width, canvas.height - crop.y - crop.h);
      ctx.fillRect(0, crop.y, crop.x, crop.h);
      ctx.fillRect(crop.x + crop.w, crop.y, canvas.width - crop.x - crop.w, crop.h);
      ctx.strokeStyle = "#ff8fa3";
      ctx.lineWidth = 2;
      ctx.strokeRect(crop.x, crop.y, crop.w, crop.h);
    };
    img.src = imageUrl;
  }, [imgLoaded, crop, imageUrl, imgSize]);

  const handlePointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      const { x: mx, y: my } = getEventCoords(e, rect);
      const mode = getDragMode(mx, my, crop);
      if (mode) {
        setDragMode(mode);
        dragStart.current = { x: mx, y: my };
        cropStart.current = { ...crop };
      }
    },
    [crop]
  );

  const handlePointerMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      const { x: mx, y: my } = getEventCoords(e, rect);

      if (dragMode) {
        const dx = mx - dragStart.current.x;
        const dy = my - dragStart.current.y;
        const start = cropStart.current;
        let newCrop: CropRect = { ...start };

        switch (dragMode) {
          case "move":
            newCrop.x = start.x + dx;
            newCrop.y = start.y + dy;
            break;
          case "se":
            newCrop.w = Math.max(MIN_CROP_SIZE, start.w + dx);
            newCrop.h = Math.max(MIN_CROP_SIZE, start.h + dy);
            break;
          case "nw":
            newCrop.x = start.x + dx;
            newCrop.y = start.y + dy;
            newCrop.w = start.w - dx;
            newCrop.h = start.h - dy;
            break;
          case "ne":
            newCrop.y = start.y + dy;
            newCrop.w = start.w + dx;
            newCrop.h = start.h - dy;
            break;
          case "sw":
            newCrop.x = start.x + dx;
            newCrop.w = start.w - dx;
            newCrop.h = start.h + dy;
            break;
          case "n":
            newCrop.y = start.y + dy;
            newCrop.h = start.h - dy;
            break;
          case "s":
            newCrop.h = start.h + dy;
            break;
          case "w":
            newCrop.x = start.x + dx;
            newCrop.w = start.w - dx;
            break;
          case "e":
            newCrop.w = start.w + dx;
            break;
        }

        newCrop = clampCropRect(newCrop, imgSize.w, imgSize.h);
        setCrop(newCrop);
      } else {
        // Update hover cursor
        const mode = getDragMode(mx, my, crop);
        setHoverMode(mode);
      }
    },
    [dragMode, crop, imgSize]
  );

  const handlePointerUp = useCallback(() => {
    setDragMode(null);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => handlePointerDown(e);
  const handleMouseMove = (e: React.MouseEvent) => handlePointerMove(e);
  const handleMouseUp = () => handlePointerUp();

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    handlePointerDown(e);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    handlePointerMove(e);
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    handlePointerUp();
  };

  const handleConfirm = () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    // Scale crop back to image's natural size
    const scaleX = canvasRef.current!.width / imgSize.w;
    const scaleY = canvasRef.current!.height / imgSize.h;
    const sx = crop.x / scaleX,
      sy = crop.y / scaleY;
    const sw = crop.w / scaleX,
      sh = crop.h / scaleY;
    canvas.width = sw;
    canvas.height = sh;
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      onCrop(ctx.getImageData(0, 0, sw, sh), sw, sh);
    };
    img.src = imageUrl;
  };

  if (!imgLoaded) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      </div>
    );
  }

  const currentCursor = dragMode
    ? getCursor(dragMode)
    : hoverMode
    ? getCursor(hoverMode)
    : "crosshair";

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas
        ref={canvasRef}
        width={imgSize.w}
        height={imgSize.h}
        className="rounded-2xl shadow-card"
        style={{ cursor: currentCursor, touchAction: "none" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
      <p className="text-sm text-text-secondary">
        Drag corners or edges to adjust the crop area, or drag inside to move it
      </p>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleConfirm}>Crop &amp; Continue</Button>
      </div>
    </div>
  );
}