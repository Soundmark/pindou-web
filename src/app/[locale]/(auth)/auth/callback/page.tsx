"use client";

/**
 * OAuth 回调落点：`/<locale>/auth/callback#ticket=...&returnTo=...`
 *
 * ticket 在 fragment 里 —— 不会发到服务器，也不进 Referer/日志。
 * 换到正式 JWT 后立即把它从地址栏抹掉，然后跳到 returnTo。
 */
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { ApiError } from "@/lib/api-client";
import { exchangeTicket, normalizeReturnTo, stripLocalePrefix } from "@/lib/auth-client";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

export default function AuthCallbackPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const { refresh } = useAuth();

  const started = useRef(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    // StrictMode 下 effect 会跑两遍；ticket 是一次性的，第二遍必然失败
    if (started.current) return;
    started.current = true;

    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const ticket = params.get("ticket");
    const returnTo = normalizeReturnTo(params.get("returnTo"));

    if (!ticket) {
      queueMicrotask(() => setErrorCode("missing_ticket"));
      return;
    }

    queueMicrotask(() => void exchangeTicket(ticket)
        .then(async (result) => {
          // 成功与否都先把 ticket 从地址栏清掉：刷新页面不应重放
          window.history.replaceState(null, "", window.location.pathname);
          await refresh();
          router.replace(stripLocalePrefix(result.returnTo || returnTo));
        })
        .catch((e) => {
          setErrorCode(e instanceof ApiError ? e.code : "generic");
        }));
  }, [refresh, router]);

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm p-6 text-center sm:p-8">
        {errorCode ? (
          <>
            <h1 className="text-xl font-bold text-text-primary">{t("callbackFailed")}</h1>
            <p
              role="alert"
              className="mt-3 rounded-2xl border-[3px] border-clay-border bg-surface px-3 py-2 text-xs font-semibold text-primary-strong"
            >
              {errorMessage(t, errorCode)}
            </p>
            <button
              type="button"
              onClick={() => router.replace("/login")}
              className="mt-6 inline-flex h-11 items-center justify-center rounded-full border-[3px] border-primary-light bg-primary px-6 text-sm font-semibold text-primary-ink shadow-button transition-colors hover:bg-primary-dark active:translate-y-1 active:shadow-button-pressed"
            >
              {t("backToLogin")}
            </button>
          </>
        ) : (
          <>
            <div className="flex justify-center">
              <Spinner className="h-8 w-8" />
            </div>
            <p className="mt-4 text-sm font-semibold text-text-secondary">
              {t("callbackLoading")}
            </p>
          </>
        )}
      </Card>
    </div>
  );
}

function errorMessage(t: ReturnType<typeof useTranslations>, code: string): string {
  const known = ["invalid_ticket", "missing_ticket", "network_error"];
  const key = known.includes(code) ? `errors.${code}` : "errors.generic";
  return t(key as never);
}
