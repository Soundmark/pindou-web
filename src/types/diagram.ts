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
  pixels: number[][];
  brand: string;
  tags: string[];
  colorCount: number;
  isPublic: boolean;
  viewCount: number;
  favoriteCount: number;
  createdAt: string;
  updatedAt: string;
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