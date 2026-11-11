"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "@/providers/AuthProvider";
import { useRouter } from "@/i18n/navigation";
import { ImageUploader } from "@/components/upload/ImageUploader";
import { CropPreview } from "@/components/upload/CropPreview";
import { GridConfig } from "@/components/upload/GridConfig";
import { PatternEditor } from "@/components/editor/PatternEditor";
import { ModeSelector, type CreateMode } from "@/components/create/ModeSelector";
import { ColorLegend } from "@/components/pattern/ColorLegend";
import { PublishForm, type PublishPayload } from "@/components/upload/PublishForm";
import { Button } from "@/components/ui/Button";
import { useCreateDiagram, useDiagram, useSaveMyDiagram } from "@/services/diagramService";
import {
  buildPatternZip,
  cellsToPixels,
  loadPatternFromZip,
  pixelsToCells,
} from "@/utils/patternZip";
import { fetchPatternZip } from "@/utils/patternFetch";
import { createPatternThumbnailBlob, downloadPatternPng } from "@/utils/imageExport";
import { uploadToOss } from "@/lib/oss-upload";
import { ApiError } from "@/lib/api-client";
import { convertImageToGrid, loadImageData } from "@/utils/imageToGrid";
import { countBeads, countColors, createEmptyGrid } from "@/utils/pixelGrid";
import { useFullscreenMode } from "@/hooks/useFullscreenMode";
import { CollapseIcon } from "@/components/editor/icons";

type Step = "mode" | "upload" | "crop" | "configure" | "editor";
type UnderlayStartMode = "empty" | "converted";

const DRAFT_KEY = "pindou:create-draft";

interface DraftPayload {
  pixels: number[][];
  gridWidth: number;
  gridHeight: number;
}

const MODE_STEPS: Record<CreateMode, Step[]> = {
  convert: ["mode", "upload", "crop", "configure", "editor"],
  underlay: ["mode", "upload", "crop", "configure", "editor"],
  blank: ["mode", "configure", "editor"],
};

