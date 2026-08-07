import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function getSession() {
  return await getServerSession(authOptions);
}

export function getUserId(session: Awaited<ReturnType<typeof getSession>>): string | null {
  return (session?.user as any)?.id || null;
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export function badRequest(error: unknown) {
  return NextResponse.json({ error }, { status: 400 });
}

export function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export function ok<T>(data: T) {
  return NextResponse.json({ data });
}

export function created<T>(data: T) {
  return NextResponse.json({ data }, { status: 201 });
}