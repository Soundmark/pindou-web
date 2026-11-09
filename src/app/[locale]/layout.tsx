import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import localFont from "next/font/local";
import { AuthProvider } from "@/providers/AuthProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { Header } from "@/components/layout/Header";
import { routing } from "@/i18n/routing";
import "../globals.css";

// 自托管可变字体（OFL 许可，来源 @fontsource-variable 5.3.0）。
// 之前用 next/font/google 时每次冷构建都要连 fonts.googleapis.com，
// 在国内网络上是构建失败的常客；改 local 后构建零外网依赖。
const fredoka = localFont({
  src: "../../fonts/fredoka-latin-wght-normal.woff2",
  variable: "--font-fredoka",
  display: "swap",
  weight: "300 700",
});

const nunito = localFont({
  src: "../../fonts/nunito-latin-wght-normal.woff2",
  variable: "--font-nunito",
  display: "swap",
  weight: "200 1000",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  return (
    <html lang={locale} className={`h-full ${fredoka.variable} ${nunito.variable}`}>
      <body className="min-h-full flex flex-col bg-background text-text-primary antialiased">
        <NextIntlClientProvider>
          <QueryProvider>
            <AuthProvider>
              <Header />
              <main className="flex-1">{children}</main>
            </AuthProvider>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
