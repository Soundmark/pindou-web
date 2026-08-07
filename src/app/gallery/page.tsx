"use client";

import { useState, useCallback } from "react";
import { useDiagrams, useTags, useFavorite, useUnfavorite } from "@/services/diagramService";
import { GalleryCard } from "@/components/gallery/GalleryCard";
import { Spinner, EmptyState } from "@/components/ui/Spinner";
import { useSession } from "next-auth/react";

export default function GalleryPage() {
  const { data: session } = useSession();
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
        <h1 className="text-2xl font-bold text-text-primary">Gallery</h1>
        <p className="mt-1 text-text-secondary">
          Browse patterns created by the community
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        <input
          type="text"
          placeholder="Search patterns..."
          value={keyword}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
        />

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTag("")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                !tag ? "bg-primary text-white" : "bg-gray-100 text-text-secondary hover:bg-gray-200"
              }`}
            >
              All
            </button>
            {tags.map((t: any) => (
              <button
                key={t._id}
                onClick={() => setTag(t.slug)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  tag === t.slug
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-text-secondary hover:bg-gray-200"
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        )}

        {/* Size filter */}
        <div className="flex items-center gap-3 text-sm">
          <span className="text-text-secondary">Sort:</span>
          <select className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-text-primary outline-none">
            <option value="newest">Newest</option>
            <option value="popular">Most Favorited</option>
            <option value="colors">Most Colors</option>
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
          title="No patterns found"
          description="Try adjusting your search or filters"
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
                className="rounded-full bg-gray-100 px-3 py-1.5 text-sm text-text-secondary disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 text-sm text-text-secondary">
                {page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="rounded-full bg-gray-100 px-3 py-1.5 text-sm text-text-secondary disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}