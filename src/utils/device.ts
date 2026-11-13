/** iPadOS 13+ 的 Safari 默认伪装成 Macintosh，用触点数补判。 */
export function isMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/Android|iPhone|iPad|iPod|Windows Phone|IEMobile|Mobile/i.test(ua)) return true;
  return /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
}

/**
 * 微信内置浏览器：window.open 可能返回一个 truthy 但永不渲染的窗口，
 * 导致既不跳转也不报错。此环境直接同标签导航更可靠。
 */
export function isWechatBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /MicroMessenger/i.test(navigator.userAgent || "");
}
