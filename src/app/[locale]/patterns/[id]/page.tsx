"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCheckFavorited,
  useDeleteDiagram,
  useDiagram,
  useFavorite,
  useUnfavorite,
  useUpdateDiagram,
} from "@/services/diagramService";
import { PatternCanvas } from "@/components/pattern/PatternCanvas";
import { PatternAreaPlaceholder } from "@/components/pattern/PatternAreaPlaceholder";
import { ColorLegend } from "@/components/pattern/ColorLegend";
import { SocialKitDialog } from "@/components/pattern/SocialKitDialog";
import { PatternEditor } from "@/components/editor/PatternEditor";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, LoadingSkeleton } from "@/components/ui/Spinner";
import { createPatternThumbnailBlob, downloadPatternPng } from "@/utils/imageExport";
import {
  buildPatternZip,
  cellsToPixels,
  loadPatternFromZip,
  pixelsToCells,
  type ColorSystemType,
} from "@/utils/patternZip";
import { fetchPatternZip } from "@/utils/patternFetch";
import { cloneGrid, countBeads, countColors } from "@/utils/pixelGrid";
import { useFullscreenMode } from "@/hooks/useFullscreenMode";
import { CollapseIcon } from "@/components/editor/icons";
import { useAuth } from "@/providers/AuthProvider";
import { Link, useRouter } from "@/i18n/navigation";
import { patternFileUrl } from "@/services/normalize";
import { uploadToOss } from "@/lib/oss-upload";
import { ApiError } from "@/lib/api-client";
import type { DiagramItem } from "@/types/diagram";

type PatternLoadState = "loading" | "ready" | "failed";

