import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Diagram from "@/lib/db/models/Diagram";
import Tag from "@/lib/db/models/Tag";
import { getSession, getUserId, unauthorized, badRequest, created } from "@/lib/api-helpers";
import { listDiagramsSchema, createDiagramSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const params = listDiagramsSchema.parse(Object.fromEntries(searchParams));

    const query: Record<string, unknown> = { isPublic: true };
    if (params.tag) query.tags = params.tag;
    if (params.keyword) {
      query.$or = [
        { name: { $regex: params.keyword, $options: "i" } },
        { description: { $regex: params.keyword, $options: "i" } },
      ];
    }
    if (params.minSize || params.maxSize) {
      query.width = {};
      if (params.minSize) (query.width as Record<string, number>).$gte = params.minSize;
      if (params.maxSize) (query.width as Record<string, number>).$lte = params.maxSize;
    }

    const sort: Record<string, 1 | -1> =
      params.sort === "popular" ? { favoriteCount: -1 } :
      params.sort === "colors" ? { colorCount: -1 } :
      { createdAt: -1 };

    const page = params.page;
    const limit = params.limit;
    const skip = (page - 1) * limit;

    const [diagrams, total] = await Promise.all([
      Diagram.find(query).sort(sort).skip(skip).limit(limit).lean(),
      Diagram.countDocuments(query),
    ]);

    return NextResponse.json({
      data: diagrams,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    if (error.name === "ZodError") return badRequest(error.errors);
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
    const data = createDiagramSchema.parse(body);

    const diagram = await Diagram.create({
      ...data,
      userId,
      userName: session?.user?.name || "Anonymous",
      userAvatar: session?.user?.image,
    });

    if (data.tags?.length) {
      await Tag.updateMany(
        { _id: { $in: data.tags } },
        { $inc: { diagramCount: 1 } }
      );
    }

    return created(diagram);
  } catch (error: any) {
    if (error.name === "ZodError") return badRequest(error.errors);
    console.error("[diagrams POST] failed:", error);
    return badRequest("Internal server error");
  }
}