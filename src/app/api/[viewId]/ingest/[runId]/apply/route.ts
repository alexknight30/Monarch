import { NextResponse } from "next/server";
import { resolveApiView } from "@/lib/api-view";
import { applyIngestProposal, getIngestRun } from "@/lib/local-db";
import type { Proposal } from "@/lib/source-documents";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ viewId: string; runId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { viewId: raw, runId } = await context.params;
  const resolved = await resolveApiView(raw);
  if ("error" in resolved) return resolved.error;

  const run = await getIngestRun(resolved.viewId, runId);
  if (!run) {
    return NextResponse.json({ error: "Ingest run not found." }, { status: 404 });
  }

  let body: Proposal;
  try {
    body = (await request.json()) as Proposal;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body?.course?.code || !body?.course?.title) {
    return NextResponse.json(
      { error: "Course code and title are required." },
      { status: 400 },
    );
  }

  try {
    const result = await applyIngestProposal(resolved.viewId, {
      ...body,
      runId,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not apply proposal.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
