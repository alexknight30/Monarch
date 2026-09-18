import { promises as fs } from "node:fs";
import path from "node:path";
import { readViewStore,createPlannerIssue,createSourceDocument,createArtifactWithContent,linkObjects,uploadsDir,type CreatePlannerIssueInput } from "./local-db";
import { withWorkspaceTransaction,writeWorkspaceCollections } from "./workspace-store";
import { extractSchoolText } from "./import-text";
import { flatten } from "./planner";
import type { ViewId } from "./views";

/** Local file import plus task/artifact/link creation is one record transaction. */
export async function createTaskWithSource(viewId:ViewId,input:CreatePlannerIssueInput,file:File,requestId:string) {
  if(!/^[a-f0-9-]{36}$/.test(requestId))throw new Error("A valid creation request ID is required.");
  if(!file.size||file.size>32*1024*1024)throw new Error("Choose a PDF, DOCX or text file up to 32 MB.");
  const seed=await readViewStore(viewId);
  const existing=seed.planner.flatMap(flatten).find(task=>task.creationRequestId===requestId);
  if(existing)return existing;
  const bytes=Buffer.from(await file.arrayBuffer());
  const text=await extractSchoolText(bytes,file.name,file.type);
  const directory=uploadsDir(viewId);await fs.mkdir(directory,{recursive:true});
  const storedPath=path.join(/*turbopackIgnore: true*/ directory,crypto.randomUUID());
  await fs.writeFile(storedPath,bytes);
  let used=false;
  try {
    return await withWorkspaceTransaction(viewId,seed,async()=>{
      const store=await readViewStore(viewId);
      const prior=store.planner.flatMap(flatten).find(task=>task.creationRequestId===requestId);
      if(prior)return prior;
      const course=store.courses.find(course=>course.id===input.courseId||course.code===input.course||course.slug===input.course);
      const document=await createSourceDocument(viewId,{filename:file.name,mime:file.type||"application/octet-stream",sizeBytes:file.size,storedPath,kind:"reading",status:"extracted",courseSlug:course?.slug});
      const source=await createArtifactWithContent(viewId,{title:file.name,kind:"reading",courseId:course?.id||"unassigned"},{bodyText:text,sourceDocumentId:document.id});
      const issue=await createPlannerIssue(viewId,{...input,...(!input.artifact&&!input.artifactId?{artifactId:source.id,artifact:source.title}:{})});
      issue.creationRequestId=requestId;
      const after=await readViewStore(viewId);
      await writeWorkspaceCollections(viewId,seed,{planner:after.planner.map(task=>task.id===issue.id?issue:task)});
      await linkObjects(viewId,{kind:"task",id:issue.id},{kind:"artifact",id:source.id});
      used=true;return issue;
    });
  }finally{if(!used)await fs.unlink(storedPath).catch(()=>{});}
}
