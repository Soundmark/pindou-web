"use client";

import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  useCheckFavorited,
  useDeleteDiagram,
  useDiagram,
  useFavorite,
  useUnfavorite,
} from "@/services/diagramService";
import { PatternCanvas } from "@/components/pattern/PatternCanvas";
import { ColorLegend } from "@/components/pattern/ColorLegend";
import { SocialKitDialog } from "@/components/pattern/SocialKitDialog";
import { Button } from "@/components/ui/Button";
import { Spinner, EmptyState } from "@/components/ui/Spinner";
import { downloadPatternPng } from "@/utils/imageExport";
import { cellsToPixels, loadPatternFromZip } from "@/utils/patternZip";
import { fetchPatternZip } from "@/utils/patternFetch";
import { useFullscreenMode } from "@/hooks/useFullscreenMode";
import { CollapseIcon } from "@/components/editor/icons";
import { useAuth } from "@/providers/AuthProvider";
import { Link, useRouter } from "@/i18n/navigation";

type PatternLoadState = "idle" | "loading" | "ready" | "failed";

export default function PatternDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, status } = useAuth();
  const router = useRouter();
  const t = useTranslations("patternDetail");
  const tEditor = useTranslations("editor");
  const tc = useTranslations("common");
  const { data, isLoading, error } = useDiagram(id);

  const [highlightedColor, setHighlightedColor] = useState<number | null>(null);
  const [socialOpen, setSocialOpen] = useState(false);
  // 结果带 key：只有和当前 zipUrl 匹配的像素才渲染，切换图纸时旧结果自动失效
  const [pattern, setPattern] = useState<{ key: string; pixels: number[][] } | null>(null);
  const [failedKey, setFailedKey] = useState("");

  const favorited = useCheckFavorited(id).data ?? false;
  const favorite = useFavorite();
  const unfavorite = useUnfavorite();
  const deleteDiagram = useDeleteDiagram();

  const {
    active: isFullscreen,
    toggle: toggleFullscreen,
    exit: exitFullscreen,
  } = useFullscreenMode();

  const diagram = data?.data;
  const zipUrl = diagram?.zipUrl || "";
  const fileID = diagram?.fileID || "";

  const pixels = pattern && pattern.key === zipUrl ? pattern.pixels : [];
  let patternState: PatternLoadState = "loading";
  if (!zipUrl) patternState = "idle";
  else if (pixels.length > 0) patternState = "ready";
  else if (failedKey === zipUrl) patternState = "failed";

  // 后端不存像素：按 DTO 里的 ZIP 地址取回 pattern.json 再还原网格。
  // 优先走签名 URL 直读 OSS，失败自动回退服务端代理（见 fetchPatternZip）。
  // 依赖只能是稳定的 zipUrl/fileID：若把加载状态放进依赖，effect 会被自己的
  // setState 反复清理，cancelled=true 后异步结果被丢弃，页面永远停在 loading。
  useEffect(() => {
    if (!zipUrl) return;
    let cancelled = false;
    void (async () => {
      try {
        const buffer = await fetchPatternZip(fileID, zipUrl);
        const loaded = await loadPatternFromZip(buffer);
        if (cancelled) return;
        setPattern({
          key: zipUrl,
          pixels: cellsToPixels(loaded.cells, loaded.width, loaded.height),
        });
        setFailedKey("");
      } catch {
        if (!cancelled) setFailedKey(zipUrl);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [zipUrl, fileID]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (error || !diagram) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState title={t("notFoundTitle")} description={t("notFoundDescription")} />
      </div>
    );
  }

  const canManage = Boolean(diagram.isOwner || user?.isAdmin);

  const handleDelete = async () => {
    if (!window.confirm(t("deleteConfirm"))) return;
    try {
      await deleteDiagram.mutateAsync(id);
      router.push("/gallery");
    } catch {
      window.alert(t("deleteFailed"));
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-text-primary">{diagram.name}</h1>
          {canManage && (
            <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleteDiagram.isPending}>
              {t("delete")}
            </Button>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-muted">
          <span>{t("by", { userName: diagram.userName || tc("unknownUser") })}</span>
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
                href={`/gallery?tag=${encodeURIComponent(tag)}`}
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
        <div className="flex flex-col items-center gap-3">
          {patternState === "loading" || patternState === "idle" ? (
            <div className="flex flex-col items-center gap-2">
              <Spinner className="h-6 w-6" />
              <span className="text-xs text-text-muted">{t("loadingPattern")}</span>
            </div>
          ) : patternState === "failed" ? (
            <p className="text-xs text-text-muted">{t("patternLoadFailed")}</p>
          ) : null}
          {/* 解析完成前/失败后用缩略图兜底，页面永远不空 */}
          {diagram.imageUrl && (
            <img
              src={diagram.imageUrl}
              alt={diagram.name}
              className="max-h-96 rounded-2xl object-contain shadow-card"
            />
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {status === "authenticated" && (
          <Button
            variant={favorited ? "primary" : "secondary"}
            onClick={() => (favorited ? unfavorite.mutate(id) : favorite.mutate(id))}
            disabled={favorite.isPending || unfavorite.isPending}
          >
            {favorited ? t("favorited") : t("favorite")}
          </Button>
        )}
        <Button
          variant="secondary"
          onClick={() => {
            if (pixels.length > 0) void downloadPatternPng(pixels, `${diagram.name}.png`);
          }}
          disabled={pixels.length === 0}
        >
          {t("downloadPng")}
        </Button>
        {user?.isAdmin && (
          <Button
            variant="secondary"
            onClick={() => setSocialOpen(true)}
            disabled={pixels.length === 0}
          >
            {t("socialKitButton")}
          </Button>
        )}
        <Link href={`/create?load=${id}`}>
          <Button variant="ghost">{t("editInCreator")}</Button>
        </Link>
      </div>

      {user?.isAdmin && (
        <SocialKitDialog
          open={socialOpen}
          onClose={() => setSocialOpen(false)}
          diagram={diagram}
          pixels={pixels}
        />
      )}
    </div>
  );
}
