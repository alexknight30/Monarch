import { NextResponse } from "next/server";
import { resolveApiView } from "@/lib/api-view";
import { listCalendarEvents } from "@/lib/local-db";
import { saveCalendarEvent } from "@/lib/academic-store";
import { academicMutation } from "@/lib/academic-route";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ viewId: string }> };
export async function POST(request: Request, context: RouteContext) {
  return academicMutation(request, (await context.params).viewId, (view, patch) => saveCalendarEvent(view, null, patch), "event", 201);
}

export async function GET(_request: Request, context: RouteContext) {
  const { viewId: raw } = await context.params;
  const resolved = await resolveApiView(raw);
  if ("error" in resolved) return resolved.error;

  const calendar = await listCalendarEvents(resolved.viewId);
  return NextResponse.json({ calendar });
}
