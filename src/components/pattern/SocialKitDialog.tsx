"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ApiError } from "@/lib/api-client";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useSocialCopy } from "@/services/socialService";
import type { DiagramItem } from "@/types/diagram";
import {
  computePatternStats,
  downloadCanvas,
  renderSocialCover,
  renderSocialPattern,
  sanitizeFilename,
} from "@/utils/socialKitRenderer";

interface SocialKitDialogProps {
  open: boolean;
  onClose: () => void;
  diagram: DiagramItem;
  pixels: number[][];
}

type Tab = "cover" | "pattern" | "copy";
type CopyField = "title" | "content";

const COPY_ERROR_CODES = [
  "forbidden",
  "owner_not_configured",
  "ai_not_configured",
  "invalid_input",
  "rate_limited",
  "upstream_failed",
];

/**
 * 管理员专用：预览并下载社交媒体素材（封面 / 带图例水印的图纸 / 大模型文案）。
 * 图片全部在浏览器 Canvas 生成，文案走后端 `/api/ai` 的 socialCopy。
 */
export function SocialKitDialog({ open, onClose, diagram, pixels }: SocialKitDialogProps) {
  const t = useTranslations("socialKit");
  const [tab, setTab] = useState<Tab>("cover");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [patternUrl, setPatternUrl] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<string | null>(null);
  const [copied, setCopied] = useState<CopyField | null>(null);
  const [copyError, setCopyError] = useState(false);

  const coverCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const patternCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const stats = useMemo(() => computePatternStats(pixels), [pixels]);

  const copyQuery = useSocialCopy(
    {
      name: diagram.name,
      width: diagram.width,
      height: diagram.height,
      colorCount: diagram.colorCount || stats.colorCount,
      beadCount: stats.beadCount,
      tags: Array.isArray(diagram.tags) ? diagram.tags : [],
    },
    open && pixels.length > 0
  );

  const title = editedTitle ?? copyQuery.data?.title ?? "";
  const content = editedContent ?? copyQuery.data?.content ?? "";

  // 打开时生成两张图；关闭/切换图纸时回收 object URL
  useEffect(() => {
    if (!open || pixels.length === 0) return;
    let cancelled = false;
    const urls: string[] = [];
    const cover = document.createElement("canvas");
    const pattern = document.createElement("canvas");

    renderSocialCover(
      pixels,
      {
        name: diagram.name,
        width: diagram.width,
        height: diagram.height,
        tags: Array.isArray(diagram.tags) ? diagram.tags : [],
      },
      cover
    );
    renderSocialPattern(pixels, pattern);
    coverCanvasRef.current = cover;
    patternCanvasRef.current = pattern;

    void Promise.all([canvasToBlob(cover), canvasToBlob(pattern)])
      .then(([coverBlob, patternBlob]) => {
        if (cancelled) return;
        const nextCover = URL.createObjectURL(coverBlob);
        const nextPattern = URL.createObjectURL(patternBlob);
        urls.push(nextCover, nextPattern);
        setCoverUrl(nextCover);
        setPatternUrl(nextPattern);
      })
      .catch(() => {
        if (cancelled) return;
        setCoverUrl(null);
        setPatternUrl(null);
      });

    return () => {
      cancelled = true;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [open, pixels, diagram]);

  const errorCode = copyQuery.error instanceof ApiError ? copyQuery.error.code : "";
  const errorKey = COPY_ERROR_CODES.includes(errorCode) ? errorCode : "default";
  const errorMessage = t(`errors.${errorKey}`);

  const filename = sanitizeFilename(diagram.name);

  const regenerate = () => {
    setEditedTitle(null);
    setEditedContent(null);
    setCopyError(false);
    void copyQuery.refetch();
  };

  const handleClose = () => {
    setEditedTitle(null);
    setEditedContent(null);
    setCopied(null);
    setCopyError(false);
    onClose();
  };

  const handleDownload = async (which: "cover" | "pattern") => {
    const canvas = which === "cover" ? coverCanvasRef.current : patternCanvasRef.current;
    if (!canvas) return;
    await downloadCanvas(
      canvas,
      which === "cover" ? `cover-${filename}.png` : `${filename}-图纸.png`
    );
  };

  const handleCopy = async (field: CopyField) => {
    const value = field === "title" ? title : content;
    if (!value) return;
    try {
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(value);
        } catch {
          // 有 API 但被权限策略/焦点状态拒绝时，仍尝试旧式复制
          fallbackCopy(value);
        }
      } else {
        fallbackCopy(value);
      }
      setCopyError(false);
      setCopied(field);
      window.setTimeout(() => {
        setCopied((current) => (current === field ? null : current));
      }, 2000);
    } catch {
      setCopyError(true);
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "cover", label: t("tabCover") },
    { key: "pattern", label: t("tabPattern") },
    { key: "copy", label: t("tabCopy") },
  ];

  return (
    <Modal open={open} onClose={handleClose} title={t("title")} className="max-w-3xl">
      <div className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto pr-1">
        <div className="flex gap-2">
          {tabs.map((item) => (
            <Button
              key={item.key}
              variant={tab === item.key ? "primary" : "secondary"}
              size="md"
              className="h-11 flex-1"
              onClick={() => setTab(item.key)}
            >
              {item.label}
            </Button>
          ))}
        </div>

        {tab === "cover" && (
          <div className="flex flex-col items-center gap-3">
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={t("tabCover")}
                className="max-h-[60vh] w-auto max-w-full rounded-2xl border-[3px] border-clay-border bg-card-bg object-contain shadow-card"
              />
            ) : (
              <div className="flex min-h-48 items-center justify-center">
                <Spinner className="h-8 w-8" />
              </div>
            )}
            <Button
              variant="secondary"
              onClick={() => void handleDownload("cover")}
              disabled={!coverUrl}
            >
              {t("downloadCover")}
            </Button>
          </div>
        )}

        {tab === "pattern" && (
          <div className="flex flex-col items-center gap-3">
            {patternUrl ? (
              <img
                src={patternUrl}
                alt={t("tabPattern")}
                className="max-h-[60vh] w-auto max-w-full rounded-2xl border-[3px] border-clay-border bg-card-bg object-contain shadow-card"
              />
            ) : (
              <div className="flex min-h-48 items-center justify-center">
                <Spinner className="h-8 w-8" />
              </div>
            )}
            <Button
              variant="secondary"
              onClick={() => void handleDownload("pattern")}
              disabled={!patternUrl}
            >
              {t("downloadPattern")}
            </Button>
          </div>
        )}

        {tab === "copy" && (
          <div className="flex flex-col gap-4">
            {copyQuery.isLoading ? (
              <div className="flex min-h-40 flex-col items-center justify-center gap-2">
                <Spinner className="h-7 w-7" />
                <span className="text-sm text-text-muted">{t("generating")}</span>
              </div>
            ) : copyQuery.isError ? (
              <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-center">
                <p className="text-sm text-text-secondary">{errorMessage}</p>
                <Button
                  variant="secondary"
                  onClick={regenerate}
                  disabled={copyQuery.isFetching}
                >
                  {t("regenerate")}
                </Button>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-text-secondary" htmlFor="social-title">
                    {t("titleLabel")}
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      id="social-title"
                      value={title}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="h-11 min-w-0 flex-1 rounded-full border-[3px] border-clay-border bg-surface px-4 text-sm text-text-primary shadow-inset focus:border-primary focus:outline-none"
                    />
                    <Button
                      variant="secondary"
                      className="shrink-0"
                      onClick={() => void handleCopy("title")}
                      disabled={!title}
                    >
                      {copied === "title" ? t("copied") : t("copyTitle")}
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    className="text-sm font-semibold text-text-secondary"
                    htmlFor="social-content"
                  >
                    {t("contentLabel")}
                  </label>
                  <textarea
                    id="social-content"
                    value={content}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="min-h-40 w-full resize-y rounded-2xl border-[3px] border-clay-border bg-surface p-4 text-sm leading-relaxed text-text-primary shadow-inset focus:border-primary focus:outline-none"
                  />
                  <div className="flex justify-end">
                    <Button
                      variant="secondary"
                      onClick={() => void handleCopy("content")}
                      disabled={!content}
                    >
                      {copied === "content" ? t("copied") : t("copyContent")}
                    </Button>
                  </div>
                </div>

                {copyError && <p className="text-xs text-coral-deep">{t("copyFailed")}</p>}

                <div className="flex justify-center">
                  <Button
                    variant="ghost"
                    onClick={regenerate}
                    disabled={copyQuery.isFetching}
                  >
                    {copyQuery.isFetching ? t("generating") : t("regenerate")}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("PNG export failed"))),
      "image/png"
    );
  });
}

/** 旧浏览器/非安全上下文没有 Clipboard API 时的兜底。 */
function fallbackCopy(value: string): void {
  const el = document.createElement("textarea");
  el.value = value;
  el.style.position = "fixed";
  el.style.opacity = "0";
  document.body.appendChild(el);
  el.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(el);
  if (!ok) throw new Error("copy failed");
}
