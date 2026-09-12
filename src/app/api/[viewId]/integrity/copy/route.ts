import { NextResponse } from "next/server";
import { resolveApiView } from "@/lib/api-view";
import { recordCopyFlag } from "@/lib/local-db";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ viewId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { viewId: raw } = await context.params;
  const resolved = await resolveApiView(raw);
  if ("error" in resolved) return resolved.error;

  let body: { turn?: unknown; source?: unknown };
  try {
    body = (await request.json()) as { turn?: unknown; source?: unknown };
  } catch {
    body = {};
  }

  const source =
    body.source === "document-paste" ? "document-paste" : "chat";
  const turn = typeof body.turn === "string" ? body.turn.slice(0, 200) : undefined;
  const memory = await recordCopyFlag(resolved.viewId, { source, turn });
  return NextResponse.json({ ok: true, flagged: memory.copyFlags[0] });
}
