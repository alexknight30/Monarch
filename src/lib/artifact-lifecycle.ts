import { readViewStore, createArtifactWithContent, linkObjects, type ViewStore } from "./local-db";
import { withWorkspaceTransaction, writeWorkspaceCollections } from "./workspace-store";
import { normalizeArtifacts } from "./objects/normalize";
import type { ObjectLink, ObjectRef } from "./objects";
import type { Artifact } from "./mock-data";
import { flatten, type PlannerIssue } from "./planner";
import type { ViewId } from "./views";

export type TrashedArtifact = {artifact:Artifact;deletedAt:string;links:ObjectLink[];taskIds:string[]};
const references=(link:ObjectLink,id:string)=>(link.a.kind==="artifact"&&link.a.id===id)||(link.b.kind==="artifact"&&link.b.id===id);
function mapTasks(tasks:PlannerIssue[],update:(task:PlannerIssue)=>PlannerIssue):PlannerIssue[] {return tasks.map(task=>update({...task,...(task.children?{children:mapTasks(task.children,update)}:{})}));}
function exists(store:ViewStore,ref:ObjectRef) {return ref.kind==="artifact"?store.artifacts.some(a=>a.id===ref.id):ref.kind==="event"?store.calendar.some(e=>e.id===ref.id):store.planner.flatMap(flatten).some(t=>t.id===ref.id||t.key===ref.id);}

export async function trashArtifact(viewId:ViewId,id:string) {
  const seed=await readViewStore(viewId);
  return withWorkspaceTransaction(viewId,seed,async()=>{
    const store=await readViewStore(viewId);
    const artifact=store.artifacts.find(a=>a.id===id||a.slug===id);
    if(!artifact)throw new Error("Artifact not found.");
    const links=[...new Map([...store.links,...store.trash.flatMap(item=>item.links)].filter(link=>references(link,artifact.id)).map(link=>[link.id,link])).values()];
    const taskIds:string[]=[];
    store.planner=mapTasks(store.planner,task=>{
      if(task.artifactId!==artifact.id&&!(task.artifactId===undefined&&(task.artifact===artifact.title||task.artifact===artifact.slug)))return task;
      taskIds.push(task.id||task.key);const next={...task};delete next.artifact;delete next.artifactId;return next;
    });
    store.artifacts=store.artifacts.filter(a=>a.id!==artifact.id);
    store.links=store.links.filter(link=>!references(link,artifact.id));
    store.trash.unshift({artifact,deletedAt:new Date().toISOString(),links,taskIds});
    await writeWorkspaceCollections(viewId,seed,store);
    return artifact;
  });
}

export async function restoreArtifact(viewId:ViewId,id:string) {
  const seed=await readViewStore(viewId);
  return withWorkspaceTransaction(viewId,seed,async()=>{
    const store=await readViewStore(viewId);const entry=store.trash.find(item=>item.artifact.id===id||item.artifact.slug===id);
    if(!entry)throw new Error("Trashed artifact not found.");
    if(store.artifacts.some(a=>a.id===entry.artifact.id||a.slug===entry.artifact.slug))throw new Error("Another artifact uses this address. Rename or remove it before restoring.");
    const artifact=normalizeArtifacts([{...entry.artifact,updated:"Just now",updatedAt:new Date().toISOString(),revision:(entry.artifact.revision||0)+1}],store.courses)[0];
    if(artifact.assignmentId&&!store.assignments.some(a=>a.id===artifact.assignmentId))delete artifact.assignmentId;
    store.artifacts.unshift(artifact);store.trash=store.trash.filter(item=>item!==entry);
    for(const link of entry.links)if(exists(store,link.a)&&exists(store,link.b)&&!store.links.some(l=>l.id===link.id))store.links.push(link);
    store.planner=mapTasks(store.planner,task=>entry.taskIds.includes(task.id||task.key)&&!task.artifactId&&!task.artifact?{...task,artifactId:artifact.id,artifact:artifact.title}:task);
    await writeWorkspaceCollections(viewId,seed,store);return artifact;
  });
}

export async function duplicateArtifact(viewId:ViewId,id:string) {
  const seed=await readViewStore(viewId);
  return withWorkspaceTransaction(viewId,seed,async()=>{
    const store=await readViewStore(viewId);const source=store.artifacts.find(a=>a.id===id||a.slug===id);
    if(!source)throw new Error("Artifact not found.");
    const content={...structuredClone(source)} as Record<string,unknown>;
    for(const key of ["id","slug","title","createdBy","updated","updatedAt","revision","chats","thread","study","attempts","progress"])delete content[key];
    content.visibility="Private";
    const copy=await createArtifactWithContent(viewId,{title:`${source.title} (copy)`,kind:source.kind,courseId:source.courseId,tagIds:source.tagIds,description:source.description},content);
    for(const link of store.links.filter(link=>references(link,source.id))) {
      const other=link.a.kind==="artifact"&&link.a.id===source.id?link.b:link.a;
      if(exists(store,other))await linkObjects(viewId,{kind:"artifact",id:copy.id},other);
    }
    return copy;
  });
}
