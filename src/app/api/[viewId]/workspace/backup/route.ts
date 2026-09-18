import { resolveApiView } from "@/lib/api-view";
import { exportWorkspaceBackup } from "@/lib/workspace-backup";
export const runtime="nodejs";
type Context={params:Promise<{viewId:string}>};
export async function GET(_request:Request,context:Context) {
  const resolved=await resolveApiView((await context.params).viewId);if("error" in resolved)return resolved.error;
  try {
    const bytes=await exportWorkspaceBackup(resolved.viewId);
    return new Response(new Uint8Array(bytes),{headers:{"Content-Type":"application/gzip","Content-Disposition":`attachment; filename="monarch-${resolved.viewId}-${new Date().toISOString().slice(0,10)}.monarch.gz"`,"Cache-Control":"no-store"}});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Backup failed."},{status:400});}
}
