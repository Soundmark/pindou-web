"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { BEAD_PALETTE } from "@/utils/beadColors";
import { CANVAS_THEME, getLuminance } from "@/utils/canvasTheme";
import { clamp, fitViewFor, getStagePoint, zoomAt, type View } from "@/utils/canvasView";
import { cloneGrid, createEmptyGrid, EMPTY_CELL, floodFill } from "@/utils/pixelGrid";
import { convertImageToGrid } from "@/utils/imageToGrid";
import { EditorToolbar, type EditorTool } from "./EditorToolbar";
import { ColorPalette } from "./ColorPalette";
import { UnderlayControls } from "./UnderlayControls";

interface PatternEditorProps {
  pixels: number[][];
  gridWidth: number;
  gridHeight: number;
  underlayDataUrl: string | null;
  highlightedColorId: number | null;
  isProcessing: boolean;
  onPixelsChange: (pixels: number[][]) => void;
}

const MAX_ZOOM = 40; // px per cell
const ZOOM_STEP = 1.25;
const HISTORY_LIMIT = 50;
const RECENT_LIMIT = 8;
const GRID_LINE_MIN_PX = 4; // 跳过网格线的最小格子屏幕尺寸
const LABEL_MIN_PX = 20; // 显示色号标签的最小格子屏幕尺寸
const DEFAULT_UNDERLAY_OPACITY = 0.35;

const isPaintTool = (tool: string) => tool === "brush" || tool === "eraser" || tool === "fill";

