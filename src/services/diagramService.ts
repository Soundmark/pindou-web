/**
 * 图纸/标签/收藏的 React Query hooks。
 *
 * 后端是 `POST /api/diagram` + `{ action }` 分发（沿用小程序云函数的形状），
 * 所以这里每个 hook 的 queryFn 都是一次 action 调用。
 * 返回值统一归一化成页面既有的 `{ data, pagination }`，页面不接触服务端字段名。
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, getToken } from "@/lib/api-client";
import type {
  DiagramListParams,
  ServerGetResult,
  ServerListResult,
  ServerTagListResult,
} from "@/types/api";
import type { DiagramItem, MyDiagramItem, TagItem } from "@/types/diagram";
import { useAuth } from "@/providers/AuthProvider";
import { toDiagramItem, toMyDiagramItem, toTagItem } from "./normalize";

const DIAGRAM_API = "/api/diagram";
const TAG_API = "/api/tags";

interface DiagramActionBody {
  action: string;
  [key: string]: unknown;
}

function diagramAction<T>(body: DiagramActionBody) {
  return apiFetch<T>(DIAGRAM_API, { method: "POST", body });
}

function tagAction<T>(body: DiagramActionBody) {
  return apiFetch<T>(TAG_API, { method: "POST", body });
}

/**
 * 取图案 ZIP 的短时效签名 URL（浏览器直读 OSS）。
 *
 * 后端 `OSS_DIRECT_READ=false` 时返回 503，调用方应回退服务端代理
 * （`/api/diagram/file`）。签名接口自带按 IP 限流。
 */
export function fetchDiagramFileUrl(fileID: string) {
  return apiFetch<{ success: true; url: string; expiresAt: number }>(
    `/api/diagram/url?key=${encodeURIComponent(fileID)}`,
    { method: "GET" }
  );
}

function toPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

// =============================================================================
// 查询
// =============================================================================

export function useDiagrams(params: DiagramListParams) {
  const { status } = useAuth();
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;

  return useQuery({
    queryKey: ["diagrams", params, status],
    queryFn: async () => {
      const res = await diagramAction<ServerListResult>({
        action: "list",
        page,
        pageSize: limit,
        keyword: params.keyword || undefined,
        tag: params.tag || undefined,
        minSize: params.minSize,
        maxSize: params.maxSize,
        sort: params.sort || "newest",
      });

      let items = res.list.map(toDiagramItem);

      // 收藏状态是独立的批量查询；未登录时不发（服务端本来也会回空）
      if (getToken() && items.length > 0) {
        try {
          const fav = await diagramAction<{ success: true; favoritedIds: string[] }>({
            action: "checkFavorited",
            diagramIds: items.map((d) => d._id),
          });
          const favorited = new Set(fav.favoritedIds || []);
          items = items.map((d) => ({ ...d, isFavorited: favorited.has(d._id) }));
        } catch {
          // 收藏状态拿不到不该让整个列表失败
        }
      }

      return { data: items, pagination: toPagination(page, limit, res.total) };
    },
  });
}

export function useDiagram(id: string) {
  return useQuery({
    queryKey: ["diagram", id],
    queryFn: async () => {
      const res = await diagramAction<ServerGetResult>({ action: "get", _id: id });
      return { data: toDiagramItem(res.item) };
    },
    enabled: !!id,
  });
}

/** 单条图纸的收藏状态（详情页用） */
export function useCheckFavorited(id: string) {
  const { status } = useAuth();
  return useQuery({
    queryKey: ["favorited", id, status],
    queryFn: async () => {
      const res = await diagramAction<{ success: true; favoritedIds: string[] }>({
        action: "checkFavorited",
        diagramIds: [id],
      });
      return Boolean(res.favoritedIds?.includes(id));
    },
    enabled: !!id && status === "authenticated",
  });
}

export function useMyDiagrams() {
  const { status } = useAuth();
  return useQuery({
    queryKey: ["my-diagrams", status],
    queryFn: async () => {
      const res = await diagramAction<ServerListResult>({
        action: "listMy",
        page: 1,
        pageSize: 50,
      });
      const data: MyDiagramItem[] = res.list.map(toMyDiagramItem);
      return { data, total: res.total };
    },
    enabled: status === "authenticated",
  });
}

