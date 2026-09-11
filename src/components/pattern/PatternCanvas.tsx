"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { CollapseIcon, ExpandIcon } from "@/components/editor/icons";
import { BEAD_PALETTE } from "@/utils/beadColors";
import { CANVAS_THEME } from "@/utils/canvasTheme";
import { clamp, fitViewFor, getStagePoint, zoomAt, type View } from "@/utils/canvasView";

interface PatternCanvasProps {
  pixels: number[][];
  highlightedColorId?: number | null;
  /** 全屏覆盖层形态：画布区撑满剩余高度（替代 aspect-4/3 卡片） */
  fullscreen?: boolean;
  /** 传入后在缩放按钮行末尾显示全屏切换钮 */
  onToggleFullscreen?: () => void;
}

const MAX_ZOOM = 40; // px per cell
const ZOOM_STEP = 1.25;
const GRID_LINE_MIN_PX = 4; // 跳过细网格线的最小格子屏幕尺寸
const GRID_LINE_BOLD_MIN_PX = 3; // 每5格粗线的最小格子屏幕尺寸（比细线略低，3px 仍可辨）

/**
 * 已发布图纸的只读查看器：滚轮缩放、拖动平移、双指捏合，
 * 视口数学与编辑器共用 canvasView.ts。
 */
