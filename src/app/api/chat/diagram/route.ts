import { withUsageRequest } from "@/lib/usage-route";
/**
 * Re-render an existing diagram at a different depth.
 *
 * Backs the "Add a level of detail" / "Make it simpler" control. The current
 * spec travels with the request and is fed back to the model, so expanding
 * keeps the root and branches already on screen instead of inventing a second,
 * unrelated diagram.
 */

import { xaiToolResult } from "@/lib/harness/xai";
import { NextResponse } from "next/server";
import { normalizeDiagramSpec, type DiagramDetail } from "@/lib/diagram";
import {
  DIAGRAM_TOOL,
  buildDiagramDetailMessage,
} from "@/lib/diagram-tool";
import { ACADEMIC_GUARDRAILS_SYSTEM } from "@/lib/guardrails";

export const runtime = "nodejs";

const MAX_SOURCE_LENGTH = 4000;

type DiagramDetailBody = {
  spec?: unknown;
  detail?: unknown;
  /** The prose the diagram came from, for grounding. Optional. */
  source?: unknown;
};

async function handlePOST(request: Request) {
  let body: DiagramDetailBody;
  try {
    body = (await request.json()) as DiagramDetailBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const spec = normalizeDiagramSpec(body.spec);
  if (!spec) {
    return NextResponse.json(
      { error: "No diagram to redraw." },
      { status: 400 },
    );
  }

  const detail: DiagramDetail = body.detail === 2 || body.detail === "2" ? 2 : 1;
  if (detail === spec.detail) {
    // Nothing to do — hand back what we already have rather than spending a call.
    return NextResponse.json({ spec });
  }

  const source =
    typeof body.source === "string"
      ? body.source.trim().slice(0, MAX_SOURCE_LENGTH)
      : undefined;

  try {
    const result = await xaiToolResult(ACADEMIC_GUARDRAILS_SYSTEM,
      [{ role: "user", content: buildDiagramDetailMessage({ spec, detail, source }) }], DIAGRAM_TOOL, request.signal);

    // Force the requested depth: the caller's intent is the truth, not whatever
    // `detail` the model happened to echo back.
    const next = normalizeDiagramSpec(result, { detail });
    if (!next) {
      return NextResponse.json(
        { error: "Could not redraw that diagram." },
        { status: 502 },
      );
    }

    return NextResponse.json({ spec: next });
  } catch (error) {
    console.error("[api/chat/diagram]", error);
    const message =
      error instanceof Error ? error.message : "Failed to reach Claude.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export const POST = withUsageRequest("special", handlePOST);
