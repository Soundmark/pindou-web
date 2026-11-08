/**
 * 阿里云 OSS PostObject 直传（浏览器 → OSS，字节不经过后端）。
 *
 * 四个必须踩对的细节（任一错都会让上传静默失败）：
 *   1. `file` 必须是**最后一个**表单域；
 *   2. 不要手动设置 `Content-Type: multipart/form-data`（浏览器要自己带 boundary）；
 *   3. 必带 `success_action_status=200`，否则 OSS 回 204，前端判定失败；
 *   4. 用 STS 临时凭据时必带 `x-oss-security-token`。
 */
import { apiFetch } from "./api-client";

export interface UploadPolicy {
  success: true;
  key: string;
  /** 表单 POST 目标（OSS 自定义域名） */
  host: string;
  policy: string;
  signature: string;
  accessKeyId: string;
  /** 仅 STS 临时凭据时出现 */
  securityToken?: string;
  expire: number;
  /** 公网读取地址，可直接存进图纸记录 */
  url: string;
}

export interface UploadResult {
  key: string;
  url: string;
}

/**
 * @param file   要上传的文件（ZIP / PNG）
 * @param prefix OSS 路径前缀：图纸用 `diagrams`，临时图用服务端允许的其它前缀
 */
export async function uploadToOss(file: File | Blob, prefix: string): Promise<UploadResult> {
  const ext = guessExt(file);
  const policy = await apiFetch<UploadPolicy>("/storage/policy", {
    method: "POST",
    body: { prefix, ext },
  });

  const form = new FormData();
  form.append("key", policy.key);
  form.append("policy", policy.policy);
  form.append("OSSAccessKeyId", policy.accessKeyId);
  form.append("signature", policy.signature);
  form.append("success_action_status", "200");
  if (policy.securityToken) form.append("x-oss-security-token", policy.securityToken);
  if (file.type) form.append("Content-Type", file.type);
  // file 必须最后 append
  form.append("file", file);

  let res: Response;
  try {
    res = await fetch(policy.host, { method: "POST", body: form });
  } catch {
    throw new Error("upload_failed");
  }
  if (!res.ok) throw new Error("upload_failed");

  return { key: policy.key, url: policy.url };
}

function guessExt(file: File | Blob): string {
  if (file.type === "application/zip") return "zip";
  if (file.type === "image/png") return "png";
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/webp") return "webp";

  // Blob 的 type 可能为空：按 File 名兜底
  const name = typeof (file as File).name === "string" ? (file as File).name : "";
  const fromName = /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase();
  if (fromName && ["zip", "png", "jpg", "jpeg", "webp"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }
  throw new Error("unsupported_file_type");
}

/** 把 canvas/Blob 转成带文件名的 File，保证 OSS 内容类型与扩展名一致 */
export function toFile(blob: Blob, filename: string, type?: string): File {
  return new File([blob], filename, { type: type || blob.type || "application/octet-stream" });
}
