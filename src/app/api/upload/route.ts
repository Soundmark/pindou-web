import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getSession, getUserId, unauthorized, badRequest, ok } from "@/lib/api-helpers";
import { uploadSchema } from "@/lib/validations";
import { createPresignedUploadUrl, isR2Configured } from "@/lib/r2";

export const runtime = "nodejs";

const ALLOWED_CONTENT_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export async function POST(request: NextRequest) {
  const session = await getSession();
  const userId = getUserId(session);
  if (!userId) return unauthorized();

  if (!isR2Configured()) return badRequest("Upload service is not configured");

  try {
    const { contentType } = uploadSchema.parse(await request.json());
    const ext = ALLOWED_CONTENT_TYPES[contentType];
    if (!ext) return badRequest("Unsupported content type");

    const key = `patterns/${userId}/${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
    const { uploadUrl, publicUrl } = await createPresignedUploadUrl(key, contentType);
    return ok({ uploadUrl, key, publicUrl });
  } catch (error) {
    if (error instanceof z.ZodError) return badRequest(error.issues);
    return badRequest("Upload failed");
  }
}
