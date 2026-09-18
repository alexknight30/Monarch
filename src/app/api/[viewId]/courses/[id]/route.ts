import { updateCourse, deleteCourse } from "@/lib/academic-store";
import { academicMutation } from "@/lib/academic-route";
export const runtime = "nodejs";
export async function PATCH(request: Request, context: { params: Promise<{ viewId: string; id: string }> }) {
  const { viewId, id } = await context.params;
  return academicMutation(request, viewId, (view, patch) => updateCourse(view, id, patch), "course");
}
export async function DELETE(request: Request, context: { params: Promise<{viewId:string;id:string}> }) {
  const {viewId,id}=await context.params;
  return academicMutation(request,viewId,view=>deleteCourse(view,id),"course");
}
