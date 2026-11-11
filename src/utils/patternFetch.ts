import { fetchDiagramFileUrl } from "@/services/diagramService";

/**
 * 取图案 ZIP 的字节。
 *
 * 优先向后端要一个短时效签名 URL，让浏览器直读 OSS —— ZIP 的出流量不再占用
 * ECS 带宽。以下任一情况都回退服务端流式代理（`/api/diagram/file`）：
 *   - 后端开关关闭（503 direct_disabled）
 *   - bucket CORS 未开 / 网络异常（fetch 抛错）
 *   - 签名 URL 请求本身失败（未登录、404 等）
 *
 * 两个通道都失败才抛错，由调用方展示「加载失败」。
 */
export async function fetchPatternZip(
  fileID: string | undefined,
  proxyUrl: string
): Promise<ArrayBuffer> {
  if (fileID) {
    try {
      const { url } = await fetchDiagramFileUrl(fileID);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`oss ${res.status}`);
      return await res.arrayBuffer();
    } catch {
      // 直读不可用：静默回退，不影响页面状态
    }
  }

  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error("pattern fetch failed");
  return await res.arrayBuffer();
}
