import { NextRequest } from "next/server";
import dbConnect from "@/lib/db/connect";
import Diagram from "@/lib/db/models/Diagram";
import Tag from "@/lib/db/models/Tag";
import { getSession, getUserId, unauthorized, notFound, badRequest, ok } from "@/lib/api-helpers";
import { updateDiagramSchema } from "@/lib/validations";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await dbConnect();
    const diagram = await Diagram.findById(id);
    if (!diagram) return notFound();

    await Diagram.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });
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
    const diagram = await Diagram.findById(id);
    if (!diagram) return notFound();
    if (diagram.userId !== userId) {
      const { unauthorized } = await import("@/lib/api-helpers");
      return unauthorized();
    }

    const body = await request.json();
    const data = updateDiagramSchema.parse(body);
    const updated = await Diagram.findByIdAndUpdate(id, data, { new: true });
    return ok(updated);
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
    const diagram = await Diagram.findById(id);
    if (!diagram) return notFound();
    if (diagram.userId !== userId) return unauthorized();

    const { tags } = diagram;
    await Diagram.findByIdAndDelete(id);

    if (tags?.length) {
      await Tag.updateMany(
        { _id: { $in: tags } },
        { $inc: { diagramCount: -1 } }
      );
    }

    return ok({ deleted: true });
  } catch {
    return badRequest("Invalid ID");
  }
}