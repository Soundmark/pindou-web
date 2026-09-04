"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useTags } from "@/services/diagramService";
import type { TagItem } from "@/types/diagram";

export interface PublishPayload {
  name: string;
  description?: string;
  tags: string[];
  isPublic: boolean;
}

interface PublishFormProps {
  open: boolean;
  submitting: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (payload: PublishPayload) => void;
}

export function PublishForm({ open, submitting, error, onClose, onSubmit }: PublishFormProps) {
  const t = useTranslations("publish");
  const { data: tagsData } = useTags();
  const tags: TagItem[] = tagsData?.data ?? [];

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(true);

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleSubmit = () => {
    if (!name.trim() || submitting) return;
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      tags: selectedTags,
      isPublic,
    });
  };

  return (
    <Modal open={open} onClose={submitting ? () => {} : onClose} title={t("title")}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
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

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-text-primary">{t("description")}</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={200}
            rows={3}
            placeholder={t("descriptionPlaceholder")}
            className="resize-none rounded-2xl border-[3px] border-clay-border bg-surface px-4 py-2.5 text-sm text-text-primary shadow-inset outline-none transition-colors focus:border-primary"
          />
        </label>

        {tags.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-text-primary">{t("tags")}</span>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const active = selectedTags.includes(tag._id);
                return (
                  <button
                    key={tag._id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleTag(tag._id)}
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

        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            role="switch"
            aria-checked={isPublic}
            onClick={() => setIsPublic((v) => !v)}
            className="flex h-11 items-center justify-between rounded-full border-[3px] border-clay-border bg-surface px-4 shadow-inset"
          >
            <span className="text-sm font-semibold text-text-primary">{t("isPublic")}</span>
            <span
              className={`flex h-6 w-11 items-center rounded-full border-2 px-0.5 transition-colors ${
                isPublic ? "justify-end border-primary-light bg-primary" : "justify-start border-clay-border bg-gray-200"
              }`}
            >
              <span className="h-4 w-4 rounded-full bg-surface shadow-sm" />
            </span>
          </button>
          <span className="text-xs text-text-secondary">{t("isPublicHint")}</span>
        </div>

        {error && (
          <p className="rounded-2xl border-[3px] border-[#ffc9c9] bg-coral/20 px-4 py-2 text-sm font-semibold text-red-500">
            {error}
          </p>
        )}

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={submitting || !name.trim()}>
            {submitting ? t("submitting") : t("submit")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
