"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { normalizeReturnTo, registerAccount } from "@/lib/auth-client";
import { ApiError } from "@/lib/api-client";
import { AuthAlert, AuthField } from "@/components/auth/AuthForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

/** 与后端 `LOCAL_AUTH` 保持一致；以后端为准，这里只做即时提示 */
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;
const NICKNAME_MAX = 20;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72;

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterFallback />}>
      <RegisterContent />
    </Suspense>
  );
}

function RegisterFallback() {
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <Spinner />
    </div>
  );
}

function RegisterContent() {
  const router = useRouter();
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const { status, refresh } = useAuth();

  // 默认落在画廊：注册完直接看别人的作品，比停在首页更有内容
  const returnTo = normalizeReturnTo(searchParams.get("returnTo"), "/gallery");

  const [username, setUsername] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace(returnTo);
  }, [status, returnTo, router]);

  async function onSubmit(event: { preventDefault: () => void }) {
    event.preventDefault();
    if (submitting) return;

    const trimmedUsername = username.trim();
    const trimmedNickname = nickname.trim();

    const localError = validate(trimmedUsername, trimmedNickname, password, confirm);
    if (localError) {
      setFormError(localError === "passwordMismatch" ? t("passwordMismatch") : errorMessage(t, localError));
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      // 注册即登录：后端直接返回 JWT，registerAccount 已写入 localStorage
      await registerAccount({
        username: trimmedUsername,
        nickname: trimmedNickname,
        password,
      });
      await refresh();
      router.replace(returnTo);
    } catch (e) {
      setFormError(errorMessage(t, e instanceof ApiError ? e.code : "generic"));
      setSubmitting(false);
    }
  }

  const loginHref =
    returnTo === "/" ? "/login" : `/login?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm p-6 text-center sm:p-8">
        <h1 className="text-2xl font-bold text-text-primary">{t("registerTitle")}</h1>
        <p className="mt-2 text-sm text-text-secondary">{t("registerSubtitle")}</p>

        {formError && (
          <div className="mt-4">
            <AuthAlert>{formError}</AuthAlert>
          </div>
        )}

        <form className="mt-6 space-y-3" onSubmit={onSubmit} noValidate>
          <AuthField
            id="register-username"
            label={t("username")}
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={20}
            required
            hint={t("usernameHint")}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <AuthField
            id="register-nickname"
            label={t("nickname")}
            name="nickname"
            autoComplete="nickname"
            maxLength={NICKNAME_MAX}
            required
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
          <AuthField
            id="register-password"
            label={t("password")}
            type="password"
            name="password"
            autoComplete="new-password"
            required
            hint={t("passwordHint")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <AuthField
            id="register-confirm"
            label={t("confirmPassword")}
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? t("registering") : t("registerAction")}
          </Button>
        </form>

        <p className="mt-6 text-sm text-text-secondary">
          {t("haveAccount")}{" "}
          <Link
            href={loginHref}
            className="min-h-11 px-1 font-semibold text-primary-strong underline-offset-4 hover:underline"
          >
            {t("signInLink")}
          </Link>
        </p>

        {/* 没有邮箱/手机号，也就没有找回密码：必须提前讲清楚 */}
        <p className="mt-4 text-xs text-text-muted">{t("noPasswordRecovery")}</p>
      </Card>
    </div>
  );
}

/** 返回错误码或 null；passwordMismatch 是前端独有的码 */
function validate(
  username: string,
  nickname: string,
  password: string,
  confirm: string
): string | null {
  if (!USERNAME_PATTERN.test(username)) return "invalid_username";
  const nicknameLength = Array.from(nickname).length;
  if (nicknameLength < 1 || nicknameLength > NICKNAME_MAX) return "invalid_nickname";
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) return "invalid_password";
  if (password !== confirm) return "passwordMismatch";
  return null;
}

/** 后端返回的错误码 → 文案键；未知码回落通用文案 */
function errorMessage(t: ReturnType<typeof useTranslations>, code: string): string {
  const known = [
    "invalid_credentials",
    "invalid_username",
    "invalid_nickname",
    "invalid_password",
    "username_taken",
    "rate_limited",
    "network_error",
  ];
  const key = known.includes(code) ? `errors.${code}` : "errors.generic";
  return t(key as never);
}
