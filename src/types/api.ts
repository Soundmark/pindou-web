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