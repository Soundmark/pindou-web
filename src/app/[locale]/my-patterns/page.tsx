"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMyDiagrams, useFavorites, useDeleteMyDiagram, useUnfavorite } from "@/services/diagramService";
import { GalleryCard } from "@/components/gallery/GalleryCard";
import { Button } from "@/components/ui/Button";
import { Spinner, EmptyState } from "@/components/ui/Spinner";
import { useSession } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";

export default function MyPatternsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const t = useTranslations("myPatterns");
  const [tab, setTab] = useState<"mine" | "favorites">("mine");
  const { data: myData, isLoading: myLoading } = useMyDiagrams();
  const { data: favData, isLoading: favLoading } = useFavorites();
  const deleteMutation = useDeleteMyDiagram();
  const unfavMutation = useUnfavorite();

  if (!session) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-text-primary">{t("signInTitle")}</h1>
        <p className="mt-2 text-text-secondary">{t("signInDescription")}</p>
        <Button className="mt-6" onClick={() => router.push("/login")}>
          {t("signInButton")}
        </Button>
      </div>
    );
  }

  const myDiagrams = myData?.data || [];
  const favorites = favData?.data || [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-text-primary">{t("title")}</h1>

      {/* Tabs */}
      <div className="mb-6 flex gap-1.5 rounded-2xl border-[3px] border-clay-border bg-gray-100 p-1.5 shadow-inset">
        <button
          onClick={() => setTab("mine")}
          className={`flex-1 min-h-[44px] rounded-xl px-4 py-2 text-sm transition-colors ${
            tab === "mine" ? "bg-surface font-bold text-text-primary shadow-button-secondary" : "text-text-secondary hover:text-text-primary"
          }`}
        >
          {t("tabMine", { count: myDiagrams.length })}
        </button>
        <button
          onClick={() => setTab("favorites")}
          className={`flex-1 min-h-[44px] rounded-xl px-4 py-2 text-sm transition-colors ${
            tab === "favorites" ? "bg-surface font-bold text-text-primary shadow-button-secondary" : "text-text-secondary hover:text-text-primary"
          }`}
        >
          {t("tabFavorites", { count: favorites.length })}
        </button>
      </div>

      {/* Content */}
      {tab === "mine" && (
        myLoading ? (
          <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
        ) : myDiagrams.length === 0 ? (
          <EmptyState
            title={t("emptyMineTitle")}
            description={t("emptyMineDescription")}
            icon={
              <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {myDiagrams.map((d: any) => (
              <div key={d._id} className="group relative">
                <GalleryCard
                  _id={d._id}
                  name={d.name}
                  userName={session.user?.name || t("fallbackMe")}
                  imageUrl={d.imageUrl}
                  thumbnailUrl={d.thumbnailUrl}
                  width={d.width}
                  height={d.height}
                  colorCount={d.colorCount}
                  favoriteCount={0}
                />
                <button
                  onClick={() => {
                    if (confirm(t("deleteConfirm"))) {
                      deleteMutation.mutate(d._id);
                    }
                  }}
                  aria-label={t("deleteAria")}
                  className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-clay-border bg-surface text-gray-400 opacity-0 transition-opacity focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100 hover:text-coral active:translate-y-[3px] active:shadow-button-secondary-pressed"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {tab === "favorites" && (
        favLoading ? (
          <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
        ) : favorites.length === 0 ? (
          <EmptyState
            title={t("emptyFavTitle")}
            description={t("emptyFavDescription")}
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {favorites.map((f: any) => (
              <div key={f._id} className="group relative">
                <GalleryCard
                  _id={f.diagramId}
                  name={f.diagramSnapshot?.name || t("fallbackPattern")}
                  userName={f.diagramSnapshot?.userName || t("fallbackUnknown")}
                  imageUrl={f.diagramSnapshot?.imageUrl || ""}
                  thumbnailUrl={f.diagramSnapshot?.thumbnailUrl || ""}
                  width={f.diagramSnapshot?.width || 0}
                  height={f.diagramSnapshot?.height || 0}
                  colorCount={0}
                  favoriteCount={0}
                />
                <button
                  onClick={() => unfavMutation.mutate(f.diagramId)}
                  aria-label={t("unfavoriteAria")}
                  className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-clay-border bg-surface text-coral opacity-0 transition-opacity focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-coral hover:text-primary-ink active:translate-y-[3px] active:shadow-button-secondary-pressed"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}