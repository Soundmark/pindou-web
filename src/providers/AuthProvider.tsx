"use client";

/**
 * 登录态的唯一来源。
 *
 * 没有 Cookie session：启动时若有 localStorage token，就调 `/auth/me` 校验并取最新资料。
 * 任何请求 401 时 `api-client` 会清 token 并回调这里，界面统一切回未登录。
 *
 * 对外提供两套 API：
 *   `useAuth()`    —— 新代码用它，拿到完整的 `AuthUser`
 *   `useSession()` —— 兼容旧页面，形状对齐 next-auth 的 `{ data: { user }, status }`
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError, getToken, setUnauthorizedHandler } from "@/lib/api-client";
import { fetchMe, signOut as clearAuthToken, toSession } from "@/lib/auth-client";
import type { AuthUser, SessionLike } from "@/types/auth";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: AuthUser | null;
  session: SessionLike | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  /** 重新校验 token 并拉最新用户资料（登录回调后调用） */
  refresh: () => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const reset = useCallback(() => {
    setUser(null);
    setStatus("unauthenticated");
    queryClient.clear();
  }, [queryClient]);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setStatus("unauthenticated");
      return;
    }
    try {
      const me = await fetchMe();
      setUser(me);
      setStatus("authenticated");
    } catch (e) {
      if (e instanceof ApiError && e.code === "unauthorized") {
        // api-client 已清 token
        reset();
        return;
      }
      // 网络/后端不可用：保留 token，下次挂载或手动 refresh 再试，但界面按未登录处理
      setUser(null);
      setStatus("unauthenticated");
    }
  }, [reset]);

  useEffect(() => {
    setUnauthorizedHandler(reset);
    return () => setUnauthorizedHandler(null);
  }, [reset]);

  useEffect(() => {
    // 微任务里启动，避免 effect 同步阶段 setState 触发级联渲染警告
    queueMicrotask(() => void refresh());
  }, [refresh]);

  const signOut = useCallback(() => {
    clearAuthToken();
    reset();
  }, [reset]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session: user ? toSession(user) : null,
      status,
      isAuthenticated: status === "authenticated",
      refresh,
      signOut,
    }),
    [user, status, refresh, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth 必须在 <AuthProvider> 内使用");
  return ctx;
}

/** 兼容层：旧页面沿用 `const { data: session, status } = useSession()` */
export function useSession() {
  const { session, status } = useAuth();
  return { data: session, status };
}
