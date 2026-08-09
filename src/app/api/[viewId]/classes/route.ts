import { NextResponse } from "next/server";
import { resolveApiView } from "@/lib/api-view";
import {
  createClass,
  listClasses,
  type CreateClassInput,
} from "@/lib/local-db";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ viewId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { viewId: raw } = await context.params;
  const resolved = await resolveApiView(raw);
  if ("error" in resolved) return resolved.error;

  const classes = await listClasses(resolved.viewId);
  return NextResponse.json({ classes });
}

export async function POST(request: Request, context: RouteContext) {
  const { viewId: raw } = await context.params;
  const resolved = await resolveApiView(raw);
  if ("error" in resolved) return resolved.error;

  let body: CreateClassInput;
  try {
    body = (await request.json()) as CreateClassInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body?.code || typeof body.code !== "string") {
    return NextResponse.json({ error: "Code is required." }, { status: 400 });
  }
  if (!body?.title || typeof body.title !== "string") {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  try {
    const course = await createClass(resolved.viewId, body);
    return NextResponse.json({ class: course }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to join class.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
