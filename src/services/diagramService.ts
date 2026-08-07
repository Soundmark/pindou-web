import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { DiagramListParams } from "@/types/api";

const API = "/api/diagrams";

function toSearchParams(params: Record<string, any>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  return sp.toString();
}

export function useDiagrams(params: DiagramListParams) {
  return useQuery({
    queryKey: ["diagrams", params],
    queryFn: () => fetch(`${API}?${toSearchParams(params)}`).then((r) => r.json()),
  });
}

export function useDiagram(id: string) {
  return useQuery({
    queryKey: ["diagram", id],
    queryFn: () => fetch(`${API}/${id}`).then((r) => r.json()),
    enabled: !!id,
  });
}

export function useMyDiagrams() {
  return useQuery({
    queryKey: ["my-diagrams"],
    queryFn: () => fetch(`${API}/my`).then((r) => r.json()),
  });
}

export function useFavorites() {
  return useQuery({
    queryKey: ["favorites"],
    queryFn: () => fetch(`${API}/my`).then((r) => r.json()),
  });
}

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: () => fetch("/api/tags").then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateDiagram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["diagrams"] }); },
  });
}

export function useDeleteDiagram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetch(`${API}/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["diagrams"] }); },
  });
}

export function useSaveMyDiagram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      fetch(`${API}/my`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-diagrams"] }); },
  });
}

export function useDeleteMyDiagram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetch(`${API}/my/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-diagrams"] }); },
  });
}

export function useFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetch(`${API}/favorites/${id}`, { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["favorites"] }); },
  });
}

export function useUnfavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetch(`${API}/favorites/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["favorites"] }); },
  });
}