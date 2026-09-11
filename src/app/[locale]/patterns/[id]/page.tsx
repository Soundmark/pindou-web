"use client";

import { use, useState } from "react";
import { useTranslations } from "next-intl";
import { useDiagram } from "@/services/diagramService";
import { PatternCanvas } from "@/components/pattern/PatternCanvas";
import { ColorLegend } from "@/components/pattern/ColorLegend";
import { Button } from "@/components/ui/Button";
import { Spinner, EmptyState } from "@/components/ui/Spinner";
import { downloadPatternPng } from "@/utils/imageExport";
import { useFullscreenMode } from "@/hooks/useFullscreenMode";
import { CollapseIcon } from "@/components/editor/icons";
import { useSession } from "next-auth/react";
import { Link } from "@/i18n/navigation";

export default function PatternDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const t = useTranslations("patternDetail");
  const tEditor = useTranslations("editor");
  const { data, isLoading, error } = useDiagram(id);
  const [highlightedColor, setHighlightedColor] = useState<number | null>(null);
  const {
    active: isFullscreen,
    toggle: toggleFullscreen,
    exit: exitFullscreen,
  } = useFullscreenMode();

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState title={t("notFoundTitle")} description={t("notFoundDescription")} />
      </div>
    );
  }

  const diagram = data.data;

  // Convert pixels back to 2D array for rendering
  const pixels: number[][] = diagram.pixels || [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">{diagram.name}</h1>
        {diagram.description && (
          <p className="mt-1 text-text-secondary">{diagram.description}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-muted">
          <span>{t("by", { userName: diagram.userName })}</span>
          <span>·</span>
          <span>{diagram.width}x{diagram.height}</span>
          <span>·</span>
          <span>{t("colorCount", { count: diagram.colorCount })}</span>
          <span>·</span>
          <span>{t("viewCount", { count: diagram.viewCount })}</span>
          <span>·</span>
          <span>{t("favoriteCount", { count: diagram.favoriteCount })}</span>
        </div>
        {diagram.tags?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {diagram.tags.map((tag: string) => (
              <Link
                key={tag}
                href={`/gallery?tag=${tag}`}
                className="rounded-full border-2 border-primary/25 bg-primary/15 px-4 py-1.5 text-xs font-semibold text-primary-strong hover:bg-primary/25"
              >
                {tag}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Pattern */}
      {pixels.length > 0 ? (
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
                {diagram.name}
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
          <PatternCanvas
            pixels={pixels}
            highlightedColorId={highlightedColor}
            fullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
          />
          <ColorLegend
            pixels={pixels}
            highlightedColorId={highlightedColor}
            onHighlightColor={setHighlightedColor}
            orientation={isFullscreen ? "strip" : "wrap"}
          />
        </div>
      ) : (
        <div className="flex justify-center">
          <img
            src={diagram.imageUrl}
            alt={diagram.name}
            className="max-h-96 rounded-2xl object-contain shadow-card"
          />
        </div>
      )}

      {/* Actions */}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {session && (
          <Button
            variant="secondary"
            onClick={() => {
              fetch(`/api/diagrams/favorites/${id}`, { method: "POST" });
            }}
          >
            {t("favorite")}
          </Button>
        )}
        <Button
          variant="secondary"
          onClick={() => {
            if (pixels.length > 0) void downloadPatternPng(pixels, `${diagram.name}.png`);
          }}
        >
          {t("downloadPng")}
        </Button>
        <Link href={`/create?load=${id}`}>
          <Button variant="ghost">{t("editInCreator")}</Button>
        </Link>
      </div>
    </div>
  );
}