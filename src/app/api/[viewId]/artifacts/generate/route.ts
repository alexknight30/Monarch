import { withUsageRequest } from "@/lib/usage-route";
import { resolveApiView } from "@/lib/api-view";
import { prepareStudyArtifact } from "@/lib/study-artifacts";
import { isArtifactKind } from "@/lib/mock-data";
export const runtime = "nodejs";
async function handlePOST(request: Request, context: { params: Promise<{ viewId: string }> }) {
  const resolved = await resolveApiView((await context.params).viewId);
  if ("error" in resolved) return resolved.error;
  try {
    const body = await request.json();
    if (typeof body.title !== "string" || !body.title.trim() || typeof body.kind !== "string" || !isArtifactKind(body.kind)) throw new Error("Choose a type and a title.");
    const artifact = await prepareStudyArtifact(resolved.viewId, body, true, request.signal);
    return Response.json({ artifact }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Could not prepare the study material." }, { status: 400 }); }
}

export const POST = withUsageRequest("special", handlePOST);
