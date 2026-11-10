/**
 * 自建后端（Express + MySQL）的 HTTP 客户端。
 *
 * 三条约定决定了这里的实现：
 *   1. 登录态是 `Authorization: Bearer <JWT>`，不存在 Cookie session。
 *   2. 业务响应恒为 HTTP 200 + `{ success: boolean, error?: string }`，
 *      只有鉴权失败才是 401。所以「HTTP 成功」不等于「业务成功」，必须再看 success。
 *   3. 后端地址来自 `NEXT_PUBLIC_API_BASE_URL`（构建期内联），必须显式配置 ——
 *      没配时请求会静默打到 Next 自己的同源 `/api`，表现是 404，极难排查。
 */

export const TOKEN_KEY = "pindou.auth.token";

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 200) {
    super(message || code);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

/** 注册全局 401 处理（AuthProvider 在挂载时注册：清 token + 切未登录态） */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

/** 去掉尾部斜杠；空值时抛错而不是悄悄请求同源 */
export function getApiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL;
  const base = typeof raw === "string" ? raw.trim().replace(/\/+$/, "") : "";
  if (!base) {
    throw new ApiError(
      "missing_api_base",
      "NEXT_PUBLIC_API_BASE_URL 未配置：请在 .env.local（构建时则为 CI 环境变量）里指向自建后端"
    );
  }
  return base;
}

// =============================================================================
// Token 存取（localStorage；SSR 阶段一律视为无 token）
// =============================================================================

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    // 隐私模式/禁用存储时不应让整个应用崩掉
    return null;
  }
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export function clearToken() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

// =============================================================================

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  /** 对象会序列化为 JSON；FormData 原样发送 */
  body?: unknown;
  /** false 时不带 Authorization（登录、公开接口） */
  auth?: boolean;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

/**
 * 请求后端并返回完整响应体（`{success:true, ...}`）。
 * 业务失败抛 ApiError(code) —— 调用方按 code 映射文案，不要匹配 message。
 */
export async function apiFetch<T = Record<string, unknown>>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { method = "GET", body, auth = true, headers = {}, signal } = options;

  const url = `${getApiBase()}${path.startsWith("/") ? path : `/${path}`}`;
  const finalHeaders: Record<string, string> = { Accept: "application/json", ...headers };

  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const token = getToken();
  if (auth && token) finalHeaders.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(url, { method, headers: finalHeaders, body: payload, signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
        throw new ApiError("network_error", "网络请求失败，请检查网络或后端服务");
  }

  // 滑动续期：签发过半的合法 token 会随响应带一枚新 token，静默替换本地凭证。
  // 放在 401 分支之前：中间件先 set 头再 next()，业务非 2xx 的响应也不丢续期。
  const refreshed = res.headers.get("X-Refreshed-Token"); // Fetch 规范：大小写不敏感
  if (refreshed) setToken(refreshed);

  if (res.status === 401) {
    clearToken();
    unauthorizedHandler?.();
    throw new ApiError("unauthorized", "登录状态已失效，请重新登录", 401);
  }

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  const record =
    json && typeof json === "object" ? (json as Record<string, unknown>) : null;

  if (!res.ok) {
    throw new ApiError(
      (record?.error as string) || "http_error",
      (record?.message as string) || `请求失败（HTTP ${res.status}）`,
      res.status
    );
  }

  if (!record || record.success !== true) {
    throw new ApiError(
      (record?.error as string) || "request_failed",
      (record?.message as string) || "请求失败",
      res.status
    );
  }

  return record as T;
}
