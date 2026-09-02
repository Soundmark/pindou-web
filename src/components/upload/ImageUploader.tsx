"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useTranslations } from "next-intl";

interface ImageUploaderProps {
  onImage: (file: File, previewUrl: string) => void;
}

export function ImageUploader({ onImage }: ImageUploaderProps) {
  const t = useTranslations("upload");
  const [preview, setPreview] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      setPreview(url);
      onImage(file, url);
    },
    [onImage]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    maxFiles: 1,
  });

  return (
    <div
      {...getRootProps()}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-3xl border-4 border-dashed p-10 text-center shadow-inset transition-colors sm:p-12 ${
        isDragActive
          ? "border-primary bg-primary/10"
          : "border-clay-border-strong bg-gray-50 hover:border-primary/60"
      }`}
    >
      <input {...getInputProps()} />
      {preview ? (
        <div className="flex flex-col items-center gap-4">
          <img
            src={preview}
            alt={t("previewAlt")}
            className="max-h-48 rounded-2xl border-[3px] border-clay-border object-contain shadow-card"
          />
          <p className="text-sm text-text-secondary">{t("replaceHint")}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className={`flex h-16 w-16 items-center justify-center rounded-2xl border-[3px] border-primary-light bg-primary shadow-button ${isDragActive ? "animate-wobble" : ""}`}>
            <svg className="h-8 w-8 text-primary-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-text-primary">
              {isDragActive ? t("dropHere") : t("uploadPrompt")}
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              {t("formats")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}