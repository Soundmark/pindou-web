/**
 * 社交媒体文案接口。
 *
 * 与图纸/标签一致：后端 `POST /api/ai` + `{ action }` 分发；
 * 管理员校验在服务端，这里只负责取数。
 */
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export interface SocialCopyInput {
  name: string;
  width: number;
  height: number;
  colorCount: number;
  beadCount: number;
  tags: string[];
}

export interface SocialCopyResult {
  success: true;
  title: string;
  content: string;
}

export function useSocialCopy(input: SocialCopyInput, enabled: boolean) {
  return useQuery({
    queryKey: [
      "social-copy",
      input.name,
      input.width,
      input.height,
      input.colorCount,
      input.beadCount,
      input.tags.join("|"),
    ],
    queryFn: () =>
      apiFetch<SocialCopyResult>("/api/ai", {
        method: "POST",
        body: { action: "socialCopy", ...input },
      }),
    enabled,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });
}
