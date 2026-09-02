"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";

interface LanguageSwitcherProps {
  /** 桌面端用 sm 与 Header 的登录按钮齐平；移动端默认 md（44px 触控） */
  size?: "sm" | "md";
}

/**
 * 中英文切换按钮：切换时保留当前路径与查询参数，
 * next-intl 自动写 NEXT_LOCALE cookie。
 * 点击时读 window.location.search，避免 useSearchParams 的 Suspense 边界。
 */
export function LanguageSwitcher({ size = "md" }: LanguageSwitcherProps) {
  const locale = useLocale();
  const t = useTranslations("header");
  const pathname = usePathname();
  const router = useRouter();
  const next = locale === "en" ? "zh" : "en";

  const switchTo = () => {
    const query = Object.fromEntries(
      new URLSearchParams(window.location.search)
    );
    router.replace({ pathname, query }, { locale: next });
  };

  return (
    <Button
      type="button"
      variant="secondary"
      size={size}
      onClick={switchTo}
      aria-label={t("switchAria")}
    >
      {t("switchTo")}
    </Button>
  );
}