"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useDiagrams, useTags, useFavorite, useUnfavorite } from "@/services/diagramService";
import { GalleryCard } from "@/components/gallery/GalleryCard";
import { Spinner, EmptyState } from "@/components/ui/Spinner";
import { useSession } from "next-auth/react";

export default function GalleryPage() {
  const { data: session } = useSession();
  const t = useTranslations("gallery");
  const tc = useTranslations("common");
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [tag, setTag] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");

  const { data: tagsData } = useTags();
  const { data: diagramsData, isLoading } = useDiagrams({
    page,
    limit: 20,
    keyword: debouncedKeyword || undefined,
    tag: tag || undefined,
  });

  const favMutation = useFavorite();
  const unfavMutation = useUnfavorite();

  const handleSearch = useCallback((value: string) => {
    setKeyword(value);
    const timer = setTimeout(() => setDebouncedKeyword(value), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleFavorite = (id: string) => {
    if (!session) return;
    const isFav = diagramsData?.data?.some((d: any) => d._id === id && d.isFavorited);
    if (isFav) {
      unfavMutation.mutate(id);
    } else {
      favMutation.mutate(id);
    }
  };

  const tags = tagsData?.data || [];
  const diagrams = diagramsData?.data || [];
  const pagination = diagramsData?.pagination;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">{t("title")}</h1>
        <p className="mt-1 text-text-secondary">
          {t("subtitle")}
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        <input
          type="text"
          placeholder={t("searchPlaceholder")}
          value={keyword}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full rounded-full border-[3px] border-clay-border bg-surface px-5 py-3 text-sm text-text-primary shadow-inset outline-none transition-colors placeholder:text-text-muted focus:border-primary"
        />

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTag("")}
              className={`min-h-[44px] rounded-full border-[3px] px-4 py-2 text-xs font-semibold transition-[transform,box-shadow,background-color] active:translate-y-[3px] ${
                !tag
                  ? "border-primary-light bg-primary text-primary-ink shadow-button active:shadow-button-pressed"
                  : "border-clay-border bg-surface text-text-secondary shadow-button-secondary hover:bg-gray-50 active:shadow-button-secondary-pressed"
              }`}
            >
              {tc("all")}
            </button>
            {tags.map((tg: any) => (
              <button
                key={tg._id}
                onClick={() => setTag(tg.slug)}
                className={`min-h-[44px] rounded-full border-[3px] px-4 py-2 text-xs font-semibold transition-[transform,box-shadow,background-color] active:translate-y-[3px] ${
                  tag === tg.slug
                    ? "border-primary-light bg-primary text-primary-ink shadow-button active:shadow-button-pressed"
                    : "border-clay-border bg-surface text-text-secondary shadow-button-secondary hover:bg-gray-50 active:shadow-button-secondary-pressed"
                }`}
              >
                {tg.name}
              </button>
            ))}
          </div>
        )}

        {/* Size filter */}
        <div className="flex items-center gap-3 text-sm">
          <span className="text-text-secondary">{t("sortLabel")}</span>
          <select className="min-h-[44px] rounded-full border-[3px] border-clay-border bg-surface px-4 py-2 text-sm text-text-primary shadow-inset outline-none focus:border-primary">
            <option value="newest">{t("sortNewest")}</option>
            <option value="popular">{t("sortPopular")}</option>
            <option value="colors">{t("sortColors")}</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : diagrams.length === 0 ? (
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {diagrams.map((d: any) => (
              <GalleryCard
                key={d._id}
                _id={d._id}
                name={d.name}
                userName={d.userName}
                imageUrl={d.imageUrl}
                thumbnailUrl={d.thumbnailUrl}
                width={d.width}
                height={d.height}
                colorCount={d.colorCount}
                favoriteCount={d.favoriteCount}
                isFavorited={d.isFavorited}
                onFavorite={handleFavorite}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-full border-[3px] border-clay-border bg-surface px-4 py-1.5 text-sm font-semibold text-text-secondary shadow-button-secondary transition-[transform,box-shadow] active:translate-y-1 active:shadow-button-secondary-pressed disabled:opacity-50"
              >
                {tc("previous")}
              </button>
              <span className="px-3 text-sm text-text-secondary">
                {t("pageInfo", { page, totalPages: pagination.totalPages })}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="rounded-full border-[3px] border-clay-border bg-surface px-4 py-1.5 text-sm font-semibold text-text-secondary shadow-button-secondary transition-[transform,box-shadow] active:translate-y-1 active:shadow-button-secondary-pressed disabled:opacity-50"
              >
                {tc("next")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}