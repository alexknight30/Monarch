import { NextResponse } from "next/server";
import { resolveApiView } from "@/lib/api-view";
import {
  createPlannerIssue,
  listPlanner,
  type CreatePlannerIssueInput,
} from "@/lib/local-db";
import type { PlannerLabel, PlannerStatus } from "@/lib/planner";
import { createTaskWithSource } from "@/lib/task-source";

export const runtime = "nodejs";

const STATUSES: PlannerStatus[] = ["in-progress", "todo", "backlog", "done"];
const LABELS: PlannerLabel[] = [
  "Reading",
  "Problem set",
  "Exam",
  "Writing",
  "Lab",
];

type RouteContext = { params: Promise<{ viewId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { viewId: raw } = await context.params;
  const resolved = await resolveApiView(raw);
  if ("error" in resolved) return resolved.error;

  const planner = await listPlanner(resolved.viewId);
  return NextResponse.json({ planner });
}

export async function POST(request: Request, context: RouteContext) {
  const { viewId: raw } = await context.params;
  const resolved = await resolveApiView(raw);
  if ("error" in resolved) return resolved.error;

  let body: CreatePlannerIssueInput;
  let file: File | null = null;
  let requestId = "";
  try {
    if(request.headers.get("content-type")?.includes("multipart/form-data")) {
      const form=await request.formData();body=JSON.parse(String(form.get("task")||"null"));
      const uploaded=form.get("file");if(!(uploaded instanceof File))throw new Error("Choose a file.");
      file=uploaded;requestId=String(form.get("requestId")||"");
    }else body = (await request.json()) as CreatePlannerIssueInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body?.title || typeof body.title !== "string") {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  if (body.status && !STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  if (body.label && !LABELS.includes(body.label)) {
    return NextResponse.json({ error: "Invalid label." }, { status: 400 });
  }

  try {
    const issue = file ? await createTaskWithSource(resolved.viewId,body,file,requestId) : await createPlannerIssue(resolved.viewId, body);
    return NextResponse.json({ issue }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create task.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
