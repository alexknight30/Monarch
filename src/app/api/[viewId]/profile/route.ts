import { resolveApiView } from "@/lib/api-view";
import { readViewStore } from "@/lib/local-db";
import { saveProfile } from "@/lib/workspace-extras";
import { academicMutation } from "@/lib/academic-route";
export const runtime="nodejs";
type Context={params:Promise<{viewId:string}>};
export async function GET(_request:Request,context:Context){const resolved=await resolveApiView((await context.params).viewId);if("error" in resolved)return resolved.error;return Response.json({profile:(await readViewStore(resolved.viewId)).profile});}
export async function PATCH(request:Request,context:Context){return academicMutation(request,(await context.params).viewId,saveProfile,"profile");}
