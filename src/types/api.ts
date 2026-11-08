export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DiagramListParams {
  page?: number;
  limit?: number;
  keyword?: string;
  tag?: string;
  minSize?: number;
  maxSize?: string;
  sort?: "newest" | "popular" | "colors";
}

// =============================================================================
// 自建后端（Express）的原始响应类型。
// 页面不直接消费它们 —— 一律经 `src/services/normalize.ts` 归一成
// `DiagramItem` / `TagItem`，避免服务端字段名泄漏进组件。
// =============================================================================

/** `/api/diagram` 的 `list` / `get` / `listMy` / `listFavorites` 返回的条目 */
export interface ServerDiagram {
  _id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  title: string;
  width: number;
  height: number;
  cellCount: number;
  colorCount: number;
  favoriteCount: number;
  viewCount: number;
  colorSystem: string;
  /** 毫秒时间戳 */
  createdAt: number;
  updatedAt: number | null;
  fileID: string;
  thumbnailFileID: string;
  fileURL: string;
  thumbnailURL: string;
  tags: string[];
  isOwner: boolean;
}

export interface ServerListResult {
  success: true;
  list: ServerDiagram[];
  total: number;
  hasMore: boolean;
}

export interface ServerGetResult {
  success: true;
  item: ServerDiagram;
}

export interface ServerTag {
  _id: string;
  name: string;
  slug: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
  diagramCount: number;
  createdAt: number;
}

export interface ServerTagListResult {
  success: true;
  list: ServerTag[];
}