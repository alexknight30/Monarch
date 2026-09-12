import { NextResponse } from "next/server";
import { resolveApiView } from "@/lib/api-view";
import { listCourses, listPlanner, listArtifacts } from "@/lib/local-db";
import { flatten } from "@/lib/planner";
import { getViewDataset } from "@/lib/views";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ viewId: string }> };

/**
 * Options for the new-task dialog, scoped to the active view/user.
 * Blank views (Alex Knight / Alex Seager) only get what they've created.
 */
export async function GET(_request: Request, context: RouteContext) {
  const { viewId: raw } = await context.params;
  const resolved = await resolveApiView(raw);
  if ("error" in resolved) return resolved.error;

  const { viewId } = resolved;
  const [courses, artifacts, planner] = await Promise.all([
    listCourses(viewId),
    listArtifacts(viewId),
    listPlanner(viewId),
  ]);

  const dataset = getViewDataset(viewId);
  const fromDeadlines = dataset.deadlines.map((d) => d.title.trim()).filter(Boolean);
  const fromPlanner = planner
    .flatMap(flatten)
    .map((issue) => issue.assignment?.trim())
    .filter((value): value is string => Boolean(value));

  const assignments = Array.from(new Set([...fromDeadlines, ...fromPlanner])).sort(
    (a, b) => a.localeCompare(b),
  );

  return NextResponse.json({
    courses: courses.map((c) => c.code),
    artifacts: artifacts.map((a) => a.title),
    assignments,
  });
}
