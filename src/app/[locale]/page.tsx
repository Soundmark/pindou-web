import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("landing");

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-16 text-center">
      {/* 装饰黏土珠 */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-[8%] top-[18%] hidden h-16 w-16 rounded-full border-[3px] border-white/70 bg-blue-candy shadow-card animate-float sm:block"
        style={{ animationDelay: "0s" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[10%] top-[30%] hidden h-12 w-12 rounded-full border-[3px] border-white/70 bg-green-candy shadow-card animate-float sm:block"
        style={{ animationDelay: "1.5s" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[20%] left-[14%] hidden h-14 w-14 rounded-full border-[3px] border-white/70 bg-yellow-candy shadow-card animate-float sm:block"
        style={{ animationDelay: "3s" }}
      />

      <div className="max-w-lg">
        <h1 className="animate-rise-in font-heading text-4xl font-semibold tracking-tight text-text-primary sm:text-5xl">
          {t("titleLead")}
          <span className="text-primary-strong">{t("titleAccent")}</span>
        </h1>
        <p
          className="animate-rise-in mt-4 text-lg text-text-secondary"
          style={{ animationDelay: "100ms" }}
        >
          {t("subtitle")}
        </p>
        <div
          className="animate-rise-in mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
          style={{ animationDelay: "200ms" }}
        >
          <Link
            href="/create"
            className="inline-flex h-13 select-none items-center gap-2 rounded-full border-[3px] border-primary-light bg-primary px-8 text-sm font-bold text-primary-ink shadow-button transition-[transform,box-shadow,background-color] duration-150 hover:bg-primary-dark active:translate-y-1 active:shadow-button-pressed"
          >
            {t("getStarted")}
          </Link>
          <Link
            href="/gallery"
            className="inline-flex h-13 select-none items-center gap-2 rounded-full border-[3px] border-clay-border bg-surface px-8 text-sm font-bold text-text-secondary shadow-button-secondary transition-[transform,box-shadow,background-color] duration-150 hover:bg-gray-50 active:translate-y-1 active:shadow-button-secondary-pressed"
          >
            {t("browseGallery")}
          </Link>
        </div>
      </div>
    </div>
  );
}
