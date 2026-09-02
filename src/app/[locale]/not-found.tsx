"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFoundPage() {
  const t = useTranslations("notFound");

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="font-heading text-4xl font-semibold text-text-primary">
        404
      </h1>
      <p className="mt-2 text-lg text-text-secondary">{t("title")}</p>
      <Link
        href="/"
        className="mt-8 inline-flex h-13 select-none items-center rounded-full border-[3px] border-primary-light bg-primary px-8 text-sm font-bold text-primary-ink shadow-button transition-[transform,box-shadow,background-color] duration-150 hover:bg-primary-dark active:translate-y-1 active:shadow-button-pressed"
      >
        {t("backHome")}
      </Link>
    </div>
  );
}