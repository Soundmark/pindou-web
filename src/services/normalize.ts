/**
 * 服务端 DTO → 页面模型。
 *
 * 后端沿用了小程序的数据形状（`title` / `fileURL` / 毫秒时间戳），
 * 而现有页面是按旧 Next.js API 的 `name` / `imageUrl` / ISO 字符串写的。
 * 把翻译集中在这里，页面组件就不需要知道后端字段名，后续再换后端只改这一个文件。
 */
import type { DiagramItem, MyDiagramItem, TagItem } from "@/types/diagram";
import type { ServerDiagram, ServerTag } from "@/types/api";
import { getApiBase } from "@/lib/api-client";

/**
 * 图案 ZIP 走后端流式代理，而不是直连 OSS。
 * OSS bucket 没开 CORS，浏览器 fetch 直链会被拦截；后端代理还顺带把草稿
 * 的读取权限收回服务端（草稿仅作者本人可读）。无 fileID 时回退旧直链。
 */
export function patternFileUrl(fileID: string | undefined, fallback: string): string {
  if (!fileID) return fallback;
  return `${getApiBase()}/api/diagram/file?key=${encodeURIComponent(fileID)}`;
}

/** 毫秒时间戳 → ISO 字符串；null/0 兜底为空串 */
function toIso(ms: number | null | undefined): string {
  if (!ms) return "";
  return new Date(Number(ms)).toISOString();
}

export function toDiagramItem(d: ServerDiagram): DiagramItem {
  return {
    _id: d._id,
    userId: d.userId,
    userName: d.userName || "",
    userAvatar: d.userAvatar || undefined,
    name: d.title,
    imageUrl: d.thumbnailURL || d.fileURL || "",
    thumbnailUrl: d.thumbnailURL || "",
    width: d.width,
    height: d.height,
    // 后端不存像素：列表不渲染网格，详情页会单独解析 ZIP
    pixels: [],
    brand: d.colorSystem,
    tags: Array.isArray(d.tags) ? d.tags : [],
    colorCount: d.colorCount,
    cellCount: d.cellCount,
    // 后端没有「私有图纸」概念：能读到就是公开的
    isPublic: true,
    viewCount: d.viewCount,
    favoriteCount: d.favoriteCount,
    createdAt: toIso(d.createdAt),
    updatedAt: toIso(d.updatedAt || d.createdAt),
    zipUrl: patternFileUrl(d.fileID, d.fileURL || ""),
    fileID: d.fileID,
    thumbnailFileID: d.thumbnailFileID,
    isOwner: d.isOwner,
  };
}

/** 我的图纸（草稿）：字段比公共图纸少收藏/浏览，但没有「作者」概念 */
export function toMyDiagramItem(d: ServerDiagram): MyDiagramItem {
  const item = toDiagramItem(d);
  return {
    _id: item._id,
    userId: item.userId,
    name: item.name,
    imageUrl: item.imageUrl,
    thumbnailUrl: item.thumbnailUrl,
    width: item.width,
    height: item.height,
    pixels: item.pixels,
    brand: item.brand,
    colorCount: item.colorCount,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    zipUrl: item.zipUrl,
    fileID: item.fileID,
    isOwner: item.isOwner,
  };
}

export function toTagItem(t: ServerTag): TagItem {
  return {
    _id: t._id,
    name: t.name,
    // 后端只有 name；slug 保留字段是为了兼容按 slug 筛选的旧 UI
    slug: t.slug || t.name,
    color: t.color || "",
    diagramCount: t.diagramCount,
    sortOrder: t.sortOrder,
    isActive: t.isActive,
  };
}
