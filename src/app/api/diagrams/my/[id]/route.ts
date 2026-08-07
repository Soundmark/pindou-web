import { NextRequest } from "next/server";
import dbConnect from "@/lib/db/connect";
import MyDiagram from "@/lib/db/models/MyDiagram";
import { getSession, getUserId, unauthorized, notFound, badRequest, ok } from "@/lib/api-helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  const userId = getUserId(session);
  if (!userId) return unauthorized();

  try {
    await dbConnect();
    const diagram = await MyDiagram.findOne({ _id: id, userId });
    if (!diagram) return notFound();
    return ok(diagram);
  } catch {
    return badRequest("Invalid ID");
  }
}

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
    const diagram = await MyDiagram.findOneAndUpdate(
      { _id: id, userId },
      { $set: body },
      { new: true }
    );
    if (!diagram) return notFound();
    return ok(diagram);
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
    const diagram = await MyDiagram.findOneAndDelete({ _id: id, userId });
    if (!diagram) return notFound();
    return ok({ deleted: true });
  } catch {
    return badRequest("Invalid ID");
  }
}