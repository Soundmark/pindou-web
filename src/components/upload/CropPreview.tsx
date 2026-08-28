"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

interface View {
  scale: number;
  offsetX: number;
  offsetY: number;
}

type DragMode = "move" | "nw" | "ne" | "sw" | "se" | "n" | "s" | "w" | "e" | "pan" | "panImage";

type InteractionMode = "both" | "crop" | "image";

const EDGE_THRESHOLD = 12; // px, hit area around crop edges
const MIN_CROP_SCREEN = 20; // min crop size on screen, px
const MAX_SCALE = 16; // max zoom relative to natural pixels
const ZOOM_STEP = 1.25;
const MAX_OUTPUT_DIM = 4096; // cap confirm output resolution

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampScale(scale: number, minScale: number): number {
  return clamp(scale, minScale, MAX_SCALE);
}

function fitViewFor(
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

function zoomAt(anchor: { x: number; y: number }, view: View, newScale: number): View {
  const ratio = newScale / view.scale;
  return {
    scale: newScale,
    offsetX: anchor.x - (anchor.x - view.offsetX) * ratio,
    offsetY: anchor.y - (anchor.y - view.offsetY) * ratio,
  };
}

function cropScreenRect(crop: CropRect, view: View): CropRect {
  return {
    x: crop.x * view.scale + view.offsetX,
    y: crop.y * view.scale + view.offsetY,
    w: crop.w * view.scale,
    h: crop.h * view.scale,
  };
}

function hitTest(mx: number, my: number, rect: CropRect): DragMode | null {
  const { x, y, w, h } = rect;
  const right = x + w;
  const bottom = y + h;

  const nearLeft = Math.abs(mx - x) < EDGE_THRESHOLD;
  const nearRight = Math.abs(mx - right) < EDGE_THRESHOLD;
  const nearTop = Math.abs(my - y) < EDGE_THRESHOLD;
  const nearBottom = Math.abs(my - bottom) < EDGE_THRESHOLD;

  if (nearLeft && nearTop) return "nw";
  if (nearRight && nearTop) return "ne";
  if (nearLeft && nearBottom) return "sw";
  if (nearRight && nearBottom) return "se";

  if (nearLeft && my > y + EDGE_THRESHOLD && my < bottom - EDGE_THRESHOLD) return "w";
  if (nearRight && my > y + EDGE_THRESHOLD && my < bottom - EDGE_THRESHOLD) return "e";
  if (nearTop && mx > x + EDGE_THRESHOLD && mx < right - EDGE_THRESHOLD) return "n";
  if (nearBottom && mx > x + EDGE_THRESHOLD && mx < right - EDGE_THRESHOLD) return "s";

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
    case "pan":
    case "panImage":
      return "grab";
    default:
      return "default";
  }
}

function clampCropToStage(crop: CropRect, view: View, stage: { w: number; h: number }): CropRect {
  const { scale, offsetX, offsetY } = view;
  const sw = crop.w * scale;
  const sh = crop.h * scale;
  // The crop may extend past the image (blank border), but keep it
  // intersecting the stage so it stays visible and grabbable.
  const minX = (-offsetX - sw) / scale;
  const maxX = (stage.w - offsetX) / scale;
  const minY = (-offsetY - sh) / scale;
  const maxY = (stage.h - offsetY) / scale;
  return {
    ...crop,
    x: clamp(crop.x, Math.min(minX, maxX), Math.max(minX, maxX)),
    y: clamp(crop.y, Math.min(minY, maxY), Math.max(minY, maxY)),
  };
}

function normalizeCrop(crop: CropRect, view: View, stage: { w: number; h: number }): CropRect {
  const minSize = Math.max(1, MIN_CROP_SCREEN / view.scale);
  return clampCropToStage(
    { ...crop, w: Math.max(minSize, crop.w), h: Math.max(minSize, crop.h) },
    view,
    stage
  );
}

