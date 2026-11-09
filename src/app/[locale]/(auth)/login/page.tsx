"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { fetchProviders, loginWithPassword, normalizeReturnTo, signIn } from "@/lib/auth-client";
import { ApiError } from "@/lib/api-client";
import type { AuthProviders } from "@/types/auth";
import { AuthAlert, AuthField } from "@/components/auth/AuthForm";
import { WechatQrLogin } from "@/components/auth/WechatQrLogin";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginFallback() {
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <Spinner />
    </div>
  );
}

function LoginContent() {
  const router = useRouter();
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const { status, refresh } = useAuth();

  const returnTo = normalizeReturnTo(searchParams.get("returnTo"));
  const oauthError = searchParams.get("oauth_error");

  const [providers, setProviders] = useState<AuthProviders | null>(null);
  const [providersFailed, setProvidersFailed] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  // 已登录直接回去，不要让用户再点一次
  useEffect(() => {
    if (status === "authenticated") router.replace(returnTo);
  }, [status, returnTo, router]);

  useEffect(() => {
    let alive = true;
    fetchProviders()
      .then((p) => {
        if (alive) setProviders(p);
      })
      .catch(() => {
        if (alive) setProvidersFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const wechatEnabled = providers?.wechat ?? false;
  const googleEnabled = providers?.google ?? false;
  const checking = !providers && !providersFailed;

  const errorText = oauthError ? errorMessage(t, oauthError) : null;

  // 账号密码表单不依赖 /auth/providers —— 该接口挂了也必须能登录
  async function onSubmit(event: { preventDefault: () => void }) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await loginWithPassword({ username: username.trim(), password });
      await refresh();
      router.replace(returnTo);
    } catch (e) {
      setFormError(errorMessage(t, e instanceof ApiError ? e.code : "generic"));
      setSubmitting(false);
    }
  }

  const registerHref =
    returnTo === "/" ? "/register" : `/register?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm p-6 text-center sm:p-8">
        <h1 className="text-2xl font-bold text-text-primary">{t("welcome")}</h1>
        <p className="mt-2 text-sm text-text-secondary">{t("subtitle")}</p>

        {(errorText || formError) && (
          <div className="mt-4">
            <AuthAlert>{formError || errorText}</AuthAlert>
          </div>
        )}

        <form className="mt-6 space-y-3" onSubmit={onSubmit} noValidate>
          <AuthField
            id="login-username"
            label={t("username")}
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={20}
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <AuthField
            id="login-password"
            label={t("password")}
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={submitting || !username.trim() || !password}
          >
            {submitting ? t("signingIn") : t("signInAction")}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-text-muted">
          <span aria-hidden className="h-[3px] flex-1 rounded-full bg-clay-border" />
          {t("orDivider")}
          <span aria-hidden className="h-[3px] flex-1 rounded-full bg-clay-border" />
        </div>

        <div className="space-y-3">
          <Button
            className="w-full"
            size="lg"
            disabled={checking || !wechatEnabled}
            onClick={() => {
              // 默认走小程序码扫码弹窗；仅当后端只配了开放平台（无小程序凭据）才走旧跳转
              if (providers?.wechatMode === "oauth") {
                signIn("wechat", { returnTo });
              } else {
                setQrOpen(true);
              }
            }}
            title={!checking && !wechatEnabled ? t("providerUnavailable") : undefined}
          >
            <MessageCircle className="mr-2 h-5 w-5" aria-hidden />
            {t("wechatSignIn")}
          </Button>

          <Button
            className="w-full"
            size="lg"
            variant="secondary"
            disabled={checking || !googleEnabled}
            onClick={() => signIn("google", { returnTo })}
            title={!checking && !googleEnabled ? t("providerUnavailable") : undefined}
          >
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" aria-hidden>
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {t("googleSignIn")}
          </Button>
        </div>

        {providersFailed && (
          <p className="mt-4 text-xs text-text-muted">{t("providersFailed")}</p>
        )}

        <p className="mt-6 text-sm text-text-secondary">
          {t("noAccount")}{" "}
          <Link
            href={registerHref}
            className="min-h-11 px-1 font-semibold text-primary-strong underline-offset-4 hover:underline"
          >
            {t("register")}
          </Link>
        </p>

        <p className="mt-4 text-xs text-text-muted">{t("terms")}</p>
      </Card>

      <Modal open={qrOpen} onClose={() => setQrOpen(false)} title={t("qrTitle")}>
        <WechatQrLogin returnTo={returnTo} />
      </Modal>
    </div>
  );
}

/** 后端返回的错误码 → 文案键；未知码回落通用文案 */
function errorMessage(t: ReturnType<typeof useTranslations>, code: string): string {
  const known = [
    "not_configured",
    "invalid_state",
    "wechat_denied",
    "google_denied",
    "missing_code",
    "wechat_failed",
    "google_failed",
    "invalid_ticket",
    "invalid_credentials",
    "invalid_username",
    "invalid_nickname",
    "invalid_password",
    "username_taken",
    "rate_limited",
    "wx_qr_failed",
    "network_error",
  ];
  const key = known.includes(code) ? `errors.${code}` : "errors.generic";
  return t(key as never);
}
