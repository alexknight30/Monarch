import { NextResponse } from "next/server";
import { resolveApiView } from "@/lib/api-view";
import { readViewStore } from "@/lib/local-db";

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
  const {courses,artifacts,assignments}=await readViewStore(viewId);

  return NextResponse.json({
    courses: courses.map((c) => c.code),
    artifacts: artifacts.map(a=>({id:a.id,title:a.title,courseId:a.courseId,course:courses.find(c=>c.id===a.courseId)?.code||"Unassigned"})),
    assignments: assignments.map(a=>({id:a.id,title:a.title,courseId:courses.find(c=>c.slug===a.courseSlug)?.id||"unassigned",course:courses.find(c=>c.slug===a.courseSlug)?.code||"Unassigned",dueAt:a.dueAt})),
  });
}
