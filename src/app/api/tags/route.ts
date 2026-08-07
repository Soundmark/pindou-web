import { NextRequest } from "next/server";
import dbConnect from "@/lib/db/connect";
import Tag from "@/lib/db/models/Tag";
import { getSession, getUserId, unauthorized, badRequest, ok, created } from "@/lib/api-helpers";
import { createTagSchema } from "@/lib/validations";

export async function GET() {
  try {
    await dbConnect();
    const tags = await Tag.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean();
    return ok(tags);
  } catch {
    return badRequest("Internal server error");
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  const userId = getUserId(session);
  if (!userId) return unauthorized();

  try {
    await dbConnect();
    const body = await request.json();
    const data = createTagSchema.parse(body);
    const slug = data.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    const existing = await Tag.findOne({ slug });
    if (existing) return badRequest("Tag already exists");

    const tag = await Tag.create({ ...data, slug });
    return created(tag);
  } catch (error: any) {
    if (error.name === "ZodError") return badRequest(error.errors);
    return badRequest("Internal server error");
  }
}