function touchDist(a: React.Touch, b: React.Touch): number {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function touchMid(a: React.Touch, b: React.Touch): { x: number; y: number } {
  return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
}

export function CropPreview({ imageUrl, onCrop, onBack }: CropPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [stage, setStage] = useState<{ w: number; h: number } | null>(null);
  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null);
  const [errorUrl, setErrorUrl] = useState<string | null>(null);
  const [initKey, setInitKey] = useState<string | null>(null);
  const [view, setView] = useState<View>({ scale: 1, offsetX: 0, offsetY: 0 });
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, w: 100, h: 100 });
  const [dragMode, setDragMode] = useState<DragMode | null>(null);
  const [hoverMode, setHoverMode] = useState<DragMode | null>(null);
  const [hoverPan, setHoverPan] = useState(false);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>("both");

  const dragStart = useRef({ x: 0, y: 0 });
  const cropStart = useRef<CropRect>({ x: 0, y: 0, w: 100, h: 100 });
  const viewStart = useRef<View>({ scale: 1, offsetX: 0, offsetY: 0 });
  const pinchRef = useRef<{ prevDist: number } | null>(null);
  const primaryTouchIdRef = useRef<number | null>(null);
  const prevTouchCountRef = useRef(0);
  const [hasUserZoomed, setHasUserZoomed] = useState(false);

  // Reset load state while rendering when the image url changes (usually the
  // component remounts, but this keeps behavior correct if it ever doesn't).
  const [resolvedUrl, setResolvedUrl] = useState(imageUrl);
  if (resolvedUrl !== imageUrl) {
    setResolvedUrl(imageUrl);
    setImgDims(null);
    setInitKey(null);
    setErrorUrl(null);
    setHasUserZoomed(false);
  }

  // Fit the image once stage and image are both known, and refit on stage
  // size changes while the user has not zoomed or panned. Adjusting state
  // during render flips readiness and the view in the same commit, so the
  // first paint never shows a stale transform.
  if (stage && imgDims && !hasUserZoomed) {
    const key = `${stage.w}x${stage.h}/${imgDims.w}x${imgDims.h}`;
    if (initKey !== key) {
      setInitKey(key);
      setView(fitViewFor(stage, imgDims.w, imgDims.h));
      setCrop({ x: 0, y: 0, w: imgDims.w, h: imgDims.h });
    }
  }
  const viewReady = initKey !== null;

  // Measure the fixed stage size.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setStage({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Load and cache the decoded image once per url.
  useEffect(() => {
    imgRef.current = null;
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgDims({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => setErrorUrl(imageUrl);
    img.src = imageUrl;
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [imageUrl]);

  // Draw: checkerboard background, image (pixelated when magnified past
  // native resolution), crop mask + outline.
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !stage || !imgDims || !viewReady) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(stage.w * dpr);
    canvas.height = Math.round(stage.h * dpr);
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Checkerboard background (visible through transparent pixels).
    const checker = 12;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, stage.w, stage.h);
    ctx.fillStyle = "#e9e9e9";
    for (let y = 0; y * checker < stage.h; y++) {
      for (let x = 0; x * checker < stage.w; x++) {
        if ((x + y) % 2 === 0) ctx.fillRect(x * checker, y * checker, checker, checker);
      }
    }

    ctx.imageSmoothingEnabled = view.scale * dpr <= 1;
    ctx.setTransform(
      dpr * view.scale,
      0,
      0,
      dpr * view.scale,
      dpr * view.offsetX,
      dpr * view.offsetY
    );
    ctx.drawImage(img, 0, 0);

    // Crop overlay in stage coordinates.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sx = crop.x * view.scale + view.offsetX;
    const sy = crop.y * view.scale + view.offsetY;
    const sw = crop.w * view.scale;
    const sh = crop.h * view.scale;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, stage.w, Math.max(0, sy));
    ctx.fillRect(0, sy + sh, stage.w, Math.max(0, stage.h - sy - sh));
    ctx.fillRect(0, Math.max(0, sy), Math.max(0, sx), Math.min(sh, stage.h - Math.max(0, sy)));
    ctx.fillRect(sx + sw, Math.max(0, sy), Math.max(0, stage.w - sx - sw), Math.min(sh, stage.h - Math.max(0, sy)));
    ctx.strokeStyle = "#ff8fa3";
    ctx.lineWidth = 2;
    ctx.strokeRect(sx, sy, sw, sh);
  }, [stage, imgDims, view, crop, viewReady]);

  // Zoom follows the interaction mode: "both" scales the scene (image +
  // crop together), "crop" resizes only the crop box, "image" scales only
  // the image while the crop's on-screen rect stays constant.
  const applyZoom = useCallback(
    (factor: number, anchor: { x: number; y: number }) => {
      if (!stage || !imgDims) return;
      setHasUserZoomed(true);
      if (interactionMode === "crop") {
        const rect = cropScreenRect(crop, view);
        const s = view.scale;
        setCrop(
          normalizeCrop(
            {
              x: (anchor.x - (anchor.x - rect.x) * factor - view.offsetX) / s,
              y: (anchor.y - (anchor.y - rect.y) * factor - view.offsetY) / s,
              w: (rect.w * factor) / s,
              h: (rect.h * factor) / s,
            },
            view,
            stage
          )
        );
        return;
      }
      const fitScale = Math.min(stage.w / imgDims.w, stage.h / imgDims.h);
      const nextScale = clampScale(view.scale * factor, fitScale);
      if (nextScale === view.scale) return;
      const next = zoomAt(anchor, view, nextScale);
      if (interactionMode === "image") {
        const rect = cropScreenRect(crop, view);
        setCrop(
          clampCropToStage(
            {
              x: (rect.x - next.offsetX) / next.scale,
              y: (rect.y - next.offsetY) / next.scale,
              w: rect.w / next.scale,
              h: rect.h / next.scale,
            },
            next,
            stage
          )
        );
      }
      setView(next);
    },
    [stage, imgDims, interactionMode, crop, view]
  );

  // Wheel zoom. React attaches wheel as passive, so bind natively to allow
  // preventDefault; ctrl+wheel keeps the browser page zoom.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !stage || !imgDims || !viewReady) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      applyZoom(Math.exp(-delta * 0.0015), { x: px, y: py });
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [stage, imgDims, viewReady, applyZoom]);

  const getStagePoint = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const handlePointerDownAt = useCallback(
    (clientX: number, clientY: number) => {
      if (!stage || !imgDims || !canvasRef.current) return;
      const p = getStagePoint(clientX, clientY);
      const hit = hitTest(p.x, p.y, cropScreenRect(crop, view));
      // Edge/corner resize is available in every mode.
      if (hit && hit !== "move") {
        setDragMode(hit);
        dragStart.current = p;
        cropStart.current = { ...crop };
        viewStart.current = { ...view };
        return;
      }
      const scaledW = imgDims.w * view.scale;
      const scaledH = imgDims.h * view.scale;
      const onImage =
        p.x >= view.offsetX &&
        p.x <= view.offsetX + scaledW &&
        p.y >= view.offsetY &&
        p.y <= view.offsetY + scaledH;
      if (!onImage) return;
      // Inside the crop box ("move") or on the image outside it: the mode
      // decides what the drag controls.
      let nextMode: DragMode | null = null;
      if (interactionMode === "crop") {
        nextMode = hit === "move" ? "move" : null;
      } else if (interactionMode === "image") {
        nextMode = "panImage";
      } else {
        nextMode = "pan";
      }
      if (!nextMode) return;
      setDragMode(nextMode);
      dragStart.current = p;
      cropStart.current = { ...crop };
      viewStart.current = { ...view };
    },
    [crop, view, stage, imgDims, getStagePoint, interactionMode]
  );

  const handlePointerMoveAt = useCallback(
    (clientX: number, clientY: number) => {
      if (!stage || !imgDims || !canvasRef.current) return;
      const p = getStagePoint(clientX, clientY);

      if (dragMode === "pan") {
        // "both" mode: image + crop move together as a group, fully free.
        const next = {
          scale: viewStart.current.scale,
          offsetX: viewStart.current.offsetX + (p.x - dragStart.current.x),
          offsetY: viewStart.current.offsetY + (p.y - dragStart.current.y),
        };
        setHasUserZoomed(true);
        setView(next);
        return;
      }

      if (dragMode === "panImage") {
        // "image" mode: crop stays fixed on screen, image slides beneath it.
        // The crop translates opposite to the drag; normalizeCrop pins it at
        // the stage edge if it would leave the visible area.
        const scale = viewStart.current.scale;
        const dx = (p.x - dragStart.current.x) / scale;
        const dy = (p.y - dragStart.current.y) / scale;
        const start = cropStart.current;
        const actual = normalizeCrop(
          { x: start.x - dx, y: start.y - dy, w: start.w, h: start.h },
          viewStart.current,
          stage
        );
        // Offset moves opposite to the crop so its screen position is constant.
        setHasUserZoomed(true);
        setView({
          scale: viewStart.current.scale,
          offsetX: viewStart.current.offsetX - (actual.x - start.x) * scale,
          offsetY: viewStart.current.offsetY - (actual.y - start.y) * scale,
        });
        setCrop(actual);
        return;
      }

      if (dragMode) {
        const scale = view.scale;
        const dx = (p.x - dragStart.current.x) / scale;
        const dy = (p.y - dragStart.current.y) / scale;
        const start = cropStart.current;
        const next: CropRect = { ...start };
        switch (dragMode) {
          case "move":
            next.x = start.x + dx;
            next.y = start.y + dy;
            break;
          case "se":
            next.w = start.w + dx;
            next.h = start.h + dy;
            break;
          case "nw":
            next.x = start.x + dx;
            next.y = start.y + dy;
            next.w = start.w - dx;
            next.h = start.h - dy;
            break;
          case "ne":
            next.y = start.y + dy;
            next.w = start.w + dx;
            next.h = start.h - dy;
            break;
          case "sw":
            next.x = start.x + dx;
            next.w = start.w - dx;
            next.h = start.h + dy;
            break;
          case "n":
            next.y = start.y + dy;
            next.h = start.h - dy;
            break;
          case "s":
            next.h = start.h + dy;
            break;
          case "w":
            next.x = start.x + dx;
            next.w = start.w - dx;
            break;
          case "e":
            next.w = start.w + dx;
            break;
          default:
            break;
        }
        setCrop(normalizeCrop(next, view, stage));
        return;
      }

      // Hover cursor only.
      const hit = hitTest(p.x, p.y, cropScreenRect(crop, view));
      const scaledW = imgDims.w * view.scale;
      const scaledH = imgDims.h * view.scale;
      const onImage =
        p.x >= view.offsetX &&
        p.x <= view.offsetX + scaledW &&
        p.y >= view.offsetY &&
        p.y <= view.offsetY + scaledH;
      if (hit && hit !== "move") {
        setHoverMode(hit);
        setHoverPan(false);
      } else if (interactionMode === "crop") {
        setHoverMode(hit);
        setHoverPan(false);
      } else {
        setHoverMode(null);
        setHoverPan(onImage);
      }
    },
    [dragMode, crop, view, stage, imgDims, getStagePoint, interactionMode]
  );

  const handlePointerUpAt = useCallback(() => {
    setDragMode(null);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => handlePointerDownAt(e.clientX, e.clientY);
  const handleMouseMove = (e: React.MouseEvent) => handlePointerMoveAt(e.clientX, e.clientY);
  const handleMouseUp = () => handlePointerUpAt();

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length >= 2) {
      setDragMode(null);
      pinchRef.current = { prevDist: touchDist(e.touches[0], e.touches[1]) };
      prevTouchCountRef.current = 2;
      return;
    }
    const t = e.touches[0];
    primaryTouchIdRef.current = t.identifier;
    handlePointerDownAt(t.clientX, t.clientY);
    prevTouchCountRef.current = 1;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length >= 2) {
      const pinch = pinchRef.current;
      const dist = touchDist(e.touches[0], e.touches[1]);
      if (pinch && pinch.prevDist > 0) {
        applyZoom(dist / pinch.prevDist, touchMid(e.touches[0], e.touches[1]));
        pinch.prevDist = dist;
      }
      prevTouchCountRef.current = 2;
      return;
    }
    if (e.touches.length === 1) {
      const t = e.touches[0];
      primaryTouchIdRef.current = t.identifier;
      if (prevTouchCountRef.current >= 2) {
        // One finger left after a pinch → re-dispatch like a fresh pointer
        // down (mode-aware, no jump because baselines are re-captured).
        pinchRef.current = null;
        const t = e.touches[0];
        primaryTouchIdRef.current = t.identifier;
        handlePointerDownAt(t.clientX, t.clientY);
        prevTouchCountRef.current = 1;
        return;
      }
      handlePointerMoveAt(t.clientX, t.clientY);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      setDragMode(null);
      pinchRef.current = null;
      prevTouchCountRef.current = 0;
      primaryTouchIdRef.current = null;
      return;
    }
    if (e.touches.length === 1 && prevTouchCountRef.current >= 2) {
      const t = e.touches[0];
      primaryTouchIdRef.current = t.identifier;
      pinchRef.current = null;
      handlePointerDownAt(t.clientX, t.clientY);
      prevTouchCountRef.current = 1;
    }
  };

  const zoomBy = (factor: number) => {
    if (!stage) return;
    applyZoom(factor, { x: stage.w / 2, y: stage.h / 2 });
  };

  const handleFit = () => {
    // Reset both view and crop to the initial fit state (the render-time
    // adjustment reapplies them once hasUserZoomed is cleared).
    setHasUserZoomed(false);
    setInitKey(null);
  };

  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img) return;
    let outW = Math.round(crop.w);
    let outH = Math.round(crop.h);
    if (outW * outH > MAX_OUTPUT_DIM * MAX_OUTPUT_DIM) {
      const k = Math.sqrt((MAX_OUTPUT_DIM * MAX_OUTPUT_DIM) / (outW * outH));
      outW = Math.max(1, Math.round(outW * k));
      outH = Math.max(1, Math.round(outH * k));
    }
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d")!;
    // Areas of the crop that fall outside the image render as blank white.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, outW, outH);
    ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, outW, outH);
    onCrop(ctx.getImageData(0, 0, outW, outH), outW, outH);
  };

  if (errorUrl === imageUrl) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <p className="text-sm text-text-secondary">图片加载失败，请返回重新上传</p>
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
      </div>
    );
  }

  const ready = !!stage && !!imgDims && viewReady;
  const fitScale = stage && imgDims ? Math.min(stage.w / imgDims.w, stage.h / imgDims.h) : 1;
  const percent = Math.round((view.scale / fitScale) * 100);
  const currentCursor = dragMode === "pan" || dragMode === "panImage"
    ? "grabbing"
    : dragMode
      ? getCursor(dragMode)
      : hoverMode
        ? getCursor(hoverMode)
        : hoverPan
          ? "grab"
          : "default";

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div
        ref={containerRef}
        className="relative aspect-4/3 w-full max-w-120 overflow-hidden rounded-2xl shadow-card bg-white"
      >
        {ready ? (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full"
            style={{ cursor: currentCursor, touchAction: "none" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
          </div>
        )}
      </div>

      {ready && (
        <>
          <div
            className="flex items-center gap-1 rounded-full border border-gray-200 bg-surface p-1"
            role="group"
            aria-label="拖动模式"
          >
            {(
              [
                { key: "both", label: "一起" },
                { key: "crop", label: "裁剪框" },
                { key: "image", label: "图片" },
              ] as { key: InteractionMode; label: string }[]
            ).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setInteractionMode(opt.key)}
                aria-pressed={interactionMode === opt.key}
                className={`h-11 rounded-full px-4 text-sm font-medium transition-colors ${
                  interactionMode === opt.key
                    ? "bg-primary text-white"
                    : "text-text-secondary hover:bg-gray-100"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => zoomBy(1 / ZOOM_STEP)}
              aria-label="缩小"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-surface text-lg text-text-secondary transition-colors hover:bg-gray-100"
            >
              −
            </button>
            <span className="w-14 text-center text-sm tabular-nums text-text-secondary">
              {percent}%
            </span>
            <button
              type="button"
              onClick={() => zoomBy(ZOOM_STEP)}
              aria-label="放大"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-surface text-lg text-text-secondary transition-colors hover:bg-gray-100"
            >
              +
            </button>
            <Button variant="ghost" size="md" className="h-11" onClick={handleFit}>
              Fit
            </Button>
          </div>

          <p className="text-center text-sm text-text-secondary">
            滚轮 / 双指缩放跟随当前模式：「一起」图片和裁剪框一起移动缩放，「裁剪框」只调整裁剪框，「图片」只移动缩放图片（裁剪框固定）；裁剪框可移出图片，空白处生成白色
          </p>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={onBack}>
              Back
            </Button>
            <Button onClick={handleConfirm}>Crop &amp; Continue</Button>
          </div>
        </>
      )}
    </div>
  );
}
