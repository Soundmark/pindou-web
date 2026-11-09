"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { ApiError, setToken } from "@/lib/api-client";
import { createWechatQr, fetchWechatQrStatus } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

type QrPhase = "loading" | "ready" | "expired" | "failed";

const POLL_INTERVAL_MS = 2000;
/** 比后端过期时间多留 10 秒，兜底轮询卡顿 */
const EXPIRE_SLACK_SECONDS = 10;

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
  const ticketRef = useRef("");
  const expiresInRef = useRef(300);

  const loadQrcode = useCallback(async () => {
    setPhase("loading");
    try {
      const r = await createWechatQr();
      ticketRef.current = r.ticket;
      expiresInRef.current = r.expiresIn;
      setQrcode(r.qrcode);
      setPhase("ready");
    } catch (e) {
      setFailCode(e instanceof ApiError ? e.code : "generic");
      setPhase("failed");
    }
  }, []);

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