export default function PatternDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, status } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const t = useTranslations("patternDetail");
  const tEditor = useTranslations("editor");
  const tc = useTranslations("common");
  const { data, isLoading, refetch } = useDiagram(id);

  const [highlightedColor, setHighlightedColor] = useState<number | null>(null);
  const [socialOpen, setSocialOpen] = useState(false);
  // 结果带 key：只有和当前 zipUrl 匹配的像素才渲染，切换图纸时旧结果自动失效
  const [pattern, setPattern] = useState<{ key: string; pixels: number[][] } | null>(null);
  const [failedKey, setFailedKey] = useState("");
  const [zipRetry, setZipRetry] = useState(0);

  // 原地编辑状态
  const [isEditing, setIsEditing] = useState(false);
  const [draftPixels, setDraftPixels] = useState<number[][] | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);

  const favorited = useCheckFavorited(id).data ?? false;
  const favorite = useFavorite();
  const unfavorite = useUnfavorite();
  const deleteDiagram = useDeleteDiagram();
  const updateDiagram = useUpdateDiagram();

  const {
    active: isFullscreen,
    toggle: toggleFullscreen,
    exit: exitFullscreen,
  } = useFullscreenMode();

  const diagram = data?.data;
  const zipUrl = diagram?.zipUrl || "";
  const fileID = diagram?.fileID || "";

  const pixels = pattern && pattern.key === zipUrl ? pattern.pixels : [];
  const hasPattern = pixels.length > 0 && (pixels[0]?.length ?? 0) > 0;
  const patternKey = pattern?.key ?? "";
  let patternState: PatternLoadState = "loading";
  if (!zipUrl) patternState = "failed";
  else if (hasPattern) patternState = "ready";
  else if (failedKey === zipUrl || pattern?.key === zipUrl) patternState = "failed";

  const handleDraftChange = useCallback((next: number[][]) => {
    setDraftPixels(next);
    setDirty(true);
  }, []);

  // 未保存的修改在刷新/关闭标签页时提醒
  useEffect(() => {
    if (!isEditing || !dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isEditing, dirty]);

  // 后端不存像素：按 DTO 里的 ZIP 地址取回 pattern.json 再还原网格。
  // 优先走签名 URL 直读 OSS，失败自动回退服务端代理（见 fetchPatternZip）。
  // 依赖只能是稳定的 zipUrl/fileID/patternKey：若把加载状态放进依赖，effect 会被
  // 自己的 setState 反复清理，cancelled=true 后异步结果被丢弃，页面永远停在 loading。
  useEffect(() => {
    if (!zipUrl || patternKey === zipUrl) return;
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
  }, [zipUrl, fileID, zipRetry, patternKey]);

  // 登录前打开的详情可能缓存了 isOwner=false；登录后若当前用户就是作者，补一次带 token 的拉取
  const ownerRefetchedRef = useRef(false);
  useEffect(() => {
    if (ownerRefetchedRef.current) return;
    if (!diagram || diagram.isOwner || !user?.uid) return;
    if (diagram.userId !== user.uid) return;
    ownerRefetchedRef.current = true;
    void refetch();
  }, [diagram, user?.uid, refetch]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8" aria-busy="true">
        <div className="mb-8 space-y-3">
          <LoadingSkeleton className="h-8 w-56" />
          <LoadingSkeleton className="h-4 w-72" />
        </div>
        <div className="flex flex-col items-center gap-6">
          <PatternAreaPlaceholder />
        </div>
      </div>
    );
  }

  if (!diagram) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState title={t("notFoundTitle")} description={t("notFoundDescription")} />
      </div>
    );
  }

  const canManage = Boolean(diagram.isOwner || user?.isAdmin);

  const handleDelete = async () => {
    if (isEditing || saving) return;
    if (!window.confirm(t("deleteConfirm"))) return;
    try {
      await deleteDiagram.mutateAsync(id);
      router.push("/gallery");
    } catch {
      window.alert(t("deleteFailed"));
    }
  };

  const retryLoad = () => {
    setPattern(null);
    setFailedKey("");
    setZipRetry((n) => n + 1);
  };

  const startEdit = () => {
    if (!hasPattern) return;
    // 编辑器会原地修改工作副本，必须深拷贝，取消时不能污染查看态像素
    setDraftPixels(cloneGrid(pixels));
    setDirty(false);
    setSaveError(null);
    setHighlightedColor(null);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setDiscardOpen(false);
    setIsEditing(false);
    setDraftPixels(null);
    setDirty(false);
    setSaveError(null);
    exitFullscreen();
  };

  const requestCancel = () => {
    if (saving) return;
    if (!dirty) cancelEdit();
    else setDiscardOpen(true);
  };

  const saveErrorText = (e: unknown): string => {
    if (e instanceof ApiError) {
      if (e.code === "image_risky" || e.code === "content_risky") {
        return t("saveRisky");
      }
      if (e.code === "forbidden") return t("saveForbidden");
    }
    if (e instanceof Error && e.message === "upload_failed") {
      return t("saveUploadFailed");
    }
    return t("saveFailed");
  };

  const handleSave = async () => {
    if (!draftPixels || saving || !dirty) return;
    setSaving(true);
    setSaveError(null);

    const snapshot = cloneGrid(draftPixels); // 本次上传的确定内容
    const width = snapshot[0]?.length ?? 0;
    const height = snapshot.length;
    const cellCount = countBeads(snapshot);
    const colorCount = countColors(snapshot);
    const colorSystem = (diagram.brand as ColorSystemType) || "MARD";

    try {
      const zipBlob = await buildPatternZip(
        pixelsToCells(snapshot),
        width,
        height,
        colorSystem
      );
      const thumbBlob = await createPatternThumbnailBlob(snapshot);
      const [zipFile, thumbFile] = await Promise.all([
        uploadToOss(
          new File([zipBlob], "pattern.zip", { type: "application/zip" }),
          "diagrams"
        ),
        uploadToOss(
          new File([thumbBlob], "pattern-thumbnail.png", { type: "image/png" }),
          "diagrams"
        ),
      ]);

      const newZipUrl = patternFileUrl(zipFile.key, "");

      await updateDiagram.mutateAsync({
        _id: id,
        fileID: zipFile.key,
        thumbnailFileID: thumbFile.key,
        width,
        height,
        cellCount,
        colorCount,
        colorSystem,
      });

      // 同步 seed 缓存与本地像素，避免 zipUrl 变化时闪回占位
      qc.setQueryData<{ data: DiagramItem }>(
        ["diagram", id],
        (old: { data: DiagramItem } | undefined) =>
          old
            ? {
                data: {
                  ...old.data,
                  fileID: zipFile.key,
                  zipUrl: newZipUrl,
                  thumbnailFileID: thumbFile.key,
                  thumbnailUrl: thumbFile.url,
                  imageUrl: thumbFile.url,
                  width,
                  height,
                  cellCount,
                  colorCount,
                },
              }
            : old
      );
      setPattern({ key: newZipUrl, pixels: snapshot });
      setFailedKey("");

      setIsEditing(false);
      setDraftPixels(null);
      setDirty(false);
      exitFullscreen();
    } catch (e) {
      setSaveError(saveErrorText(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-text-primary">{diagram.name}</h1>
          {canManage && (
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              disabled={isEditing || saving || deleteDiagram.isPending}
            >
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

        {isEditing && draftPixels ? (
          <PatternEditor
            pixels={draftPixels}
            gridWidth={draftPixels[0]?.length ?? 0}
            gridHeight={draftPixels.length}
            underlayDataUrl={null}
            highlightedColorId={highlightedColor}
            isProcessing={saving}
            processingLabel={t("saving")}
            onPixelsChange={handleDraftChange}
            fullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
          />
        ) : hasPattern ? (
          <PatternCanvas
            pixels={pixels}
            highlightedColorId={highlightedColor}
            fullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
          />
        ) : (
          <PatternAreaPlaceholder
            imageUrl={diagram.imageUrl}
            state={patternState === "failed" ? "failed" : "loading"}
            onRetry={
              zipUrl && patternState === "failed" ? retryLoad : undefined
            }
          />
        )}

        {hasPattern && !isEditing && (
          <ColorLegend
            pixels={pixels}
            highlightedColorId={highlightedColor}
            onHighlightColor={setHighlightedColor}
            orientation={isFullscreen ? "strip" : "wrap"}
          />
        )}

        {isEditing && draftPixels && (
          <div
            className={
              isFullscreen
                ? "flex w-full shrink-0 flex-col items-center gap-3 border-t-[3px] border-clay-border bg-background px-4 py-3"
                : "flex w-full max-w-120 flex-col items-center gap-3"
            }
          >
            {saveError && (
              <p
                role="alert"
                className="rounded-2xl border-[3px] border-clay-border bg-surface px-4 py-2 text-center text-sm font-semibold text-primary-strong"
              >
                {saveError}
              </p>
            )}
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="secondary" onClick={requestCancel} disabled={saving}>
                {tc("cancel")}
              </Button>
              <Button onClick={() => void handleSave()} disabled={saving || !dirty}>
                {saving ? t("saving") : tc("save")}
              </Button>
            </div>
          </div>
        )}

        <Modal
          open={discardOpen}
          onClose={() => setDiscardOpen(false)}
          title={t("discardChangesTitle")}
        >
          <p className="text-sm text-text-secondary">
            {t("discardChangesDescription")}
          </p>
          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={() => setDiscardOpen(false)}>
              {t("keepEditing")}
            </Button>
            <Button variant="danger" onClick={cancelEdit}>
              {t("discard")}
            </Button>
          </div>
        </Modal>
      </div>

      {/* Actions */}
      {!isEditing && (
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
              if (hasPattern)
                void downloadPatternPng(pixels, `${diagram.name}.png`, diagram.brand);
            }}
            disabled={!hasPattern}
          >
            {t("downloadPng")}
          </Button>
          {user?.isAdmin && (
            <Button
              variant="secondary"
              onClick={() => setSocialOpen(true)}
              disabled={!hasPattern}
            >
              {t("socialKitButton")}
            </Button>
          )}
          {canManage ? (
            <Button variant="secondary" onClick={startEdit} disabled={!hasPattern}>
              {t("edit")}
            </Button>
          ) : (
            <Link href={`/create?load=${id}`}>
              <Button variant="ghost">{t("remixInCreator")}</Button>
            </Link>
          )}
        </div>
      )}

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