export default function CreatePage() {
  const t = useTranslations("create");
  const tEditor = useTranslations("editor");
  const [step, setStep] = useState<Step>("mode");
  const [mode, setMode] = useState<CreateMode | null>(null);
  const [underlayStartMode, setUnderlayStartMode] = useState<UnderlayStartMode>("empty");
  const [imageUrl, setImageUrl] = useState("");
  const [croppedImageDataUrl, setCroppedImageDataUrl] = useState("");
  const [gridWidth, setGridWidth] = useState(32);
  const [gridHeight, setGridHeight] = useState(32);

  const [pixels, setPixels] = useState<number[][]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [highlightedColor, setHighlightedColor] = useState<number | null>(null);

  const [publishOpen, setPublishOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);

  const { status } = useSession();
  const router = useRouter();
  const createDiagram = useCreateDiagram();
  const saveMyDiagram = useSaveMyDiagram();

  // `/create?load=<id>`：把已有图纸（ZIP）载入编辑器继续编辑
  const [loadId, setLoadId] = useState("");
  const { data: loadedDiagram } = useDiagram(loadId);
  const loadApplied = useRef(false);

  useEffect(() => {
    if (!loadId || !loadedDiagram?.data || loadApplied.current) return;
    loadApplied.current = true;
    const diagram = loadedDiagram.data;
    void (async () => {
      if (!diagram.zipUrl) return;
      try {
        const buffer = await fetchPatternZip(diagram.fileID, diagram.zipUrl);
        const pattern = await loadPatternFromZip(buffer);
        setGridWidth(pattern.width);
        setGridHeight(pattern.height);
        setPixels(cellsToPixels(pattern.cells, pattern.width, pattern.height));
        setMode("blank");
        setStep("editor");
      } catch {
        // 解析失败保持当前状态，用户可重新上传
      }
    })();
  }, [loadId, loadedDiagram]);

  // 一次性初始化：?load= 优先；否则恢复登录跳转前暂存的图案。
  // 放进微任务里，避免在 effect 同步阶段连续 setState 触发级联渲染。
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("load");
    queueMicrotask(() => {
      if (id) {
        setLoadId(id);
        return;
      }
      try {
        const raw = window.sessionStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        window.sessionStorage.removeItem(DRAFT_KEY);
        const draft = JSON.parse(raw) as DraftPayload;
        if (!Array.isArray(draft?.pixels) || draft.pixels.length === 0) return;
        setPixels(draft.pixels);
        setGridWidth(draft.gridWidth);
        setGridHeight(draft.gridHeight);
        setMode("blank");
        setStep("editor");
      } catch {
        // 草稿损坏或存储不可用：静默忽略
      }
    });
  }, []);
  const {
    active: isFullscreen,
    toggle: toggleFullscreen,
    exit: exitFullscreen,
  } = useFullscreenMode();

  const colorCount = useMemo(() => countColors(pixels), [pixels]);
  const beadTotal = useMemo(() => countBeads(pixels), [pixels]);

  const handleSelectMode = (next: CreateMode) => {
    setMode(next);
    setStep(next === "blank" ? "configure" : "upload");
  };

  const handleImage = (_file: File, url: string) => {
    setImageUrl(url);
    setStep("crop");
  };

  const handleCrop = (imageData: ImageData, w: number, h: number) => {
    // 裁剪结果转 dataURL，后续生成与底图都用它
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.putImageData(imageData, 0, 0);
    setCroppedImageDataUrl(canvas.toDataURL("image/png"));
    setGridWidth(Math.min(32, w));
    setGridHeight(Math.min(32, h));
    setStep("configure");
  };

  const handleGenerate = (width: number, height: number) => {
    setGridWidth(width);
    setGridHeight(height);
    setPixels(createEmptyGrid(width, height));
    setStep("editor");

    const needsConvert =
      mode !== "blank" && (mode === "convert" || underlayStartMode === "converted");
    if (!needsConvert) return;
    setIsProcessing(true);
    loadImageData(croppedImageDataUrl || imageUrl)
      .then((imageData) => convertImageToGrid(imageData, width, height))
      .then((grid) => setPixels(grid))
      .catch(() => {
        // 转换失败保持空网格，编辑器仍可用
      })
      .finally(() => setIsProcessing(false));
  };

  const handlePixelsChange = useCallback((next: number[][]) => setPixels(next), []);

  const handleExportZip = async () => {
    if (pixels.length === 0 || isProcessing) return;
    const blob = await buildPatternZip(pixelsToCells(pixels), gridWidth, gridHeight, "MARD");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pattern-${Date.now()}.pindou.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPng = async () => {
    if (pixels.length === 0 || isProcessing) return;
    await downloadPatternPng(pixels);
  };

  const handleReset = () => {
    exitFullscreen(); // 防御：重置时若处于全屏先退出
    setStep("mode");
    setMode(null);
    setUnderlayStartMode("empty");
    setImageUrl("");
    setCroppedImageDataUrl("");
    setPixels([]);
    setIsProcessing(false);
    setHighlightedColor(null);
    setPublishOpen(false);
    setPublishError(null);
  };

  /** 未登录时把图案暂存到 sessionStorage，登录回来（returnTo=/create）再恢复 */
  const stashDraftAndLogin = () => {
    try {
      const payload: DraftPayload = { pixels, gridWidth, gridHeight };
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    } catch {
      // 超出配额/隐私模式：只能放弃暂存
    }
    router.push(`/login?returnTo=${encodeURIComponent("/create")}`);
  };

  const handlePublishClick = () => {
    if (status === "authenticated") {
      setPublishOpen(true);
      return;
    }
    stashDraftAndLogin();
  };

  /**
   * 上传 ZIP + 缩略图到 OSS，再调 publish / saveMy。
   * 服务端不存像素，图纸内容全在 pattern.json 里。
   */
  const uploadPattern = async () => {
    const zipBlob = await buildPatternZip(
      pixelsToCells(pixels),
      gridWidth,
      gridHeight,
      "MARD"
    );
    const thumbnailBlob = await createPatternThumbnailBlob(pixels);

    const zip = await uploadToOss(
      new File([zipBlob], "pattern.zip", { type: "application/zip" }),
      "diagrams"
    );
    const thumbnail = await uploadToOss(
      new File([thumbnailBlob], "pattern-thumbnail.png", { type: "image/png" }),
      "diagrams"
    );
    return { zip, thumbnail };
  };

  const errorText = (e: unknown, fallback: string) => {
    if (e instanceof ApiError) {
      if (e.code === "content_risky") return t("errors.contentRisky");
      if (e.code === "image_risky") return t("errors.imageRisky");
      if (e.code === "unauthorized") return t("errors.unauthorized");
      if (e.code === "network_error" || e.code === "upload_failed") return t("errors.uploadFailed");
    }
    if (e instanceof Error && e.message === "upload_failed") return t("errors.uploadFailed");
    return fallback;
  };

  const handlePublish = async (payload: PublishPayload) => {
    if (pixels.length === 0 || isProcessing) return;
    setPublishing(true);
    setPublishError(null);
    try {
      const { zip, thumbnail } = await uploadPattern();
      const res = await createDiagram.mutateAsync({
        fileID: zip.key,
        thumbnailFileID: thumbnail.key,
        title: payload.name,
        width: gridWidth,
        height: gridHeight,
        cellCount: beadTotal,
        colorCount,
        colorSystem: "MARD",
        tags: payload.tags,
      });
      setPublishOpen(false);
      router.push(`/patterns/${res.id}`);
    } catch (e) {
      setPublishError(errorText(e, t("publishFailed")));
    } finally {
      setPublishing(false);
    }
  };

  const handleSaveDraft = async (payload: PublishPayload) => {
    if (pixels.length === 0 || isProcessing) return;
    setPublishing(true);
    setPublishError(null);
    try {
      const { zip, thumbnail } = await uploadPattern();
      await saveMyDiagram.mutateAsync({
        fileID: zip.key,
        thumbnailFileID: thumbnail.key,
        title: payload.name,
        width: gridWidth,
        height: gridHeight,
        cellCount: beadTotal,
        colorCount,
        colorSystem: "MARD",
      });
      setPublishOpen(false);
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2500);
    } catch (e) {
      setPublishError(errorText(e, t("saveFailed")));
    } finally {
      setPublishing(false);
    }
  };

  const showSteps = step !== "mode" && mode !== null;
  const steps = mode ? MODE_STEPS[mode] : [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-8 text-center text-2xl font-bold text-text-primary">
        {t("title")}
      </h1>

      {/* Step Indicator（按模式派生；方式选择步不显示） */}
      {showSteps && (
        <div className="mb-8 flex items-center justify-center gap-2 whitespace-nowrap">
          {steps.map((s, i) => (
            <div key={s} className="flex shrink-0 items-center gap-2">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-full border-[3px] font-heading text-sm font-semibold ${
                  step === s
                    ? "border-primary-light bg-primary text-primary-ink shadow-button"
                    : steps.indexOf(step) > i
                    ? "border-primary-light bg-primary/25 text-primary-strong"
                    : "border-clay-border bg-surface text-gray-400"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`hidden text-sm sm:inline ${
                  step === s ? "font-semibold text-primary-strong" : "text-gray-400"
                }`}
              >
                {t(`steps.${s}`)}
              </span>
              {i < steps.length - 1 && (
                <div className="h-[3px] w-8 rounded-full bg-clay-border sm:w-10" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Step Content */}
      {step === "mode" && <ModeSelector onSelectMode={handleSelectMode} />}

      {step === "upload" && (
        <>
          <ImageUploader onImage={handleImage} />
          <div className="mt-6 flex justify-center">
            <Button variant="secondary" onClick={handleReset}>
              {t("back")}
            </Button>
          </div>
        </>
      )}

      {step === "crop" && imageUrl && (
        <CropPreview
          imageUrl={imageUrl}
          onCrop={handleCrop}
          onBack={() => setStep("upload")}
        />
      )}

      {step === "configure" && (
        <GridConfig
          onGenerate={handleGenerate}
          onBack={() => setStep(mode === "blank" ? "mode" : "crop")}
          initialWidth={gridWidth}
          initialHeight={gridHeight}
          generateLabel={mode !== "convert" ? t("editorCta") : undefined}
          startModeSlot={
            mode === "underlay" ? (
              <div>
                <p className="mb-2 block text-sm font-medium text-text-primary">
                  {t("startModeLabel")}
                </p>
                <div className="flex gap-2">
                  {(
                    [
                      { key: "empty" as const, label: t("startModeEmpty") },
                      { key: "converted" as const, label: t("startModeConverted") },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      aria-pressed={underlayStartMode === opt.key}
                      onClick={() => setUnderlayStartMode(opt.key)}
                      className={`min-h-11 flex-1 rounded-full border-[3px] px-4 text-sm font-semibold transition-colors ${
                        underlayStartMode === opt.key
                          ? "border-primary-light bg-primary text-primary-ink shadow-button"
                          : "border-clay-border bg-surface text-text-secondary shadow-button-secondary"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : undefined
          }
        />
      )}

      {step === "editor" && (
        <div
          className={
            isFullscreen
              ? "fixed inset-0 z-60 flex flex-col bg-background animate-fade-in"
              : "flex flex-col items-center gap-6"
          }
        >
          {isFullscreen && (
            <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b-[3px] border-clay-border bg-background px-4">
              <h2 className="truncate text-lg font-semibold text-text-primary">
                {t("title")}
              </h2>
              <button
                type="button"
                onClick={exitFullscreen}
                aria-label={tEditor("fullscreenExit")}
                title={tEditor("fullscreenExit")}
                className="flex h-11 w-11 clay-press shrink-0 items-center justify-center rounded-full border-[3px] border-clay-border bg-surface text-text-secondary shadow-button-secondary active:shadow-button-secondary-pressed"
              >
                <CollapseIcon className="h-5 w-5" />
              </button>
            </div>
          )}
          <PatternEditor
            pixels={pixels}
            gridWidth={gridWidth}
            gridHeight={gridHeight}
            underlayDataUrl={mode === "blank" ? null : croppedImageDataUrl || null}
            highlightedColorId={highlightedColor}
            isProcessing={isProcessing}
            onPixelsChange={handlePixelsChange}
            fullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
          />
          <ColorLegend
            pixels={pixels}
            highlightedColorId={highlightedColor}
            onHighlightColor={setHighlightedColor}
            orientation={isFullscreen ? "strip" : "wrap"}
          />
          <div className={isFullscreen ? "hidden" : "flex flex-wrap items-center justify-center gap-4"}>
            <div className="rounded-full border-[3px] border-primary-light bg-primary/15 px-5 py-2.5 text-sm font-semibold text-primary-strong">
              {t("paintedCount", { painted: beadTotal, total: gridWidth * gridHeight })}
            </div>
            <div className="rounded-full border-[3px] border-green-candy bg-green-candy/25 px-5 py-2.5 text-sm font-semibold text-gray-700">
              {t("colorCount", { count: colorCount })}
            </div>
          </div>
          <div className={isFullscreen ? "hidden" : "flex flex-wrap justify-center gap-3"}>
            <Button onClick={handlePublishClick} disabled={publishing || isProcessing}>
              {status === "authenticated" ? t("publish") : t("signInToPublish")}
            </Button>
            <Button variant="secondary" onClick={handleExportPng} disabled={isProcessing}>
              {t("exportPng")}
            </Button>
            <Button variant="secondary" onClick={handleExportZip} disabled={isProcessing}>
              {t("exportZip")}
            </Button>
            <Button variant="ghost" onClick={handleReset}>
              {t("startOver")}
            </Button>
          </div>
          {draftSaved && (
            <p
              role="status"
              className="rounded-full border-[3px] border-green-candy bg-green-candy/25 px-5 py-2 text-sm font-semibold text-gray-700"
            >
              {t("draftSaved")}
            </p>
          )}
          <PublishForm
            open={publishOpen}
            submitting={publishing}
            error={publishError}
            onClose={() => setPublishOpen(false)}
            onSubmit={handlePublish}
            onSaveDraft={status === "authenticated" ? handleSaveDraft : undefined}
          />
        </div>
      )}
    </div>
  );
}