export function PatternEditor({
  pixels,
  gridWidth,
  gridHeight,
  underlayDataUrl,
  highlightedColorId,
  isProcessing,
  onPixelsChange,
}: PatternEditorProps) {
  const t = useTranslations("editor");
  const tCreate = useTranslations("create");
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const underlayImgRef = useRef<HTMLImageElement | null>(null);

  const [stage, setStage] = useState<{ w: number; h: number } | null>(null);
  const [view, setView] = useState<View>({ scale: 1, offsetX: 0, offsetY: 0 });
  const [hasUserZoomed, setHasUserZoomed] = useState(false);
  const [initKey, setInitKey] = useState<string | null>(null);

  const [tool, setTool] = useState<EditorTool>("brush");
  const [brushColorId, setBrushColorId] = useState(() =>
    Math.max(0, BEAD_PALETTE.findIndex((c) => c.id === "H02"))
  );
  const [recentColorIds, setRecentColorIds] = useState<number[]>([]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [underlayVisible, setUnderlayVisible] = useState(true);
  const [underlayOpacity, setUnderlayOpacity] = useState(DEFAULT_UNDERLAY_OPACITY);
  const [autoFillPending, setAutoFillPending] = useState(false);
  const [spaceDown, setSpaceDown] = useState(false);
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null);

  // 网格工作副本 + 历史（ref 持有，historyVersion 只为驱动 canUndo/canRedo 重渲染）
  const workingRef = useRef<number[][]>(pixels);
  const lastEmittedRef = useRef<number[][] | null>(null);
  const pastRef = useRef<number[][][]>([]);
  const futureRef = useRef<number[][][]>([]);
  const [, bumpHistory] = useReducer((x: number) => x + 1, 0);
  const strokeSnapshotRef = useRef<number[][] | null>(null);
  const lastCellRef = useRef<{ x: number; y: number } | null>(null);
  const panRef = useRef<{ x: number; y: number; view: View } | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const gestureRef = useRef<{ prevDist: number; prevMid: { x: number; y: number } } | null>(null);
  const suppressPaintRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  // fit 缩放基准（相对百分比显示用）
  const fitScale = useMemo(
    () => (stage ? Math.min(stage.w / gridWidth, stage.h / gridHeight) : 1),
    [stage, gridWidth, gridHeight]
  );
  const minScale = useMemo(
    () => (stage ? fitScale * 0.5 : 0.5),
    [stage, fitScale]
  );

  // stage 与网格都就绪且用户尚未缩放时，渲染期对齐视图（首帧不闪）
  if (stage && !hasUserZoomed) {
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
    const hasUnderlay = !!underlayDataUrl && underlayVisible && !!underlayImgRef.current;

    // 底图（垫在网格下方）
    const img = underlayImgRef.current;
    if (hasUnderlay && img) {
      ctx.globalAlpha = underlayOpacity;
      ctx.imageSmoothingEnabled = cs * dpr <= 1;
      ctx.drawImage(img, gx, gy, gridWidth * cs, gridHeight * cs);
      ctx.globalAlpha = 1;
      ctx.imageSmoothingEnabled = true;
    }

    const working = workingRef.current;
    const isHighlighting = highlightedColorId !== null;
    // 视口裁剪：只遍历与舞台相交的格子
    const x0 = Math.max(0, Math.floor((0 - gx) / cs));
    const x1 = Math.min(gridWidth - 1, Math.ceil((W - gx) / cs));
    const y0 = Math.max(0, Math.floor((0 - gy) / cs));
    const y1 = Math.min(gridHeight - 1, Math.ceil((H - gy) / cs));

    const checker = Math.max(3, Math.floor(cs / 4));
    for (let y = y0; y <= y1; y++) {
      const row = working[y];
      if (!row) continue;
      for (let x = x0; x <= x1; x++) {
        const id = row[x];
        const px = gx + x * cs;
        const py = gy + y * cs;
        if (id < 0) {
          // 空格子：无底图时画迷你棋盘格，有底图时保持透明透出图片
          if (!hasUnderlay && cs >= GRID_LINE_MIN_PX) {
            ctx.fillStyle = CANVAS_THEME.checkerDark;
            ctx.fillRect(px, py, checker, checker);
            ctx.fillRect(px + checker, py + checker, checker, checker);
          }
          continue;
        }
        const color = BEAD_PALETTE[id];
        if (isHighlighting) ctx.globalAlpha = id === highlightedColorId ? 1 : 0.25;
        ctx.fillStyle = color?.hex ?? "#ffffff";
        ctx.fillRect(px, py, cs, cs);
        ctx.globalAlpha = 1;
        if (isHighlighting && id === highlightedColorId) {
          ctx.strokeStyle = CANVAS_THEME.highlight;
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 1, py + 1, cs - 2, cs - 2);
        }
        if (cs >= LABEL_MIN_PX && color) {
          ctx.fillStyle = getLuminance(color.hex) > 0.5 ? CANVAS_THEME.labelDark : CANVAS_THEME.labelLight;
          ctx.font = `${Math.max(8, cs * 0.4)}px monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(color.id, px + cs / 2, py + cs / 2);
        }
      }
    }

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

    if (hoverCell && isPaintTool(tool) && !spaceDown) {
      ctx.strokeStyle = CANVAS_THEME.highlight;
      ctx.lineWidth = 2;
      ctx.strokeRect(gx + hoverCell.x * cs + 1, gy + hoverCell.y * cs + 1, cs - 2, cs - 2);
    }
  }, [stage, view, gridWidth, gridHeight, underlayDataUrl, underlayVisible, underlayOpacity, highlightedColorId, hoverCell, tool, spaceDown]);

  const scheduleDraw = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      draw();
    });
  }, [draw]);

  // 每次底图 URL 变化解码并缓存 Image（解码完成后重绘）
  useEffect(() => {
    underlayImgRef.current = null;
    if (!underlayDataUrl) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      underlayImgRef.current = img;
      scheduleDraw();
    };
    img.src = underlayDataUrl;
    return () => {
      cancelled = true;
    };
  }, [underlayDataUrl, scheduleDraw]);

  // 任何视觉状态变化都经 rAF 合并重绘
  useEffect(() => {
    scheduleDraw();
  }, [scheduleDraw]);

  // 外部 pixels 变化（自动转换落定等）→ 采纳为工作副本并记入历史
  useEffect(() => {
    if (pixels === workingRef.current || pixels === lastEmittedRef.current) return;
    pastRef.current.push(cloneGrid(workingRef.current));
    if (pastRef.current.length > HISTORY_LIMIT) pastRef.current.shift();
    futureRef.current = [];
    workingRef.current = pixels;
    bumpHistory();
    scheduleDraw();
  }, [pixels, scheduleDraw]);

  const addRecent = useCallback((id: number) => {
    if (id < 0) return;
    setRecentColorIds((prev) => [id, ...prev.filter((c) => c !== id)].slice(0, RECENT_LIMIT));
  }, []);

  const cellFromPoint = useCallback(
    (sx: number, sy: number) => ({
      x: Math.floor((sx - view.offsetX) / view.scale),
      y: Math.floor((sy - view.offsetY) / view.scale),
    }),
    [view]
  );

  const inBounds = useCallback(
    (cell: { x: number; y: number }) =>
      cell.x >= 0 && cell.y >= 0 && cell.x < gridWidth && cell.y < gridHeight,
    [gridWidth, gridHeight]
  );

  const paintCell = useCallback(
    (x: number, y: number, value: number) => {
      if (x < 0 || y < 0 || x >= gridWidth || y >= gridHeight) return;
      const row = workingRef.current[y];
      if (!row || row[x] === value) return;
      row[x] = value;
      scheduleDraw();
    },
    [gridWidth, gridHeight, scheduleDraw]
  );

  const paintLine = useCallback(
    (from: { x: number; y: number }, to: { x: number; y: number }, value: number) => {
      let x0 = from.x;
      let y0 = from.y;
      const x1 = to.x;
      const y1 = to.y;
      const dx = Math.abs(x1 - x0);
      const dy = -Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1;
      const sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (;;) {
        paintCell(x0, y0, value);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) {
          err += dy;
          x0 += sx;
        }
        if (e2 <= dx) {
          err += dx;
          y0 += sy;
        }
      }
    },
    [paintCell]
  );

  // 把快照压入历史（新快照清空 redo）
  const pushHistory = useCallback((snapshot: number[][]) => {
    pastRef.current.push(snapshot);
    if (pastRef.current.length > HISTORY_LIMIT) pastRef.current.shift();
    futureRef.current = [];
    bumpHistory();
  }, []);

  const emitPixels = useCallback(
    (grid: number[][]) => {
      const emitted = cloneGrid(grid);
      lastEmittedRef.current = emitted;
      onPixelsChange(emitted);
    },
    [onPixelsChange]
  );

  const commitStroke = useCallback(() => {
    const snapshot = strokeSnapshotRef.current;
    if (!snapshot) return;
    strokeSnapshotRef.current = null;
    lastCellRef.current = null;
    pushHistory(snapshot);
    emitPixels(workingRef.current);
    if (tool === "brush") addRecent(brushColorId);
  }, [pushHistory, emitPixels, tool, brushColorId, addRecent]);

  const pickAt = useCallback(
    (cell: { x: number; y: number }) => {
      if (!inBounds(cell)) return;
      const id = workingRef.current[cell.y]?.[cell.x];
      if (id === undefined || id < 0) return;
      setBrushColorId(id);
      addRecent(id);
    },
    [inBounds, addRecent]
  );

  const doUndo = useCallback(() => {
    const prev = pastRef.current.pop();
    if (!prev) return;
    futureRef.current.push(cloneGrid(workingRef.current));
    if (futureRef.current.length > HISTORY_LIMIT) futureRef.current.shift();
    workingRef.current = prev;
    bumpHistory();
    emitPixels(prev);
    scheduleDraw();
  }, [emitPixels, scheduleDraw]);

  const doRedo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current.push(cloneGrid(workingRef.current));
    if (pastRef.current.length > HISTORY_LIMIT) pastRef.current.shift();
    workingRef.current = next;
    bumpHistory();
    emitPixels(next);
    scheduleDraw();
  }, [emitPixels, scheduleDraw]);

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

    // 第二根手指落下 → 进入手势模式；取消进行中的笔画（回滚，不入历史）
    if (pointersRef.current.size === 2) {
      if (strokeSnapshotRef.current) {
        workingRef.current = strokeSnapshotRef.current;
        strokeSnapshotRef.current = null;
        lastCellRef.current = null;
        scheduleDraw();
      }
      panRef.current = null;
      const [a, b] = Array.from(pointersRef.current.values());
      gestureRef.current = {
        prevDist: Math.hypot(a.x - b.x, a.y - b.y),
        prevMid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      };
      return;
    }
    if (pointersRef.current.size > 2) return;

    // 单指/鼠标
    const wantPan =
      tool === "pan" || spaceDown || e.button === 1 || suppressPaintRef.current;
    if (wantPan) {
      panRef.current = { x: p.x, y: p.y, view: { ...view } };
      setHasUserZoomed(true);
      return;
    }
    if (e.pointerType === "mouse" && e.button !== 0) return;

    const cell = cellFromPoint(p.x, p.y);
    if (tool === "brush" || tool === "eraser") {
      const value = tool === "eraser" ? EMPTY_CELL : brushColorId;
      strokeSnapshotRef.current = cloneGrid(workingRef.current);
      lastCellRef.current = cell;
      paintCell(cell.x, cell.y, value);
      setHoverCell(inBounds(cell) ? cell : null);
    } else if (tool === "fill") {
      if (!inBounds(cell)) return;
      const next = floodFill(workingRef.current, cell.x, cell.y, brushColorId);
      if (next === workingRef.current) return;
      pushHistory(cloneGrid(workingRef.current));
      workingRef.current = next;
      emitPixels(next);
      addRecent(brushColorId);
      scheduleDraw();
    } else if (tool === "eyedropper") {
      pickAt(cell);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !stage) return;
    const p = getStagePoint(canvas, e.clientX, e.clientY);

    // 悬停预览（仅鼠标且无按下的指针）
    if (pointersRef.current.size === 0 && e.pointerType === "mouse") {
      const cell = cellFromPoint(p.x, p.y);
      const next = inBounds(cell) ? cell : null;
      setHoverCell((prev) =>
        prev?.x === next?.x && prev?.y === next?.y ? prev : next
      );
      return;
    }
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, p);

    // 双指手势：锚点缩放 + 中点平移，绝不涂色
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
      return;
    }

    if (strokeSnapshotRef.current) {
      const value = tool === "eraser" ? EMPTY_CELL : brushColorId;
      const cell = cellFromPoint(p.x, p.y);
      const last = lastCellRef.current;
      if (last && (last.x !== cell.x || last.y !== cell.y)) {
        paintLine(last, cell, value);
      } else {
        paintCell(cell.x, cell.y, value);
      }
      lastCellRef.current = cell;
      setHoverCell(inBounds(cell) ? cell : null);
      return;
    }

    if (tool === "eyedropper") {
      pickAt(cellFromPoint(p.x, p.y));
    }
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size === 0) {
      // 笔画提交 + 全部抬起后恢复可涂
      commitStroke();
      panRef.current = null;
      gestureRef.current = null;
      suppressPaintRef.current = false;
      return;
    }
    // 双指松开一根 → 余指只平移，全部抬起前禁止涂色（防捏合后误点）
    if (pointersRef.current.size === 1 && gestureRef.current) {
      gestureRef.current = null;
      suppressPaintRef.current = true;
      if (strokeSnapshotRef.current) {
        workingRef.current = strokeSnapshotRef.current;
        strokeSnapshotRef.current = null;
        lastCellRef.current = null;
        scheduleDraw();
      }
      const [only] = Array.from(pointersRef.current.values());
      panRef.current = { x: only.x, y: only.y, view: { ...view } };
    }
  };

  const handleClearAll = useCallback(() => {
    setClearOpen(false);
    pushHistory(cloneGrid(workingRef.current));
    const next = createEmptyGrid(gridWidth, gridHeight);
    workingRef.current = next;
    emitPixels(next);
    scheduleDraw();
  }, [gridWidth, gridHeight, pushHistory, emitPixels, scheduleDraw]);

  const handleAutoFill = useCallback(async () => {
    const img = underlayImgRef.current;
    if (!img || autoFillPending || isProcessing) return;
    setAutoFillPending(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const next = await convertImageToGrid(imageData, gridWidth, gridHeight);
      pushHistory(cloneGrid(workingRef.current));
      workingRef.current = next;
      emitPixels(next);
      scheduleDraw();
    } catch {
      // 转换失败保持当前网格不变
    } finally {
      setAutoFillPending(false);
    }
  }, [autoFillPending, isProcessing, gridWidth, gridHeight, pushHistory, emitPixels, scheduleDraw]);

  // 键盘：撤销/重做快捷键 + 空格临时平移
  useEffect(() => {
    const isTypingTarget = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      return (
        el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA" ||
        el.tagName === "SELECT" ||
        el.isContentEditable
      );
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.code === "Space") {
        // 让聚焦的按钮保留空格激活行为
        if ((e.target as HTMLElement)?.tagName === "BUTTON") return;
        e.preventDefault();
        setSpaceDown(true);
        return;
      }
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) doRedo();
        else doUndo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        doRedo();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceDown(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [doUndo, doRedo]);

  const percent = Math.round((view.scale / fitScale) * 100);
  const hasUnderlay = !!underlayDataUrl;
  const cursor =
    spaceDown || tool === "pan"
      ? "grab"
      : tool === "eyedropper" || isPaintTool(tool)
        ? "crosshair"
        : "default";

  const tc = useTranslations("common");

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <EditorToolbar
        tool={tool}
        onToolChange={setTool}
        brushColorId={brushColorId}
        recentColorIds={recentColorIds}
        onSelectColor={(id) => {
          setBrushColorId(id);
          addRecent(id);
        }}
        onOpenPalette={() => setPaletteOpen(true)}
        canUndo={pastRef.current.length > 0}
        canRedo={futureRef.current.length > 0}
        onUndo={doUndo}
        onRedo={doRedo}
        onClearAll={() => setClearOpen(true)}
        onAutoFill={handleAutoFill}
        autoFillPending={autoFillPending}
        hasUnderlay={hasUnderlay}
        autoFillDisabled={isProcessing}
      />

      <div
        ref={containerRef}
        className="relative aspect-4/3 w-full max-w-120 overflow-hidden rounded-3xl border-[3px] border-clay-border bg-surface shadow-card"
      >
        {viewReady ? (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full"
            style={{ cursor, touchAction: "none" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onContextMenu={(e) => e.preventDefault()}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
          </div>
        )}
        {isProcessing && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-surface/80 animate-fade-in">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
            <p className="text-text-secondary">{tCreate("generating")}</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
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
      </div>

      {hasUnderlay && (
        <UnderlayControls
          visible={underlayVisible}
          opacity={underlayOpacity}
          onToggleVisible={() => setUnderlayVisible((v) => !v)}
          onOpacityChange={setUnderlayOpacity}
        />
      )}

      <p className="text-center text-sm text-text-secondary">{t("help")}</p>

      <Modal
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        title={t("paletteTitle")}
        className="max-h-[75vh] overflow-y-auto"
      >
        <ColorPalette
          selectedColorId={brushColorId}
          recentColorIds={recentColorIds}
          onSelectColor={(id) => {
            setBrushColorId(id);
            addRecent(id);
          }}
        />
      </Modal>

      <Modal open={clearOpen} onClose={() => setClearOpen(false)} title={t("clearConfirmTitle")}>
        <div className="flex flex-col gap-5">
          <p className="text-sm text-text-secondary">{t("clearConfirmDesc")}</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setClearOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button variant="danger" onClick={handleClearAll}>
              {t("clearAll")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
