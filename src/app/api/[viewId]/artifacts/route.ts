import { NextResponse } from "next/server";
import { resolveApiView } from "@/lib/api-view";
import {
  createArtifact,
  listArtifacts,
  type CreateArtifactInput,
} from "@/lib/local-db";
import type { ArtifactKind } from "@/lib/mock-data";
import { ARTIFACT_KINDS } from "@/lib/mock-data";
import { prepareStudyArtifact } from "@/lib/study-artifacts";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ viewId: string }> };

function parseKind(value: unknown): ArtifactKind | undefined {
  if (typeof value === "string" && value === "paper") return "reading";
  if (typeof value === "string" && (ARTIFACT_KINDS as readonly string[]).includes(value)) {
    return value as ArtifactKind;
  }
  return undefined;
}

export async function GET(_request: Request, context: RouteContext) {
  const { viewId: raw } = await context.params;
  const resolved = await resolveApiView(raw);
  if ("error" in resolved) return resolved.error;

  const artifacts = await listArtifacts(resolved.viewId);
  return NextResponse.json({ artifacts });
}

export async function POST(request: Request, context: RouteContext) {
  const { viewId: raw } = await context.params;
  const resolved = await resolveApiView(raw);
  if ("error" in resolved) return resolved.error;

  let body: Omit<CreateArtifactInput, "source"> & { source?: string | CreateArtifactInput["source"]; sourceIds?: string[]; sourceDocumentId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body?.title || typeof body.title !== "string") {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  try {
    const artifact = body.spec ? await createArtifact(resolved.viewId, { ...body, source: typeof body.source === "object" ? body.source : undefined }) : await prepareStudyArtifact(resolved.viewId, {
      ...body, source: typeof body.source === "string" ? body.source : undefined, kind: parseKind(body.kind) || "document",
    }, false);
    return NextResponse.json({ artifact }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create artifact.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
