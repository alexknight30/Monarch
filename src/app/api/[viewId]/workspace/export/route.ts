import { resolveApiView } from "@/lib/api-view";
import { readViewStore } from "@/lib/local-db";
export const runtime="nodejs";
export async function GET(_request:Request,context:{params:Promise<{viewId:string}>}){
  const resolved=await resolveApiView((await context.params).viewId);if("error" in resolved)return resolved.error;
  const workspace=await readViewStore(resolved.viewId);
  return new Response(JSON.stringify({format:"monarch-workspace-records",version:1,exportedAt:new Date().toISOString(),workspace},null,2),{headers:{"Content-Type":"application/json","Content-Disposition":`attachment; filename="monarch-${resolved.viewId}-records.json"`,"Cache-Control":"no-store"}});
}
