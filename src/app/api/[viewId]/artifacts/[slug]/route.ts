import { NextResponse } from "next/server";
import { resolveApiView } from "@/lib/api-view";
import {
  getArtifact,
  patchArtifact,
  updateDiagramArtifact,
  updateDocumentArtifact,
  type UpdateDocumentArtifactInput,
} from "@/lib/local-db";
import { isDiagramArtifact, isTextArtifact } from "@/lib/mock-data";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ viewId: string; slug: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { viewId: raw, slug } = await context.params;
  const resolved = await resolveApiView(raw);
  if ("error" in resolved) return resolved.error;

  const artifact = await getArtifact(resolved.viewId, slug);
  if (!artifact) {
    return NextResponse.json({ error: "Artifact not found." }, { status: 404 });
  }
  return NextResponse.json({ artifact });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { viewId: raw, slug } = await context.params;
  const resolved = await resolveApiView(raw);
  if ("error" in resolved) return resolved.error;

  let body: UpdateDocumentArtifactInput & { spec?: unknown };
  try {
    body = (await request.json()) as UpdateDocumentArtifactInput & {
      spec?: unknown;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const existing = await getArtifact(resolved.viewId, slug);
  if (!existing) {
    return NextResponse.json({ error: "Artifact not found." }, { status: 404 });
  }

  if (isDiagramArtifact(existing)) {
    if (body.spec === undefined) {
      return NextResponse.json(
        { error: "A diagram update needs a spec." },
        { status: 400 },
      );
    }
    try {
      const artifact = await updateDiagramArtifact(resolved.viewId, slug, {
        spec: body.spec,
      });
      return NextResponse.json({ artifact });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update artifact.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  if (!isTextArtifact(existing) && existing.kind !== "reading" && existing.kind !== "flashcards" && existing.kind !== "practice-test" && existing.kind !== "lesson" && existing.kind !== "slides") {
    return NextResponse.json(
      { error: "This artifact kind cannot be updated this way." },
      { status: 400 },
    );
  }

  try {
    if (isTextArtifact(existing)) {
      const artifact = await updateDocumentArtifact(resolved.viewId, slug, {
        ...body,
        savedAt: body.savedAt ?? "Saved just now",
      });
      return NextResponse.json({ artifact });
    }
    const artifact = await patchArtifact(resolved.viewId, slug, body as Record<string, unknown>);
    return NextResponse.json({ artifact });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update artifact.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
