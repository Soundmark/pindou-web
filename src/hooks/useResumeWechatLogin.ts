"use client";

/**
 * 手机端直开小程序后，在原页面恢复轮询等待确认。
 *
 * 两条恢复路径：
 *   1. 新标签页打开 URL Link：本页不卸载，登录页拿到 pending 后调 `resume` 立即开轮询。
 *   2. 同标签跳转 / 用户从 H5 中间页返回：挂载时从 sessionStorage 读回 pending。
 *
 * 后台标签页的定时器可能被挂起，`visibilitychange` 回到前台时补查一次。
 */
import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { setToken } from "@/lib/api-client";
import { fetchWechatQrStatus } from "@/lib/auth-client";
import {
  clearPendingWechatLogin,
  readPendingWechatLogin,
  type PendingWechatLogin,
} from "@/lib/wechat-mobile-login";
import { useAuth } from "@/providers/AuthProvider";

const POLL_INTERVAL_MS = 2000;
/** 比后端 ticket TTL 多留 10 秒，兜底轮询卡顿 */
const EXPIRE_SLACK_MS = 10_000;

export function useResumeWechatLogin() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [active, setActive] = useState<PendingWechatLogin | null>(null);

  // 页面刷新 / 从 H5 中间页返回时恢复 pending（不能在 render 里读，避免 hydration 不一致）
  useEffect(() => {
    // 微任务里 setState，避免 effect 同步阶段触发级联渲染（同 AuthProvider 的做法）
    queueMicrotask(() => setActive(readPendingWechatLogin()));
  }, []);

  useEffect(() => {
    if (!active) return;
    const stored = active;
    let cancelled = false;
    let inFlight = false;

    const poll = async () => {
      if (cancelled || inFlight) return;
      inFlight = true;
      try {
        const r = await fetchWechatQrStatus(stored.ticket);
        if (cancelled) return;
        if (r.status === "confirmed" && r.token) {
          cancelled = true;
          clearPendingWechatLogin();
          setToken(r.token);
          await refresh();
          router.replace(stored.returnTo);
          setActive(null);
          return;
        }
        if (r.status === "expired") {
          clearPendingWechatLogin();
          setActive(null);
        }
      } catch {
        // 网络抖动：继续等下一轮，由兜底计时器收尾
      } finally {
        inFlight = false;
      }
    };

    void poll();
    const timer = setInterval(() => void poll(), POLL_INTERVAL_MS);

    // 后台标签页的定时器可能被挂起，回到前台立刻补查一次
    const onVisible = () => {
      if (document.visibilityState === "visible") void poll();
    };
    document.addEventListener("visibilitychange", onVisible);

    const deadline = setTimeout(() => {
      clearPendingWechatLogin();
      setActive(null);
    }, Math.max(0, stored.expiresAt - Date.now()) + EXPIRE_SLACK_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
      clearTimeout(deadline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [active, refresh, router]);

  return {
    pending: active !== null,
    resume: (p: PendingWechatLogin) => setActive(p),
  };
}
