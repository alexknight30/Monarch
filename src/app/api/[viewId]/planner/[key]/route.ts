import { NextResponse } from "next/server";
import { resolveApiView } from "@/lib/api-view";
import {
  deletePlannerIssue,
  getPlannerIssue,
  updatePlannerIssue,
  type UpdatePlannerIssueInput,
} from "@/lib/local-db";
import type { PlannerLabel, PlannerPriority, PlannerStatus } from "@/lib/planner";

export const runtime = "nodejs";

const STATUSES: PlannerStatus[] = ["in-progress", "todo", "backlog", "done"];
const PRIORITIES: PlannerPriority[] = ["none", "urgent", "high", "medium", "low"];
const LABELS: PlannerLabel[] = [
  "Reading",
  "Problem set",
  "Exam",
  "Writing",
  "Lab",
];

type RouteContext = { params: Promise<{ viewId: string; key: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { viewId: raw, key } = await context.params;
  const resolved = await resolveApiView(raw);
  if ("error" in resolved) return resolved.error;

  const issue = await getPlannerIssue(resolved.viewId, decodeURIComponent(key));
  if (!issue) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }
  return NextResponse.json({ issue });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { viewId: raw, key } = await context.params;
  const resolved = await resolveApiView(raw);
  if ("error" in resolved) return resolved.error;

  let body: UpdatePlannerIssueInput;
  try {
    body = (await request.json()) as UpdatePlannerIssueInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body.status && !STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }
  if (body.priority && !PRIORITIES.includes(body.priority)) {
    return NextResponse.json({ error: "Invalid priority." }, { status: 400 });
  }
  if (body.labels && body.labels.some((l) => !LABELS.includes(l))) {
    return NextResponse.json({ error: "Invalid label." }, { status: 400 });
  }

  try {
    const issue = await updatePlannerIssue(
      resolved.viewId,
      decodeURIComponent(key),
      body,
    );
    return NextResponse.json({ issue });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update task.";
    const status = message === "Task not found." ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { viewId: raw, key } = await context.params;
  const resolved = await resolveApiView(raw);
  if ("error" in resolved) return resolved.error;

  try {
    const issue = await deletePlannerIssue(
      resolved.viewId,
      decodeURIComponent(key),
    );
    return NextResponse.json({ issue });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete task.";
    const status = message === "Task not found." ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
