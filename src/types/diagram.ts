export interface DiagramItem {
  _id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  name: string;
  description?: string;
  imageUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  /** 后端不存像素；详情页按 zipUrl 解析后填充。列表场景恒为 [] */
  pixels: number[][];
  brand: string;
  tags: string[];
  colorCount: number;
  cellCount?: number;
  isPublic: boolean;
  viewCount: number;
  favoriteCount: number;
  createdAt: string;
  updatedAt: string;
  /** OSS 上的 pattern.zip，详情页/编辑器用它还原像素 */
  zipUrl?: string;
  fileID?: string;
  thumbnailFileID?: string;
  isOwner?: boolean;
  isFavorited?: boolean;
}

export interface MyDiagramItem {
  _id: string;
  userId: string;
  name: string;
  imageUrl: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
  pixels: number[][];
  brand: string;
  colorCount: number;
  createdAt: string;
  updatedAt: string;
  zipUrl?: string;
  fileID?: string;
  isOwner?: boolean;
}

export interface TagItem {
  _id: string;
  name: string;
  slug: string;
  color?: string;
  diagramCount: number;
  sortOrder: number;
  isActive: boolean;
}