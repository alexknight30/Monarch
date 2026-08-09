import { NextResponse } from "next/server";
import { resolveApiView } from "@/lib/api-view";
import {
  createSubtask,
  type CreateSubtaskInput,
} from "@/lib/local-db";
import type { PlannerStatus } from "@/lib/planner";

export const runtime = "nodejs";

const STATUSES: PlannerStatus[] = ["in-progress", "todo", "backlog", "done"];

type RouteContext = { params: Promise<{ viewId: string; key: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { viewId: raw, key } = await context.params;
  const resolved = await resolveApiView(raw);
  if ("error" in resolved) return resolved.error;

  let body: CreateSubtaskInput;
  try {
    body = (await request.json()) as CreateSubtaskInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body?.title || typeof body.title !== "string") {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }
  if (body.status && !STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  try {
    const issue = await createSubtask(
      resolved.viewId,
      decodeURIComponent(key),
      body,
    );
    return NextResponse.json({ issue }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create subtask.";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
