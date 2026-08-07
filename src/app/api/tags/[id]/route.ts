import { NextRequest } from "next/server";
import dbConnect from "@/lib/db/connect";
import Tag from "@/lib/db/models/Tag";
import { getSession, getUserId, unauthorized, notFound, badRequest, ok } from "@/lib/api-helpers";
import { updateTagSchema } from "@/lib/validations";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  const userId = getUserId(session);
  if (!userId) return unauthorized();

  try {
    await dbConnect();
    const body = await request.json();
    const data = updateTagSchema.parse(body) as any;

    if (data.name) {
      data.slug = data.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    }

    const tag = await Tag.findByIdAndUpdate(id, { $set: data }, { new: true });
    if (!tag) return notFound();
    return ok(tag);
  } catch (error: any) {
    if (error.name === "ZodError") return badRequest(error.errors);
    return badRequest("Internal server error");
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  const userId = getUserId(session);
  if (!userId) return unauthorized();

  try {
    await dbConnect();
    const tag = await Tag.findByIdAndDelete(id);
    if (!tag) return notFound();
    return ok({ deleted: true });
  } catch {
    return badRequest("Invalid ID");
  }
}