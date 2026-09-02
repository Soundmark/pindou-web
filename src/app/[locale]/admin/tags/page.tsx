"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useTags } from "@/services/diagramService";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Spinner, EmptyState } from "@/components/ui/Spinner";
import { useSession } from "next-auth/react";

export default function AdminTagsPage() {
  const { data: session } = useSession();
  const t = useTranslations("adminTags");
  const tc = useTranslations("common");
  const { data, isLoading, refetch } = useTags();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const tags = data?.data || [];

  if (!session) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-text-primary">{t("accessDeniedTitle")}</h1>
        <p className="mt-2 text-text-secondary">{t("accessDeniedDescription")}</p>
      </div>
    );
  }

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    setNewName("");
    setShowCreate(false);
    refetch();
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    await fetch(`/api/tags/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    setEditingId(null);
    setEditName("");
    refetch();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("deleteConfirm"))) return;
    await fetch(`/api/tags/${id}`, { method: "DELETE" });
    refetch();
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t("title")}</h1>
          <p className="mt-1 text-sm text-text-secondary">{t("subtitle")}</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>{t("newTag")}</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
      ) : tags.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <div className="space-y-2">
          {tags.map((tag: any) => (
            <div
              key={tag._id}
              className="flex items-center justify-between rounded-2xl border-[3px] border-clay-border bg-surface px-5 py-3 shadow-card"
            >
              {editingId === tag._id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="min-h-[44px] rounded-full border-[3px] border-clay-border bg-surface px-4 py-2 text-sm shadow-inset outline-none focus:border-primary"
                    maxLength={20}
                    autoFocus
                  />
                  <button
                    onClick={() => handleRename(tag._id)}
                    className="text-sm font-bold text-primary-strong hover:opacity-80"
                  >
                    {tc("save")}
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-sm text-text-secondary hover:text-text-primary"
                  >
                    {tc("cancel")}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  {tag.color && (
                    <div
                      className="h-6 w-6 rounded-full border-2 border-clay-border"
                      style={{ backgroundColor: tag.color }}
                    />
                  )}
                  <span className="text-sm font-medium text-text-primary">{tag.name}</span>
                  <span className="text-xs text-text-muted">({tag.diagramCount || 0})</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingId(tag._id);
                    setEditName(tag.name);
                  }}
                  className="flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-clay-border bg-surface text-gray-400 shadow-button-secondary transition-[transform,box-shadow] hover:text-text-primary active:translate-y-[3px] active:shadow-button-secondary-pressed"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(tag._id)}
                  className="flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-clay-border bg-surface text-gray-400 shadow-button-secondary transition-[transform,box-shadow] hover:text-coral active:translate-y-[3px] active:shadow-button-secondary-pressed"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={t("createTitle")}>
        <div className="space-y-4">
          <input
            type="text"
            placeholder={t("namePlaceholder")}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={20}
            className="w-full min-h-[44px] rounded-full border-[3px] border-clay-border bg-surface px-4 py-2 text-sm shadow-inset outline-none focus:border-primary"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>
              {tc("cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>
              {tc("create")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}