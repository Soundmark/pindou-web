"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useTags } from "@/services/diagramService";
import type { TagItem } from "@/types/diagram";

export interface PublishPayload {
  name: string;
  /** 标签名数组 —— 后端存的就是名字，没有 slug / id */
  tags: string[];
}

interface PublishFormProps {
  open: boolean;
  submitting: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (payload: PublishPayload) => void;
  /** 提供时显示「保存草稿」次级按钮（草稿只存在「我的图纸」里，不进公共画廊） */
  onSaveDraft?: (payload: PublishPayload) => void;
}

export function PublishForm({
  open,
  submitting,
  error,
  onClose,
  onSubmit,
  onSaveDraft,
}: PublishFormProps) {
  const t = useTranslations("publish");
  const { data: tagsData } = useTags();
  const tags: TagItem[] = tagsData?.data ?? [];

  const [name, setName] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const toggleTag = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName) ? prev.filter((n) => n !== tagName) : [...prev, tagName]
    );
  };

  const payload = (): PublishPayload => ({
    name: name.trim(),
    tags: selectedTags,
  });

  const canSubmit = Boolean(name.trim()) && !submitting;

  return (
    <Modal open={open} onClose={submitting ? () => {} : onClose} title={t("title")}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) onSubmit(payload());
        }}
        className="flex flex-col gap-4"
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-text-primary">{t("name")}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            required
            placeholder={t("namePlaceholder")}
            className="h-11 rounded-full border-[3px] border-clay-border bg-surface px-4 text-sm text-text-primary shadow-inset outline-none transition-colors focus:border-primary"
          />
        </label>

        {tags.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-text-primary">{t("tags")}</span>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const active = selectedTags.includes(tag.name);
                return (
                  <button
                    key={tag._id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleTag(tag.name)}
                    className={
                      active
                        ? "flex min-h-11 items-center rounded-full border-[3px] border-primary-light bg-primary px-4 text-sm font-semibold text-primary-ink shadow-button transition-[transform,box-shadow] active:translate-y-1 active:shadow-button-pressed"
                        : "flex min-h-11 items-center rounded-full border-[3px] border-clay-border bg-surface px-4 text-sm font-semibold text-text-secondary shadow-button-secondary transition-[transform,box-shadow] active:translate-y-1 active:shadow-button-secondary-pressed"
                    }
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-2xl border-[3px] border-[#ffc9c9] bg-coral/20 px-4 py-2 text-sm font-semibold text-red-500"
          >
            {error}
          </p>
        )}

        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={submitting}
            className="order-3 sm:order-1"
          >
            {t("cancel")}
          </Button>
          {onSaveDraft && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => canSubmit && onSaveDraft(payload())}
              disabled={!canSubmit}
              className="order-2"
            >
              {t("saveDraft")}
            </Button>
          )}
          <Button type="submit" disabled={!canSubmit} className="order-1 sm:order-3">
            {submitting ? t("submitting") : t("submit")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
