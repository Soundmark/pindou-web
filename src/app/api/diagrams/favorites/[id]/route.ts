import { NextRequest } from "next/server";
import dbConnect from "@/lib/db/connect";
import Favorite from "@/lib/db/models/Favorite";
import Diagram from "@/lib/db/models/Diagram";
import { getSession, getUserId, unauthorized, badRequest, ok, created } from "@/lib/api-helpers";

export async function GET() {
  const session = await getSession();
  const userId = getUserId(session);
  if (!userId) return unauthorized();

  try {
    await dbConnect();
    const favorites = await Favorite.find({ userId }).sort({ createdAt: -1 }).lean();
    return ok(favorites);
  } catch {
    return badRequest("Internal server error");
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  const userId = getUserId(session);
  if (!userId) return unauthorized();

  try {
    await dbConnect();
    const existing = await Favorite.findOne({ userId, diagramId: id });
    if (existing) return ok(existing);

    const diagram = await Diagram.findById(id);
    if (!diagram) return badRequest("Diagram not found");

    const favorite = await Favorite.create({
      userId,
      diagramId: id,
      diagramSnapshot: {
        name: diagram.name,
        imageUrl: diagram.imageUrl,
        thumbnailUrl: diagram.thumbnailUrl,
        userName: diagram.userName,
        width: diagram.width,
        height: diagram.height,
      },
    });

    await Diagram.findByIdAndUpdate(id, { $inc: { favoriteCount: 1 } });
    return created(favorite);
  } catch {
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
    const result = await Favorite.findOneAndDelete({ userId, diagramId: id });
    if (!result) return badRequest("Not found");

    await Diagram.findByIdAndUpdate(id, { $inc: { favoriteCount: -1 } });
    return ok({ deleted: true });
  } catch {
    return badRequest("Internal server error");
  }
}