export function useFavorites() {
  const { status } = useAuth();
  return useQuery({
    queryKey: ["favorites", status],
    queryFn: async () => {
      const res = await diagramAction<ServerListResult>({
        action: "listFavorites",
        page: 1,
        pageSize: 50,
      });
      const data: DiagramItem[] = res.list.map((d) => ({
        ...toDiagramItem(d),
        isFavorited: true,
      }));
      return { data, total: res.total };
    },
    enabled: status === "authenticated",
  });
}

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const res = await tagAction<ServerTagListResult>({ action: "list" });
      const data: TagItem[] = res.list.map(toTagItem);
      return { data };
    },
    // 标签变更很少，但改标签名后列表要立刻刷新 —— 由 admin/tags 的 mutation 主动失效
    staleTime: 60 * 1000,
  });
}

// =============================================================================
// 变更
// =============================================================================

export function useCreateDiagram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      fileID: string;
      thumbnailFileID?: string;
      title: string;
      width: number;
      height: number;
      cellCount: number;
      colorCount: number;
      colorSystem?: string;
      tags?: string[];
    }) => {
      const res = await diagramAction<{ success: true; _id: string }>({
        action: "publish",
        ...input,
      });
      return { id: res._id };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["diagrams"] });
      void qc.invalidateQueries({ queryKey: ["my-diagrams"] });
    },
  });
}

export function useUpdateDiagram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { _id: string; [key: string]: unknown }) => {
      await diagramAction({ action: "update", ...input });
      return input._id;
    },
    onSuccess: (id) => {
      void qc.invalidateQueries({ queryKey: ["diagram", id] });
      void qc.invalidateQueries({ queryKey: ["diagrams"] });
      void qc.invalidateQueries({ queryKey: ["favorites"] });
    },
  });
}

export function useDeleteDiagram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await diagramAction({ action: "delete", _id: id });
      return id;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["diagrams"] });
      void qc.invalidateQueries({ queryKey: ["favorites"] });
      void qc.invalidateQueries({ queryKey: ["my-diagrams"] });
    },
  });
}

export function useSaveMyDiagram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      _id?: string;
      fileID: string;
      thumbnailFileID?: string;
      title: string;
      width: number;
      height: number;
      cellCount: number;
      colorCount: number;
      colorSystem?: string;
    }) => {
      const res = await diagramAction<{ success: true; id: string }>({
        action: "saveMy",
        ...input,
      });
      return { id: res.id };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["my-diagrams"] });
    },
  });
}

export function useDeleteMyDiagram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await diagramAction({ action: "deleteMy", _id: id });
      return id;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["my-diagrams"] });
    },
  });
}

export function useFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await diagramAction({ action: "favorite", diagramId: id });
      return id;
    },
    onSuccess: (_id, id) => {
      void qc.invalidateQueries({ queryKey: ["diagrams"] });
      void qc.invalidateQueries({ queryKey: ["favorites"] });
      void qc.invalidateQueries({ queryKey: ["favorited", id] });
      void qc.invalidateQueries({ queryKey: ["diagram", id] });
    },
  });
}

export function useUnfavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await diagramAction({ action: "unfavorite", diagramId: id });
      return id;
    },
    onSuccess: (_id, id) => {
      void qc.invalidateQueries({ queryKey: ["diagrams"] });
      void qc.invalidateQueries({ queryKey: ["favorites"] });
      void qc.invalidateQueries({ queryKey: ["favorited", id] });
      void qc.invalidateQueries({ queryKey: ["diagram", id] });
    },
  });
}

// =============================================================================
// 标签（仅管理员写）
// =============================================================================

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await tagAction<{ success: true; _id: string }>({ action: "create", name });
      return res._id;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}

export function useUpdateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ _id, name }: { _id: string; name: string }) => {
      await tagAction({ action: "rename", _id, name });
      return _id;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tags"] });
      // 改名会级联改图纸上的标签名
      void qc.invalidateQueries({ queryKey: ["diagrams"] });
    },
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (_id: string) => {
      await tagAction({ action: "delete", _id });
      return _id;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tags"] });
      void qc.invalidateQueries({ queryKey: ["diagrams"] });
    },
  });
}
