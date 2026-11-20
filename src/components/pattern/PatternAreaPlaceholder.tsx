"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

interface PatternAreaPlaceholderProps {
  imageUrl?: string;
  state?: "loading" | "failed";
  onRetry?: () => void;
}

/**
 * 图纸区域的加载/失败占位：与 PatternCanvas 的卡片尺寸完全一致，
 * Spinner 始终居中在图纸区域内，而不是堆在图纸上方。
 */
export function PatternAreaPlaceholder({
  imageUrl,
  state = "loading",
  onRetry,
}: PatternAreaPlaceholderProps) {
  const t = useTranslations("patternDetail");
  const tc = useTranslations("common");

  return (
    <div className="relative aspect-4/3 w-full max-w-120 overflow-hidden rounded-3xl border-[3px] border-clay-border bg-surface shadow-card">
      {imageUrl && (
        // 解析完成前/失败后用缩略图兜底，页面永远不空
        <img
          src={imageUrl}
          alt=""
          aria-hidden
          className={`absolute inset-0 h-full w-full object-contain p-4 ${
            state === "loading" ? "opacity-40" : "opacity-100"
          }`}
        />
      )}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="flex max-w-[85%] flex-col items-center gap-2 rounded-2xl border-[3px] border-clay-border bg-surface px-5 py-3 text-center shadow-card">
          {state === "loading" ? (
            <div
              role="status"
              aria-live="polite"
              className="flex flex-col items-center gap-2"
            >
              <Spinner className="h-7 w-7" />
              <span className="text-xs font-semibold text-text-muted">
                {t("loadingPattern")}
              </span>
            </div>
          ) : (
            <>
              <span className="text-xs font-semibold text-text-secondary">
                {imageUrl
                  ? t("patternLoadFailed")
                  : t("patternLoadFailedNoPreview")}
              </span>
              {onRetry && (
                <Button variant="secondary" onClick={onRetry} className="mt-1">
                  {tc("retry")}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
