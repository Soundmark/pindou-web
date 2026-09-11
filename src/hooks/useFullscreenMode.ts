"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// TS 5.0 的 lib.dom 尚无 WakeLock 类型，用本地结构类型描述
// （与 openid-client 的处理方式一致：结构化类型而非依赖升级）
interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
}
type NavigatorWithWakeLock = Navigator & {
  wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
};

/**
 * 全屏模式状态：CSS 覆盖层（页面自行渲染 fixed 容器）+ 机会式原生 Fullscreen API。
 * - 支持原生全屏的浏览器同时进入 document 全屏（手机隐藏地址栏）；
 *   用户以 Esc 退出原生全屏时经 fullscreenchange 同步回覆盖层态。
 * - iPhone Safari 无 requestFullscreen：纯覆盖层 + Esc 键兜底。
 * - active 期间持有屏幕 Wake Lock（拼豆不熄屏），不支持/被拒则静默。
 */
export function useFullscreenMode() {
  const [active, setActive] = useState(false);
  // 环境探测值（不变）：lazy 初始化避免 SSR 报错；不进 DOM，无 hydration 风险
  const [nativeSupported] = useState(
    () =>
      typeof document !== "undefined" &&
      typeof document.documentElement.requestFullscreen === "function"
  );
  const activeRef = useRef(false);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);

  const applyActive = useCallback((next: boolean) => {
    activeRef.current = next;
    setActive(next);
  }, []);

  const acquireWakeLock = useCallback(async () => {
    const nav = navigator as NavigatorWithWakeLock;
    if (!nav.wakeLock) return;
    try {
      if (wakeLockRef.current && !wakeLockRef.current.released) return;
      wakeLockRef.current = await nav.wakeLock.request("screen");
    } catch {
      // 被系统拒绝等：静默跳过，常亮只是增强能力
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    const sentinel = wakeLockRef.current;
    wakeLockRef.current = null;
    if (sentinel && !sentinel.released) void sentinel.release().catch(() => {});
  }, []);

  const enter = useCallback(() => {
    applyActive(true);
    const el = document.documentElement;
    if (typeof el.requestFullscreen === "function") {
      el.requestFullscreen().catch(() => {
        // 被拒（权限/嵌入环境）→ 纯覆盖层照常工作
      });
    }
    void acquireWakeLock();
  }, [applyActive, acquireWakeLock]);

  const exit = useCallback(() => {
    applyActive(false);
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    releaseWakeLock();
  }, [applyActive, releaseWakeLock]);

  const toggle = useCallback(() => {
    if (activeRef.current) exit();
    else enter();
  }, [enter, exit]);

  // 用户以浏览器 Esc 退出原生全屏 → 覆盖层同步关闭
  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement && activeRef.current) {
        applyActive(false);
        releaseWakeLock();
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [applyActive, releaseWakeLock]);

  // 纯覆盖层模式的 Esc 兜底（原生全屏由浏览器 + 上面的监听处理）
  useEffect(() => {
    if (!active) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.fullscreenElement) exit();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, exit]);

  // 覆盖层打开期间锁定页面滚动（与 ui/Modal 同款方式）
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);

  // 切后台后 Wake Lock 被系统自动释放，回前台且仍 active 时重新申请
  useEffect(() => {
    if (!active) return;
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && activeRef.current) {
        void acquireWakeLock();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [active, acquireWakeLock]);

  // active 状态下卸载：释放锁 + 恢复滚动 + 退出原生全屏
  useEffect(
    () => () => {
      if (!activeRef.current) return;
      releaseWakeLock();
      document.body.style.overflow = "";
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    },
    [releaseWakeLock]
  );

  return { active, enter, exit, toggle, nativeSupported };
}
