/**
 * 登录相关的客户端动作：OAuth 跳转、ticket 兑换、会话形状转换。
 *
 * 与后端的分工：
 *   - 浏览器只负责把用户送到 `/auth/<provider>/start`；第三方授权与换 token 全在服务端。
 *   - 回调落到前端 `/auth/callback#ticket=...`，ticket 在 fragment 里（不进日志/Referer）。
 *   - 前端 `POST /auth/exchange` 换正式 JWT 并写 localStorage。
 */
import { apiFetch, clearToken, setToken } from "./api-client";
import type {
  AuthProviders,
  AuthUser,
  ExchangeResult,
  OAuthProvider,
  PasswordAuthResult,
  SessionLike,
  WechatQrCreateResult,
  WechatQrEnvVersion,
  WechatQrStatusResult,
} from "@/types/auth";

const MAX_RETURN_TO = 200;

/**
 * 只允许站内相对路径。与后端 `normalizeReturnTo` 保持同一套规则：
 * 拒绝 `//evil.com`、`https://...`、反斜杠、控制字符 —— 任何一条漏掉都是开放重定向。
 */
export function normalizeReturnTo(raw: unknown, fallback = "/"): string {
  if (typeof raw !== "string") return fallback;
  const s = raw.trim();
  if (!s || s.length > MAX_RETURN_TO) return fallback;
  if (!s.startsWith("/")) return fallback;
  if (s.startsWith("//")) return fallback;
  if (/[\\\u0000-\u001f\u007f]/.test(s)) return fallback;
  if (s.includes("://")) return fallback;
  return s;
}

/** 去掉 `/zh`、`/en` 前缀，供 next-intl 的 router 使用（它会自动补 locale） */
export function stripLocalePrefix(path: string): string {
  return path.replace(/^\/(zh|en)(?=\/|$)/i, "") || "/";
}

/** 整页跳转到后端的 OAuth 入口（后端会 302 到第三方授权页） */
export function signIn(provider: OAuthProvider, options: { returnTo?: string } = {}) {
  const returnTo = normalizeReturnTo(options.returnTo);
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim().replace(/\/+$/, "");
  if (!base) throw new Error("NEXT_PUBLIC_API_BASE_URL 未配置");
  window.location.href = `${base}/auth/${provider}/start?returnTo=${encodeURIComponent(returnTo)}`;
}

/** 清本地登录态。页面跳转由调用方决定（不同页面回到不同位置） */
export function signOut() {
  clearToken();
}

export function fetchProviders() {
  return apiFetch<AuthProviders>("/auth/providers", { auth: false });
}

/**
 * 扫码登录第一步：要一张 scene=ticket 的小程序码。
 * 失败抛 ApiError，`code` 为 `not_configured` / `wx_qr_failed` / `rate_limited`。
 * envVersion 仅开发构建的前端会发送（选择器仅开发构建渲染，生产产物编译期消除），
 * 普通用户恒走服务端配置（默认 release）。
 */
export function createWechatQr(envVersion?: WechatQrEnvVersion) {
  return apiFetch<WechatQrCreateResult>("/auth/wechat/qr/create", {
    method: "POST",
    body: envVersion ? { envVersion } : {},
    auth: false,
  });
}

/**
 * 扫码登录轮询。接口恒返回 success:true（pending/confirmed/expired 在 body 里），
 * 不抛业务错误；confirmed 的 token 已在响应里，由调用方 setToken。
 */
export function fetchWechatQrStatus(ticket: string) {
  return apiFetch<WechatQrStatusResult>(
    `/auth/wechat/qr/status?ticket=${encodeURIComponent(ticket)}`,
    { auth: false }
  );
}

export function fetchMe() {
  return apiFetch<AuthUser & { success: true }>("/auth/me");
}

/**
 * 注册本地账号（用户名 + 密码）。成功即登录：后端直接返回 JWT，这里写入 localStorage。
 * 失败抛 ApiError，`code` 为 `invalid_username` / `invalid_nickname` /
 * `invalid_password` / `username_taken` / `rate_limited`。
 */
export async function registerAccount(input: {
  username: string;
  nickname: string;
  password: string;
}): Promise<PasswordAuthResult> {
  const result = await apiFetch<PasswordAuthResult>("/auth/register", {
    method: "POST",
    body: input,
    auth: false,
  });
  setToken(result.token);
  return result;
}

/**
 * 用户名 + 密码登录。失败时 `code` 恒为 `invalid_credentials`
 * （用户不存在与密码错误不可区分，后端刻意如此）。
 */
export async function loginWithPassword(input: {
  username: string;
  password: string;
}): Promise<PasswordAuthResult> {
  const result = await apiFetch<PasswordAuthResult>("/auth/login/password", {
    method: "POST",
    body: input,
    auth: false,
  });
  setToken(result.token);
  return result;
}

/** 用一次性 ticket 换正式 JWT，并写入 localStorage */
export async function exchangeTicket(ticket: string): Promise<ExchangeResult> {
  const result = await apiFetch<ExchangeResult>("/auth/exchange", {
    method: "POST",
    body: { ticket },
    auth: false,
  });
  setToken(result.token);
  return result;
}

/** 把后端用户映射成页面既有的 `session.user` 形状，降低迁移成本 */
export function toSession(user: AuthUser): SessionLike {
  return {
    user: {
      id: user.uid,
      // 空昵称（历史微信用户）不露 uid 长串，用与服务端同一推导的短名兜底
      name: user.nickname || defaultNickname(user.uid),
      image: user.avatarUrl || undefined,
      isAdmin: user.isAdmin,
      platform: user.platform,
    },
  };
}

/** 无昵称用户的确定性显示名；与后端 services/user.js 的 defaultNickname 同一推导 */
export function defaultNickname(uid: string): string {
  return `用户${uid.slice(-4)}`;
}

/** 修改昵称。失败抛 ApiError，`code` 为 `invalid_nickname` / `rate_limited` / `network_error` */
export function updateProfile(input: { nickname: string }) {
  return apiFetch<AuthUser & { success: true }>("/auth/profile", {
    method: "POST",
    body: input,
  });
}
