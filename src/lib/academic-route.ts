import { resolveApiView } from "./api-view";
import type { ViewId } from "./views";
export async function academicMutation(request: Request, viewId: string, run: (view: ViewId, patch: Record<string, unknown>) => Promise<unknown>, key: string, status = 200) {
  const resolved = await resolveApiView(viewId); if ("error" in resolved) return resolved.error;
  try {
    const body = request.method === "DELETE" ? {} : await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid update.");
    return Response.json({ [key]: await run(resolved.viewId, body) }, { status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The change could not be saved.";
    return Response.json({ error: message }, { status: message.endsWith("not found.") ? 404 : 400 });
  }
}
