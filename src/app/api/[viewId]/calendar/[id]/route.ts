import { saveCalendarEvent, deleteCalendarEvent } from "@/lib/academic-store";
import { academicMutation } from "@/lib/academic-route";
export const runtime = "nodejs";
type Context = { params: Promise<{ viewId: string; id: string }> };
export async function PATCH(request: Request, context: Context) {
  const { viewId, id } = await context.params;
  return academicMutation(request, viewId, (view, patch) => saveCalendarEvent(view, id, patch), "event");
}
export async function DELETE(request: Request, context: Context) {
  const { viewId, id } = await context.params;
  return academicMutation(request, viewId, view => deleteCalendarEvent(view, id), "event");
}
