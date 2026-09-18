import { NextResponse } from "next/server";
import { resolveApiView } from "@/lib/api-view";
import {
  getArtifact,
  patchArtifact,
} from "@/lib/local-db";
import { normalizeDiagramSpec } from "@/lib/diagram";
import { isWhiteboardDocument } from "@/lib/whiteboard";
import { ArtifactConflict } from "@/lib/artifact-conflict";

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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid update.");
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const existing = await getArtifact(resolved.viewId, slug);
  if (!existing) {
    return NextResponse.json({ error: "Artifact not found." }, { status: 404 });
  }

  try {
    const fields: Record<string, string[]> = {
      diagram: ["spec", "snapshot", "whiteboard"], document: ["bodyHtml", "shortTitle", "savedAt", "thread", "status", "comments"],
      notes: ["bodyHtml", "shortTitle", "savedAt", "thread", "status", "comments"], reading: ["bodyText", "bodyHtml", "annotations", "sourceDocumentId"],
      flashcards: ["cards", "study"], "practice-test": ["items", "attempts"], lesson: ["blocks", "progress"], slides: ["slides", "theme"],
    };
    const allowed = new Set(["title", "description", "courseId", "tagIds", "instructions", ...fields[existing.kind]]);
    const patch = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.has(key)));
    if (patch.title !== undefined && (typeof patch.title !== "string" || !patch.title.trim())) throw new Error("A title is required.");
    for (const key of ["cards", "items", "blocks", "slides", "annotations", "tagIds", "thread", "comments", "attempts"]) {
      if (patch[key] !== undefined && !Array.isArray(patch[key])) throw new Error(`Invalid ${key}.`);
    }
    if (patch.spec !== undefined && !normalizeDiagramSpec(patch.spec)) throw new Error("Invalid diagram.");
    if (patch.whiteboard !== undefined && !isWhiteboardDocument(patch.whiteboard)) throw new Error("Invalid whiteboard document.");
    if (patch.snapshot !== undefined && (!patch.snapshot || typeof patch.snapshot !== "object" || !("store" in patch.snapshot) || !("schema" in patch.snapshot))) throw new Error("Invalid whiteboard snapshot.");
    if(body._base!==undefined&&(!body._base||typeof body._base!=="object"||Array.isArray(body._base)))throw new Error("Invalid save comparison.");
    const artifact = await patchArtifact(resolved.viewId, slug, patch, body._base as Record<string,unknown>|undefined);
    return NextResponse.json({ artifact });
  } catch (err) {
    if(err instanceof ArtifactConflict)return NextResponse.json({error:err.message,artifact:err.artifact,conflictingFields:err.fields},{status:409});
    const message =
      err instanceof Error ? err.message : "Failed to update artifact.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
