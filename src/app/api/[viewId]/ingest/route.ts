import { withUsageRequest } from "@/lib/usage-route";
import { NextResponse } from "next/server";
import { resolveApiView } from "@/lib/api-view";
import { anthropicErrorMessage } from "@/lib/syllabus/anthropic";
import { runSyllabusIngest } from "@/lib/syllabus/orchestrator";

export const runtime = "nodejs";
export const maxDuration = 300;

type RouteContext = { params: Promise<{ viewId: string }> };

async function handlePOST(request: Request, context: RouteContext) {
  const { viewId: raw } = await context.params;
  const resolved = await resolveApiView(raw);
  if ("error" in resolved) return resolved.error;

  let body: { documentId?: string };
  try {
    body = (await request.json()) as { documentId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body?.documentId || typeof body.documentId !== "string") {
    return NextResponse.json({ error: "documentId is required." }, { status: 400 });
  }

  try {
    const proposal = await runSyllabusIngest(resolved.viewId, body.documentId,request.signal);
    return NextResponse.json({ proposal });
  } catch (err) {
    return NextResponse.json(
      { error: anthropicErrorMessage(err) || "Ingest failed." },
      { status: 400 },
    );
  }
}

export const POST = withUsageRequest("setup", handlePOST);