export function PatternCanvas({
  pixels,
  highlightedColorId = null,
  fullscreen = false,
  onToggleFullscreen,
}: PatternCanvasProps) {
  const t = useTranslations("editor");
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const panRef = useRef<{ x: number; y: number; view: View } | null>(null);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const gestureRef = useRef<{ prevDist: number; prevMid: { x: number; y: number } } | null>(null);
  const rafRef = useRef<number | null>(null);

  const gridWidth = pixels[0]?.length ?? 0;
  const gridHeight = pixels.length;

  const [stage, setStage] = useState<{ w: number; h: number } | null>(null);
  const [view, setView] = useState<View>({ scale: 1, offsetX: 0, offsetY: 0 });
  const [hasUserZoomed, setHasUserZoomed] = useState(false);
  const [initKey, setInitKey] = useState<string | null>(null);

  const fitScale = useMemo(
    () =>
      stage && gridWidth > 0 && gridHeight > 0
        ? Math.min(stage.w / gridWidth, stage.h / gridHeight)
        : 1,
    [stage, gridWidth, gridHeight]
  );
  const minScale = stage ? fitScale * 0.5 : 0.5;
  const percent = Math.round((view.scale / fitScale) * 100);

  // stage 与网格就绪且用户尚未缩放时，渲染期对齐视图（首帧不闪）
  if (stage && !hasUserZoomed && gridWidth > 0 && gridHeight > 0) {
    const key = `${stage.w}x${stage.h}/${gridWidth}x${gridHeight}`;
    if (initKey !== key) {
      setInitKey(key);
      setView(fitViewFor(stage, gridWidth, gridHeight));
    }
  }
  const viewReady = initKey !== null;

  // 测量舞台尺寸
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

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !stage) return;
    const dpr = window.devicePixelRatio || 1;
    const W = stage.w;
    const H = stage.h;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    const cs = view.scale; // 每格屏幕像素
    const gx = view.offsetX;
    const gy = view.offsetY;
    const isHighlighting = highlightedColorId !== null;

    // 视口裁剪：只遍历与舞台相交的格子
    const x0 = Math.max(0, Math.floor((0 - gx) / cs));
    const x1 = Math.min(gridWidth - 1, Math.ceil((W - gx) / cs));
    const y0 = Math.max(0, Math.floor((0 - gy) / cs));
    const y1 = Math.min(gridHeight - 1, Math.ceil((H - gy) / cs));

    const checker = Math.max(3, Math.floor(cs / 4));
    for (let y = y0; y <= y1; y++) {
      const row = pixels[y];
      if (!row) continue;
      for (let x = x0; x <= x1; x++) {
        const id = row[x];
        const px = gx + x * cs;
        const py = gy + y * cs;
        if (id < 0) {
          // 空格子（不贴珠）：迷你棋盘格，与白色珠子区分
          if (cs >= GRID_LINE_MIN_PX) {
            ctx.fillStyle = CANVAS_THEME.checkerDark;
            ctx.fillRect(px, py, checker, checker);
            ctx.fillRect(px + checker, py + checker, checker, checker);
          }
          continue;
        }
        if (isHighlighting) ctx.globalAlpha = id === highlightedColorId ? 1 : 0.25;
        ctx.fillStyle = BEAD_PALETTE[id]?.hex ?? "#ffffff";
        ctx.fillRect(px, py, cs, cs);
        ctx.globalAlpha = 1;
        if (isHighlighting && id === highlightedColorId) {
          ctx.strokeStyle = CANVAS_THEME.highlight;
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 1, py + 1, cs - 2, cs - 2);
        }
      }
    }

    // 细网格线
    if (cs >= GRID_LINE_MIN_PX) {
      ctx.strokeStyle = CANVAS_THEME.gridLine;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let x = x0; x <= x1 + 1; x++) {
        const px = Math.round(gx + x * cs) + 0.5;
        ctx.moveTo(px, Math.max(0, gy));
        ctx.lineTo(px, Math.min(H, gy + gridHeight * cs));
      }
      for (let y = y0; y <= y1 + 1; y++) {
        const py = Math.round(gy + y * cs) + 0.5;
        ctx.moveTo(Math.max(0, gx), py);
        ctx.lineTo(Math.min(W, gx + gridWidth * cs), py);
      }
      ctx.stroke();
    }

    // 每 5 格粗网格线，对应实体拼豆板的定位筋
    if (cs >= GRID_LINE_BOLD_MIN_PX) {
      ctx.strokeStyle = CANVAS_THEME.gridLineStrong;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = x0 - (x0 % 5); x <= x1 + 1; x += 5) {
        const px = Math.round(gx + x * cs) + 0.5;
        ctx.moveTo(px, Math.max(0, gy));
        ctx.lineTo(px, Math.min(H, gy + gridHeight * cs));
      }
      for (let y = y0 - (y0 % 5); y <= y1 + 1; y += 5) {
        const py = Math.round(gy + y * cs) + 0.5;
        ctx.moveTo(Math.max(0, gx), py);
        ctx.lineTo(Math.min(W, gx + gridWidth * cs), py);
      }
      ctx.stroke();
    }
  }, [stage, view, gridWidth, gridHeight, pixels, highlightedColorId]);

  const scheduleDraw = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      draw();
    });
  }, [draw]);

  // 任何视觉状态变化都经 rAF 合并重绘
  useEffect(() => {
    scheduleDraw();
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [scheduleDraw]);

  const applyZoomAt = useCallback(
    (factor: number, anchor: { x: number; y: number }) => {
      if (!stage) return;
      setHasUserZoomed(true);
      setView((v) => {
        const target = clamp(v.scale * factor, minScale, MAX_ZOOM);
        if (target === v.scale) return v;
        return zoomAt(anchor, v, target);
      });
    },
    [stage, minScale]
  );

  const zoomBy = useCallback(
    (factor: number) => {
      if (!stage) return;
      applyZoomAt(factor, { x: stage.w / 2, y: stage.h / 2 });
    },
    [stage, applyZoomAt]
  );

  const handleFit = useCallback(() => {
    setHasUserZoomed(false);
    setInitKey(null);
  }, []);

  // 进入/退出全屏都重新适应窗口（新容器尺寸下居中）
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 对 fullscreen prop 变化的命令式视图重置，渲染期替代会引入 set-state-in-render
    handleFit();
  }, [fullscreen, handleFit]);

  // 滚轮缩放。React 绑定的 wheel 是 passive，需原生绑定以 allow preventDefault；
  // ctrl+wheel 保留浏览器页面缩放。
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !stage || !viewReady) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;
      e.preventDefault();
      const p = getStagePoint(canvas, e.clientX, e.clientY);
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      applyZoomAt(Math.exp(-delta * 0.0015), p);
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [stage, viewReady, applyZoomAt]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !stage || !viewReady) return;
    if (e.pointerType === "mouse") e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    const p = getStagePoint(canvas, e.clientX, e.clientY);
    pointersRef.current.set(e.pointerId, p);

    // 第二根手指落下 → 进入手势模式
    if (pointersRef.current.size === 2) {
      panRef.current = null;
      const [a, b] = Array.from(pointersRef.current.values());
      gestureRef.current = {
        prevDist: Math.hypot(a.x - b.x, a.y - b.y),
        prevMid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      };
      return;
    }
    if (pointersRef.current.size > 2) return;

    // 查看器只读：单指/鼠标拖动即平移
    panRef.current = { x: p.x, y: p.y, view: { ...view } };
    setHasUserZoomed(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !stage) return;
    if (!pointersRef.current.has(e.pointerId)) return;
    const p = getStagePoint(canvas, e.clientX, e.clientY);
    pointersRef.current.set(e.pointerId, p);

    // 双指手势：锚点缩放 + 中点平移
    if (gestureRef.current && pointersRef.current.size >= 2) {
      const [a, b] = Array.from(pointersRef.current.values());
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const g = gestureRef.current;
      setHasUserZoomed(true);
      setView((v) => {
        let next = v;
        if (g.prevDist > 0 && dist > 0) {
          const target = clamp((v.scale * dist) / g.prevDist, minScale, MAX_ZOOM);
          if (target !== v.scale) next = zoomAt(mid, v, target);
        }
        return {
          scale: next.scale,
          offsetX: next.offsetX + (mid.x - g.prevMid.x),
          offsetY: next.offsetY + (mid.y - g.prevMid.y),
        };
      });
      g.prevDist = dist;
      g.prevMid = mid;
      return;
    }

    if (panRef.current) {
      const start = panRef.current;
      setHasUserZoomed(true);
      setView({
        scale: start.view.scale,
        offsetX: start.view.offsetX + (p.x - start.x),
        offsetY: start.view.offsetY + (p.y - start.y),
      });
    }
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size === 0) {
      panRef.current = null;
      gestureRef.current = null;
      return;
    }
    // 双指松开一根 → 余指转平移
    if (pointersRef.current.size === 1 && gestureRef.current) {
      gestureRef.current = null;
      const [only] = Array.from(pointersRef.current.values());
      panRef.current = { x: only.x, y: only.y, view: { ...view } };
    }
  };

  if (gridWidth === 0 || gridHeight === 0) return null;

  return (
    <div
      className={
        fullscreen
          ? "flex w-full min-h-0 flex-1 flex-col items-center gap-4 overflow-y-auto px-4"
          : "flex w-full flex-col items-center gap-4"
      }
    >
      <div
        ref={containerRef}
        className={
          fullscreen
            ? "relative w-full flex-1 min-h-48 overflow-hidden rounded-3xl border-[3px] border-clay-border bg-surface shadow-card"
            : "relative aspect-4/3 w-full max-w-120 overflow-hidden rounded-3xl border-[3px] border-clay-border bg-surface shadow-card"
        }
      >
        {viewReady ? (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full"
            style={{ cursor: "grab", touchAction: "none" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onContextMenu={(e) => e.preventDefault()}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner className="h-8 w-8" />
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => zoomBy(1 / ZOOM_STEP)}
          aria-label={t("zoomOut")}
          className="flex h-11 w-11 clay-press items-center justify-center rounded-full border-[3px] border-clay-border bg-surface text-lg text-text-secondary shadow-button-secondary active:shadow-button-secondary-pressed"
        >
          −
        </button>
        <span className="w-14 text-center text-sm tabular-nums text-text-secondary">{percent}%</span>
        <button
          type="button"
          onClick={() => zoomBy(ZOOM_STEP)}
          aria-label={t("zoomIn")}
          className="flex h-11 w-11 clay-press items-center justify-center rounded-full border-[3px] border-clay-border bg-surface text-lg text-text-secondary shadow-button-secondary active:shadow-button-secondary-pressed"
        >
          +
        </button>
        <Button variant="ghost" size="md" className="h-11" onClick={handleFit}>
          {t("fit")}
        </Button>
        {onToggleFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            aria-label={fullscreen ? t("fullscreenExit") : t("fullscreen")}
            title={fullscreen ? t("fullscreenExit") : t("fullscreen")}
            className="flex h-11 w-11 clay-press shrink-0 items-center justify-center rounded-full border-[3px] border-clay-border bg-surface text-text-secondary shadow-button-secondary active:shadow-button-secondary-pressed"
          >
            {fullscreen ? <CollapseIcon className="h-5 w-5" /> : <ExpandIcon className="h-5 w-5" />}
          </button>
        )}
      </div>
    </div>
  );
}
