/**
 * 手机浏览器直开小程序登录：拿 URL Link 后优先新标签页打开，被拦截则同标签跳转。
 *
 * pending 记在 sessionStorage：小程序确认后回到网页时，登录页据此恢复轮询
 * （见 hooks/useResumeWechatLogin）。旧标签页不卸载时，调用方靠返回值立即轮询。
 */
import { createWechatLink } from "@/lib/auth-client";
import { isWechatBrowser } from "@/utils/device";

const PENDING_KEY = "pindou.wechat.pending";

export interface PendingWechatLogin {
  ticket: string;
  returnTo: string;
  /** 与后端 ticket TTL 对齐的本地截止时间（毫秒时间戳） */
  expiresAt: number;
}

/**
 * 打开小程序登录页。返回值在链接拉起成功后立即可用；
 * 失败时关闭空白页并抛出 ApiError，由登录页显示错误。
 */
export async function startWechatMiniProgramLogin(
  returnTo: string
): Promise<PendingWechatLogin> {
  // 微信内置浏览器的 window.open 可能返回不可见窗口（不渲染也不报错），
  // 直接同标签导航；返回后由 sessionStorage + visibilitychange 恢复轮询。
  // 其他浏览器先同步开空白页：点击手势未结束时 window.open 才不会被拦截。
  const popup = isWechatBrowser() ? null : window.open("", "_blank");
  if (popup) popup.opener = null;

  try {
    const r = await createWechatLink();
    const pending: PendingWechatLogin = {
      ticket: r.ticket,
      returnTo,
      expiresAt: Date.now() + r.expiresIn * 1000,
    };
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
    if (popup && !popup.closed) {
      popup.location.replace(r.urlLink);
    } else {
      window.location.href = r.urlLink;
    }
    return pending;
  } catch (e) {
    if (popup && !popup.closed) popup.close();
    throw e;
  }
}

/** 读出仍有效的 pending；解析失败或已过期时顺手清掉。 */
export function readPendingWechatLogin(): PendingWechatLogin | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(PENDING_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<PendingWechatLogin>;
    if (
      typeof parsed.ticket !== "string" ||
      typeof parsed.returnTo !== "string" ||
      typeof parsed.expiresAt !== "number" ||
      parsed.expiresAt <= Date.now()
    ) {
      clearPendingWechatLogin();
      return null;
    }
    return parsed as PendingWechatLogin;
  } catch {
    clearPendingWechatLogin();
    return null;
  }
}

export function clearPendingWechatLogin(): void {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // 隐私模式可能禁用 storage：没有可清理的
  }
}
