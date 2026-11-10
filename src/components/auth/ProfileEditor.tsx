"use client";

/**
 * 编辑昵称弹窗（Header 用户名点击打开）。
 *
 * 与注册页同一套校验规则（1–20 个 Unicode 码点，前后端同规则）；
 * 保存成功后经 AuthProvider.refresh 重拉 /auth/me，Header 名字同帧更新。
 * 会话在保存期间被 401 清掉时，`open && !user` 守卫会自动收起弹窗。
 */
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/providers/AuthProvider";
import { ApiError } from "@/lib/api-client";
import { updateProfile } from "@/lib/auth-client";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { AuthAlert, AuthField } from "@/components/auth/AuthForm";

interface ProfileEditorProps {
  open: boolean;
  onClose: () => void;
}

/** 与后端 LOCAL_AUTH.nicknameMin/Max 对齐（services/routes 的注册校验同一份） */
const NICKNAME_MIN = 1;
const NICKNAME_MAX = 20;

export function ProfileEditor({ open, onClose }: ProfileEditorProps) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const { user, refresh } = useAuth();

  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // 打开时以当前值初始化，并清掉上次的错误
  // 打开时以当前值初始化，并清掉上次的错误
  // （微任务里启动，避免 effect 同步 setState 触发级联渲染 —— 同 AuthProvider 惯例）
  useEffect(() => {
    if (open) {
      queueMicrotask(() => {
        setNickname(user?.nickname ?? "");
        setError(null);
      });
    }
  }, [open, user?.nickname]);

  // 会话被 401 清掉（token 失效等）时自动收起
  useEffect(() => {
    if (open && !user) onClose();
  }, [open, user, onClose]);

  const trimmed = nickname.trim();
  const unchanged = trimmed === (user?.nickname ?? "");

  async function handleSave(event: { preventDefault: () => void }) {
    event.preventDefault();
    if (saving) return;
    // 与注册页同规则：按 Unicode 码点计数（中文/emoji 各算 1）
    const nicknameLength = Array.from(trimmed).length;
    if (nicknameLength < NICKNAME_MIN || nicknameLength > NICKNAME_MAX) {
      setError(t("errors.invalid_nickname"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateProfile({ nickname: trimmed });
      await refresh();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? errorMessage(t, err.code) : t("errors.generic"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!saving) onClose();
      }}
      title={t("profileTitle")}
    >
      <form onSubmit={handleSave} className="flex flex-col gap-3" noValidate>
        {error && <AuthAlert>{error}</AuthAlert>}
        <AuthField
          id="profile-nickname"
          label={t("nickname")}
          name="nickname"
          autoComplete="nickname"
          maxLength={NICKNAME_MAX}
          required
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          disabled={saving}
        />
        <Button type="submit" className="w-full" disabled={saving || unchanged}>
          {saving ? t("profileSaving") : tc("save")}
        </Button>
      </form>
    </Modal>
  );
}

/** 后端返回的错误码 → 文案键；未知码回落通用文案 */
function errorMessage(t: ReturnType<typeof useTranslations>, code: string): string {
  const known = ["invalid_nickname", "rate_limited", "network_error"];
  const key = known.includes(code) ? `errors.${code}` : "errors.generic";
  return t(key as never);
}
