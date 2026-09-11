"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
import { ImageUploader } from "@/components/upload/ImageUploader";
import { CropPreview } from "@/components/upload/CropPreview";
import { GridConfig } from "@/components/upload/GridConfig";
import { PatternEditor } from "@/components/editor/PatternEditor";
import { ModeSelector, type CreateMode } from "@/components/create/ModeSelector";
import { ColorLegend } from "@/components/pattern/ColorLegend";
import { PublishForm, type PublishPayload } from "@/components/upload/PublishForm";
import { Button } from "@/components/ui/Button";
import { useCreateDiagram } from "@/services/diagramService";
import { buildPatternZip } from "@/utils/patternZip";
import { createPatternThumbnailBlob, dataUrlToBlob, downloadPatternPng, uploadImageToR2 } from "@/utils/imageExport";
import { convertImageToGrid, loadImageData } from "@/utils/imageToGrid";
import { BEAD_PALETTE } from "@/utils/beadColors";
import { countBeads, countColors, createEmptyGrid } from "@/utils/pixelGrid";
import { useFullscreenMode } from "@/hooks/useFullscreenMode";
import { CollapseIcon } from "@/components/editor/icons";

type Step = "mode" | "upload" | "crop" | "configure" | "editor";
type UnderlayStartMode = "empty" | "converted";

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

  const { status } = useSession();
  const router = useRouter();
  const createDiagram = useCreateDiagram();
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
    const cells = [];
    for (let y = 0; y < pixels.length; y++) {
      for (let x = 0; x < pixels[y].length; x++) {
        const colorId = pixels[y][x];
        if (colorId < 0) continue; // 空格子不入 ZIP
        const color = BEAD_PALETTE[colorId];
        if (color) {
          cells.push({ x, y, color });
        }
      }
    }
    const blob = await buildPatternZip(cells, gridWidth, gridHeight, "MARD");
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

  const handlePublishClick = async () => {
    if (status === "authenticated") {
      setPublishOpen(true);
      return;
    }
    // Popup login flow to preserve in-progress pattern (no full page redirect)
    const result = await signIn("google", { redirect: false });
    if (result && !result.error) {
      setPublishOpen(true);
    }
  };

  const handlePublish = async (payload: PublishPayload) => {
    if (pixels.length === 0 || isProcessing) return;
    setPublishing(true);
    setPublishError(null);
    try {
      // 空白模式没有源图：用生成的图案渲染图占位 imageUrl
      const savedImageUrl = croppedImageDataUrl
        ? await uploadImageToR2(await dataUrlToBlob(croppedImageDataUrl), "image/png", "pattern.png")
        : await uploadImageToR2(
            await createPatternThumbnailBlob(pixels, 1024),
            "image/png",
            "pattern.png"
          );
      const thumbnailBlob = await createPatternThumbnailBlob(pixels);
      const thumbnailUrl = await uploadImageToR2(thumbnailBlob, "image/png", "pattern-thumbnail.png");

      const res = await createDiagram.mutateAsync({
        name: payload.name,
        description: payload.description,
        imageUrl: savedImageUrl,
        thumbnailUrl,
        width: gridWidth,
        height: gridHeight,
        pixels,
        brand: "MARD",
        tags: payload.tags,
        colorCount,
        isPublic: payload.isPublic,
      });

      const id = res?.data?._id;
      if (!id) throw new Error("Missing diagram id");
      setPublishOpen(false);
      router.push(`/patterns/${id}`);
    } catch {
      setPublishError(t("publishFailed"));
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
          <PublishForm
            open={publishOpen}
            submitting={publishing}
            error={publishError}
            onClose={() => setPublishOpen(false)}
            onSubmit={handlePublish}
          />
        </div>
      )}
    </div>
  );
}
