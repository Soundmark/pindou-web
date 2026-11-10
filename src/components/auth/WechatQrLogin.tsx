"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { ApiError, setToken } from "@/lib/api-client";
import { createWechatQr, fetchWechatQrStatus } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import type { WechatQrEnvVersion } from "@/types/auth";

type QrPhase = "loading" | "ready" | "expired" | "failed";

const POLL_INTERVAL_MS = 2000;
/** 比后端过期时间多留 10 秒，兜底轮询卡顿 */
const EXPIRE_SLACK_SECONDS = 10;

/** 版本选择器选项（仅开发构建渲染） */
const ENV_VERSIONS: Array<{ value: WechatQrEnvVersion; labelKey: string }> = [
  { value: "release", labelKey: "qrEnvRelease" },
  { value: "trial", labelKey: "qrEnvTrial" },
  { value: "develop", labelKey: "qrEnvDevelop" },
];
/**
 * 仅开发构建渲染版本选择器：编译期常量，production 产物中整段被死代码消除，
 * 生产请求 body 恒为 {}，后端按 config 生成正式版码。
 */
const SHOW_ENV_SELECTOR = process.env.NODE_ENV !== "production";

interface WechatQrLoginProps {
  returnTo: string;
}

/**
 * 小程序码扫码登录弹窗主体。
 *
 * 流程：拿码（create）→ 每 2 秒轮询 status → confirmed 时从响应里拿 JWT，
 * 之后走与密码登录完全相同的完成路径（setToken → refresh → 跳回 returnTo）。
 * 网络抖动不中断轮询，由 (expiresIn+10)s 的兜底计时器转入 expired。
 */
export function WechatQrLogin({ returnTo }: WechatQrLoginProps) {
  const t = useTranslations("auth");
  const router = useRouter();
  const { refresh } = useAuth();

  const [phase, setPhase] = useState<QrPhase>("loading");
  const [qrcode, setQrcode] = useState("");
  const [failCode, setFailCode] = useState("generic");
  const [envVersion, setEnvVersion] = useState<WechatQrEnvVersion>("release");
  const ticketRef = useRef("");
  const expiresInRef = useRef(300);
  /** 序号守卫：快速切换版本/双击刷新时丢弃过期 create 响应 */
  const loadSeqRef = useRef(0);

  const loadQrcode = useCallback(async () => {
    const seq = ++loadSeqRef.current;
    setPhase("loading");
    try {
      // 生产构建不传版本参数（body 恒 {}），版本由后端 config 决定；选择器仅开发构建存在
      const r = await createWechatQr(SHOW_ENV_SELECTOR ? envVersion : undefined);
      if (seq !== loadSeqRef.current) return;
      ticketRef.current = r.ticket;
      expiresInRef.current = r.expiresIn;
      setQrcode(r.qrcode);
      setPhase("ready");
    } catch (e) {
      if (seq !== loadSeqRef.current) return;
      setFailCode(e instanceof ApiError ? e.code : "generic");
      setPhase("failed");
    }
  }, [envVersion]);

  useEffect(() => {
    // 微任务里启动，避免 effect 同步阶段 setState 触发级联渲染（同 AuthProvider 的做法）
    queueMicrotask(() => void loadQrcode());
  }, [loadQrcode]);

  // 轮询：只在 ready 阶段跑；刷新二维码（新 ticket）后 interval 随 effect 重建
  useEffect(() => {
    if (phase !== "ready" || !ticketRef.current) return;
    let inFlight = false;
    let cancelled = false;

    const timer = setInterval(async () => {
      if (inFlight || cancelled) return;
      inFlight = true;
      try {
        const r = await fetchWechatQrStatus(ticketRef.current);
        if (cancelled) return;
        if (r.status === "confirmed" && r.token) {
          cancelled = true;
          setToken(r.token);
          await refresh();
          router.replace(returnTo);
          return;
        }
        if (r.status === "expired") setPhase("expired");
      } catch {
        // 网络抖动：继续等下一轮，由兜底计时器收尾
      } finally {
        inFlight = false;
      }
    }, POLL_INTERVAL_MS);

    const deadline = setTimeout(
      () => setPhase("expired"),
      (expiresInRef.current + EXPIRE_SLACK_SECONDS) * 1000
    );
    return () => {
      cancelled = true;
      clearInterval(timer);
      clearTimeout(deadline);
    };
  }, [phase, returnTo, refresh, router]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex h-56 w-56 items-center justify-center rounded-2xl border-[3px] border-clay-border bg-white p-3 shadow-card">
        {phase === "ready" && (
          // 二维码必须白底才能被微信识别；dataURL 直出，用裸 <img>
          <img src={qrcode} alt="" className="h-full w-full" />
        )}
        {phase === "loading" && <Spinner />}
        {phase === "expired" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface/85">
            <Button size="md" onClick={() => void loadQrcode()}>
              {t("qrRefresh")}
            </Button>
          </div>
        )}
        {phase === "failed" && (
          <Button size="md" variant="secondary" onClick={() => void loadQrcode()}>
            {t("qrRefresh")}
          </Button>
        )}
      </div>

      {SHOW_ENV_SELECTOR && (
        // 所有相位下可见：expired/failed 时直接切档即可重新生成，不必先点刷新
        <div role="group" aria-label={t("qrEnvLabel")} className="mt-3 flex items-center gap-2">
          {ENV_VERSIONS.map(({ value, labelKey }) => {
            const active = value === envVersion;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => setEnvVersion(value)}
                className={clsx(
                  "h-11 select-none rounded-full border-[3px] px-3 text-xs font-semibold",
                  "transition-[transform,box-shadow,background-color] duration-150 ease-out active:translate-y-1",
                  active
                    ? "border-primary-light bg-primary text-primary-ink shadow-button hover:bg-primary-dark active:shadow-button-pressed"
                    : "border-clay-border bg-surface text-text-secondary shadow-button-secondary hover:bg-gray-50 active:shadow-button-secondary-pressed"
                )}
              >
                {t(labelKey as never)}
              </button>
            );
          })}
        </div>
      )}

      {phase === "ready" && <p className="mt-3 text-xs text-text-muted">{t("qrScanTip")}</p>}
      {phase === "loading" && <p className="mt-3 text-xs text-text-muted">{t("qrLoading")}</p>}
      {phase === "expired" && (
        <p className="mt-3 text-xs font-semibold text-primary-strong">{t("qrExpired")}</p>
      )}
      {phase === "failed" && (
        <p role="alert" className="mt-3 text-xs font-semibold text-primary-strong">
          {errorMessage(t, failCode)}
        </p>
      )}
    </div>
  );
}

/** 后端返回的错误码 → 文案键；未知码回落通用文案 */
function errorMessage(t: ReturnType<typeof useTranslations>, code: string): string {
  const known = ["not_configured", "wx_qr_failed", "rate_limited", "network_error"];
  const key = known.includes(code) ? `errors.${code}` : "errors.generic";
  return t(key as never);
}
