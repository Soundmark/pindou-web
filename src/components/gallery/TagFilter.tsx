"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import type { TagItem } from "@/types/diagram";

const MAX_VISIBLE = 8;

interface TagFilterProps {
  tags: TagItem[];
  /** slug 或原始标签名（后端当前 slug === name） */
  selectedTag: string;
  /** 传 "" 表示全部 */
  onSelect: (slug: string) => void;
}

const chipClass = (active: boolean) =>
  `inline-flex min-h-[44px] items-center gap-1.5 rounded-full border-[3px] px-4 py-2 text-xs font-semibold transition-[transform,box-shadow,background-color] active:translate-y-[3px] ${
    active
      ? "border-primary-light bg-primary text-primary-ink shadow-button active:shadow-button-pressed"
      : "border-clay-border bg-surface text-text-secondary shadow-button-secondary hover:bg-gray-50 active:shadow-button-secondary-pressed"
  }`;

export function TagFilter({ tags, selectedTag, onSelect }: TagFilterProps) {
  const t = useTranslations("gallery");
  const tc = useTranslations("common");
  const [moreOpen, setMoreOpen] = useState(false);
  const [query, setQuery] = useState("");
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  const isSelected = (tag: TagItem) =>
    selectedTag === tag.slug || selectedTag === tag.name;

  const sortedAll = [...tags].sort(
    (a, b) =>
      (b.diagramCount ?? 0) - (a.diagramCount ?? 0) ||
      a.name.localeCompare(b.name)
  );
  const withCount = sortedAll.filter((tag) => (tag.diagramCount ?? 0) > 0);
  // 新站所有标签都是 0 时也要有可见入口，否则标签区只剩「全部」
  const ranked = withCount.length > 0 ? withCount : sortedAll;
  const visible = ranked.slice(0, MAX_VISIBLE);
  const selected = sortedAll.find(isSelected);
  if (selected && !visible.some((tag) => tag._id === selected._id)) {
    visible.push(selected);
  }
  const remaining = sortedAll.length - visible.length;
  const hasMore = remaining > 0;

  const filtered = query.trim()
    ? sortedAll.filter((tag) =>
        tag.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
      )
    : sortedAll;

  const focusMoreButton = () => {
    requestAnimationFrame(() => moreButtonRef.current?.focus());
  };

  const closeMore = () => {
    setMoreOpen(false);
    setQuery("");
    focusMoreButton();
  };

  const pickTag = (slug: string) => {
    onSelect(slug);
    closeMore();
  };

  return (
    <>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label={t("filterByTag")}
      >
        <button
          type="button"
          onClick={() => onSelect("")}
          aria-pressed={!selectedTag}
          className={chipClass(!selectedTag)}
        >
          {tc("all")}
        </button>
        {visible.map((tag) => (
          <button
            key={tag._id}
            type="button"
            onClick={() => onSelect(tag.slug)}
            aria-pressed={isSelected(tag)}
            className={chipClass(isSelected(tag))}
          >
            {tag.name}
          </button>
        ))}
        {hasMore && (
          <button
            ref={moreButtonRef}
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            aria-label={t("moreTagsAria")}
            className={chipClass(false)}
          >
            {t("moreTags")}
            <span className="text-[10px] tabular-nums opacity-70">
              +{remaining}
            </span>
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
      </div>

      <Modal
        open={moreOpen}
        onClose={closeMore}
        title={t("tagsModalTitle")}
        className="max-w-lg"
      >
        <div className="flex max-h-[65vh] flex-col gap-3">
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchTagsPlaceholder")}
            aria-label={t("searchTagsAria")}
            className="min-h-[44px] w-full rounded-full border-[3px] border-clay-border bg-surface px-5 py-2 text-sm text-text-primary shadow-inset outline-none transition-colors placeholder:text-text-muted focus:border-primary"
          />
          <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-text-muted">
                {t("noTagsFound")}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {filtered.map((tag) => {
                  const active = isSelected(tag);
                  return (
                    <button
                      key={tag._id}
                      type="button"
                      onClick={() => pickTag(tag.slug)}
                      aria-pressed={active}
                      className={`flex min-h-[44px] w-full items-center justify-between gap-3 rounded-2xl border-[3px] px-4 py-2 text-left text-sm font-semibold transition-colors ${
                        active
                          ? "border-primary-light bg-primary text-primary-ink"
                          : "border-clay-border bg-surface text-text-secondary hover:bg-gray-50"
                      }`}
                    >
                      <span className="truncate">{tag.name}</span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs tabular-nums ${
                          active
                            ? "bg-surface/60 text-primary-ink"
                            : "bg-gray-100 text-text-muted"
                        }`}
                      >
                        {tag.diagramCount ?? 0}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
