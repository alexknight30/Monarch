import { NextResponse } from "next/server";
import { resolveApiView } from "@/lib/api-view";
import { listAssignments } from "@/lib/local-db";
import { saveAssignment } from "@/lib/academic-store";
import { academicMutation } from "@/lib/academic-route";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ viewId: string }> };
export async function POST(request: Request, context: RouteContext) {
  return academicMutation(request, (await context.params).viewId, (view, patch) => saveAssignment(view, null, patch), "assignment", 201);
}

export async function GET(_request: Request, context: RouteContext) {
  const { viewId: raw } = await context.params;
  const resolved = await resolveApiView(raw);
  if ("error" in resolved) return resolved.error;

  const assignments = await listAssignments(resolved.viewId);
  return NextResponse.json({ assignments });
}
