import { NextRequest } from "next/server";
import dbConnect from "@/lib/db/connect";
import MyDiagram from "@/lib/db/models/MyDiagram";
import { getSession, getUserId, unauthorized, badRequest, ok, created } from "@/lib/api-helpers";
import { saveMyDiagramSchema } from "@/lib/validations";

export async function GET() {
  const session = await getSession();
  const userId = getUserId(session);
  if (!userId) return unauthorized();

  try {
    await dbConnect();
    const diagrams = await MyDiagram.find({ userId }).sort({ createdAt: -1 }).lean();
    return ok(diagrams);
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
    const data = saveMyDiagramSchema.parse(body);

    if (data._id) {
      const existing = await MyDiagram.findOne({ _id: data._id, userId });
      if (existing) {
        const updated = await MyDiagram.findByIdAndUpdate(data._id, data, { new: true });
        return ok(updated);
      }
    }

    const diagram = await MyDiagram.create({ ...data, userId });
    return created(diagram);
  } catch (error: any) {
    if (error.name === "ZodError") return badRequest(error.errors);
    return badRequest("Internal server error");
  }
}