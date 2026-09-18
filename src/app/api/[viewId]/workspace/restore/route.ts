import { resolveApiView } from "@/lib/api-view";
import { inspectWorkspaceBackup, restoreWorkspaceBackup, backupSummary } from "@/lib/workspace-backup";
export const runtime="nodejs";
type Context={params:Promise<{viewId:string}>};
export async function POST(request:Request,context:Context) {
  const resolved=await resolveApiView((await context.params).viewId);if("error" in resolved)return resolved.error;
  try {
    const form=await request.formData();const file=form.get("file");
    if(!(file instanceof File)||file.size>256*1024*1024)throw new Error("Choose a Monarch full backup up to 256 MB.");
    const bytes=Buffer.from(await file.arrayBuffer());
    if(form.get("action")==="restore") {
      if(form.get("confirmation")!=="REPLACE")throw new Error("Confirm replacing this workspace before restoring.");
      return Response.json({restored:await restoreWorkspaceBackup(resolved.viewId,bytes)});
    }
    return Response.json({preview:backupSummary(await inspectWorkspaceBackup(resolved.viewId,bytes))});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Restore failed."},{status:400});}
}
