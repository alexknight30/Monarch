import { NextResponse } from "next/server";
import { resolveApiView } from "@/lib/api-view";
import {
  createProject,
  listProjects,
  type CreateProjectInput,
} from "@/lib/local-db";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ viewId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { viewId: raw } = await context.params;
  const resolved = await resolveApiView(raw);
  if ("error" in resolved) return resolved.error;

  const projects = await listProjects(resolved.viewId);
  return NextResponse.json({ projects });
}

export async function POST(request: Request, context: RouteContext) {
  const { viewId: raw } = await context.params;
  const resolved = await resolveApiView(raw);
  if ("error" in resolved) return resolved.error;

  let body: CreateProjectInput;
  try {
    body = (await request.json()) as CreateProjectInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body?.title || typeof body.title !== "string") {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  try {
    const project = await createProject(resolved.viewId, body);
    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create project.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
