import { academicMutation } from "@/lib/academic-route";
import { trashArtifact,restoreArtifact,duplicateArtifact } from "@/lib/artifact-lifecycle";
export const runtime="nodejs";
export async function POST(request:Request,context:{params:Promise<{viewId:string;slug:string}>}) {
  const {viewId,slug}=await context.params;
  return academicMutation(request,viewId,async(view,body)=>{
    if(body.action==="trash")return trashArtifact(view,slug);
    if(body.action==="restore")return restoreArtifact(view,slug);
    if(body.action==="duplicate")return duplicateArtifact(view,slug);
    throw new Error("Choose duplicate, trash or restore.");
  },"artifact");
}
