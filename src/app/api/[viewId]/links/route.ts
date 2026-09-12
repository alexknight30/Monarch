import { NextResponse } from "next/server";
import { resolveApiView } from "@/lib/api-view";
import {
  linkObjects,
  listLinks,
  readViewStore,
  unlinkObjects,
} from "@/lib/local-db";
import { findTask, otherEnd, summarizeArtifact, summarizeEvent, summarizeTask } from "@/lib/objects/summaries";
import { isLinkableKind, type ObjectRef } from "@/lib/objects/types";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ viewId: string }> };

function parseRef(value: unknown): ObjectRef | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  if (typeof rec.kind !== "string" || !isLinkableKind(rec.kind)) return null;
  if (typeof rec.id !== "string" || !rec.id.trim()) return null;
  return { kind: rec.kind, id: rec.id.trim() };
}

export async function GET(request: Request, context: RouteContext) {
  const { viewId: raw } = await context.params;
  const resolved = await resolveApiView(raw);
  if ("error" in resolved) return resolved.error;

  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") ?? "";
  const id = url.searchParams.get("id") ?? "";
  const store = await readViewStore(resolved.viewId);
  const links = store.links;

  if (kind && id && isLinkableKind(kind)) {
    const ref: ObjectRef = { kind, id };
    const neighbors = links
      .filter((link) => link.a.id === id || link.b.id === id)
      .map((link) => {
        const other = otherEnd(link, ref);
        if (other.kind === "artifact") {
          const artifact = store.artifacts.find(
            (item) => item.id === other.id || item.slug === other.id,
          );
          if (!artifact) return null;
          return {
            linkId: link.id,
            summary: summarizeArtifact(artifact, store.courses),
          };
        }
        if (other.kind === "event") {
          const event = store.calendar.find((item) => item.id === other.id);
          if (!event) return null;
          return {
            linkId: link.id,
            summary: summarizeEvent(event, store.courses),
          };
        }
        const task = findTask(store.planner, other.id);
        if (!task) return null;
        return {
          linkId: link.id,
          summary: summarizeTask(task, store.courses),
        };
      })
      .filter(Boolean);
    return NextResponse.json({ neighbors });
  }

  return NextResponse.json({ links: await listLinks(resolved.viewId) });
}

export async function POST(request: Request, context: RouteContext) {
  const { viewId: raw } = await context.params;
  const resolved = await resolveApiView(raw);
  if ("error" in resolved) return resolved.error;

  let body: { a?: unknown; b?: unknown };
  try {
    body = (await request.json()) as { a?: unknown; b?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const a = parseRef(body.a);
  const b = parseRef(body.b);
  if (!a || !b) {
    return NextResponse.json({ error: "Both ends of the link are required." }, { status: 400 });
  }
  try {
    const link = await linkObjects(resolved.viewId, a, b);
    return NextResponse.json({ link }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not link." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { viewId: raw } = await context.params;
  const resolved = await resolveApiView(raw);
  if ("error" in resolved) return resolved.error;

  let body: { id?: unknown };
  try {
    body = (await request.json()) as { id?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (typeof body.id !== "string" || !body.id.trim()) {
    return NextResponse.json({ error: "Link id is required." }, { status: 400 });
  }
  await unlinkObjects(resolved.viewId, body.id.trim());
  return NextResponse.json({ ok: true });
}
