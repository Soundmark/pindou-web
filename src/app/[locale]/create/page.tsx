"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ImageUploader } from "@/components/upload/ImageUploader";
import { CropPreview } from "@/components/upload/CropPreview";
import { GridConfig } from "@/components/upload/GridConfig";
import { PatternCanvas } from "@/components/pattern/PatternCanvas";
import { ColorLegend } from "@/components/pattern/ColorLegend";
import { Button } from "@/components/ui/Button";
import { useImageProcessor } from "@/hooks/useImageProcessor";
import { buildPatternZip } from "@/utils/patternZip";
import { BEAD_PALETTE } from "@/utils/beadColors";

type Step = "upload" | "crop" | "configure" | "result";

export default function CreatePage() {
  const t = useTranslations("create");
  const [step, setStep] = useState<Step>("upload");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [croppedImageDataUrl, setCroppedImageDataUrl] = useState<string>("");
  const [gridWidth, setGridWidth] = useState(32);
  const [gridHeight, setGridHeight] = useState(32);

  const [highlightedColor, setHighlightedColor] = useState<number | null>(null);

  const { pixels, colorCount, isProcessing, processImage, getColorById, reset } =
    useImageProcessor();

  const handleImage = (_file: File, url: string) => {
    setImageUrl(url);
    setStep("crop");
  };

  const handleCrop = (_imageData: ImageData, w: number, h: number) => {
    // Convert ImageData to a data URL so we can use the cropped image later
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.putImageData(_imageData, 0, 0);
    const dataUrl = canvas.toDataURL("image/png");
    setCroppedImageDataUrl(dataUrl);
    setGridWidth(Math.min(32, w));
    setGridHeight(Math.min(32, h));
    setStep("configure");
  };

  const handleGenerate = async (width: number, height: number) => {
    setGridWidth(width);
    setGridHeight(height);
    setStep("result");

    // Load the image and process — use cropped data if available, otherwise original
    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      await processImage(imageData, width, height);
    };
    img.src = croppedImageDataUrl || imageUrl;
  };

  const handleExportZip = async () => {
    if (pixels.length === 0) return;
    const cells = [];
    for (let y = 0; y < pixels.length; y++) {
      for (let x = 0; x < pixels[y].length; x++) {
        const color = BEAD_PALETTE[pixels[y][x]];
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

  const handleExportPng = () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const cellSize = 20;
    const h = pixels.length;
    const w = pixels[0].length;
    canvas.width = w * cellSize;
    canvas.height = h * cellSize;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        ctx.fillStyle = getColorById(pixels[y][x]);
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
    const link = document.createElement("a");
    link.download = `pattern-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const handleReset = () => {
    reset();
    setStep("upload");
    setImageUrl("");
    setCroppedImageDataUrl("");
    setHighlightedColor(null);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-8 text-center text-2xl font-bold text-text-primary">
        {t("title")}
      </h1>

      {/* Step Indicator */}
      <div className="mb-8 flex items-center justify-center gap-2 whitespace-nowrap">
        {(["upload", "crop", "configure", "result"] as const).map((s, i) => (
          <div key={s} className="flex shrink-0 items-center gap-2">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-full border-[3px] font-heading text-sm font-semibold ${
                step === s
                  ? "border-primary-light bg-primary text-primary-ink shadow-button"
                  : ["upload", "crop", "configure"].indexOf(step) >= i
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
            {i < 3 && <div className="h-[3px] w-8 rounded-full bg-clay-border sm:w-10" />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      {step === "upload" && <ImageUploader onImage={handleImage} />}

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
          onBack={() => setStep("crop")}
          initialWidth={gridWidth}
          initialHeight={gridHeight}
        />
      )}

      {step === "result" && (
        <div className="flex flex-col items-center gap-6">
          {isProcessing ? (
            <div className="flex flex-col items-center gap-4 py-16">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
              <p className="text-text-secondary">{t("generating")}</p>
            </div>
          ) : pixels.length > 0 ? (
            <>
              <div className="w-full overflow-auto rounded-2xl">
                <PatternCanvas
                  pixels={pixels}
                  cellSize={16}
                  highlightedColorId={highlightedColor}
                  showLabels={true}
                />
              </div>
              <ColorLegend
                pixels={pixels}
                highlightedColorId={highlightedColor}
                onHighlightColor={setHighlightedColor}
              />
              <div className="flex flex-wrap items-center justify-center gap-4">
                <div className="rounded-full border-[3px] border-primary-light bg-primary/15 px-5 py-2.5 text-sm font-semibold text-primary-strong">
                  {t("beadCount", {
                    width: gridWidth,
                    height: gridHeight,
                    total: gridWidth * gridHeight,
                  })}
                </div>
                <div className="rounded-full border-[3px] border-green-candy bg-green-candy/25 px-5 py-2.5 text-sm font-semibold text-gray-700">
                  {t("colorCount", { count: colorCount })}
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <Button variant="secondary" onClick={handleExportPng}>
                  {t("exportPng")}
                </Button>
                <Button variant="secondary" onClick={handleExportZip}>
                  {t("exportZip")}
                </Button>
                <Button variant="ghost" onClick={handleReset}>
                  {t("startOver")}
                </Button>
              </div>
            </>
          ) : (
            <p className="text-text-secondary">{t("noData")}</p>
          )}
        </div>
      )}
    </div>
  );
}