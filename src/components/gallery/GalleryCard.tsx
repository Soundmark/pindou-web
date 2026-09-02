"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

interface GalleryCardProps {
  _id: string;
  name: string;
  userName: string;
  imageUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  colorCount: number;
  favoriteCount: number;
  isFavorited?: boolean;
  onFavorite?: (id: string) => void;
}

export function GalleryCard({
  _id,
  name,
  userName,
  thumbnailUrl,
  width,
  height,
  colorCount,
  favoriteCount,
  isFavorited,
  onFavorite,
}: GalleryCardProps) {
  const { data: session } = useSession();
  const t = useTranslations("card");

  return (
    <Link
      href={`/patterns/${_id}`}
      className="group rounded-2xl border-[3px] border-clay-border bg-card-bg shadow-card transition-[transform,box-shadow] duration-200 ease-bounce hover:-translate-y-1 hover:shadow-card-hover"
    >
      <div className="relative aspect-square overflow-hidden rounded-t-2xl bg-gray-100">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        {session && onFavorite && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onFavorite(_id);
            }}
            aria-label={isFavorited ? t("favorited") : t("favorite")}
            className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-clay-border bg-surface shadow-button-secondary transition-[transform,box-shadow] active:translate-y-[3px] active:shadow-button-secondary-pressed"
          >
            <svg
              className={`h-4 w-4 ${isFavorited ? "animate-pop text-coral fill-coral" : "text-gray-400"}`}
              viewBox="0 0 24 24"
              fill={isFavorited ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </button>
        )}
      </div>
      <div className="p-3">
        <h3 className="truncate text-sm font-semibold text-text-primary">{name}</h3>
        <p className="text-xs text-text-secondary">{t("by", { userName })}</p>
        <div className="mt-2 flex items-center gap-2 text-xs text-text-muted">
          <span>{width}x{height}</span>
          <span>·</span>
          <span>{t("colorCount", { count: colorCount })}</span>
          <span>·</span>
          <span>{t("favoriteCount", { count: favoriteCount })}</span>
        </div>
      </div>
    </Link>
  );
}