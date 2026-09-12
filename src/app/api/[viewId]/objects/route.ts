import { NextResponse } from "next/server";
import { resolveApiView } from "@/lib/api-view";
import { readViewStore } from "@/lib/local-db";
import {
  findTask,
  summarizeArtifact,
  summarizeEvent,
  summarizeTask,
} from "@/lib/objects/summaries";
import { flatten } from "@/lib/planner";
import { isLinkableKind } from "@/lib/objects/types";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ viewId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { viewId: raw } = await context.params;
  const resolved = await resolveApiView(raw);
  if ("error" in resolved) return resolved.error;

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const kind = url.searchParams.get("kind") ?? "";
  const store = await readViewStore(resolved.viewId);

  const artifacts = store.artifacts.map((artifact) =>
    summarizeArtifact(artifact, store.courses),
  );
  const events = store.calendar.map((event) =>
    summarizeEvent(event, store.courses),
  );
  const tasks = store.planner
    .flatMap((issue) => flatten(issue))
    .map((issue) => summarizeTask(issue, store.courses));

  let objects = [...artifacts, ...tasks, ...events];
  if (kind && isLinkableKind(kind)) {
    objects = objects.filter((item) => item.kind === kind);
  }
  if (q) {
    objects = objects.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.courseLabel?.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q),
    );
  }
  return NextResponse.json({ objects: objects.slice(0, 40) });
}
