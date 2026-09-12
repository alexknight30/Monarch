import { NextResponse } from "next/server";
import { resolveApiView } from "@/lib/api-view";
import { listCalendarEvents } from "@/lib/local-db";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ viewId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { viewId: raw } = await context.params;
  const resolved = await resolveApiView(raw);
  if ("error" in resolved) return resolved.error;

  const calendar = await listCalendarEvents(resolved.viewId);
  return NextResponse.json({ calendar });
}
