"use client";
import { useEffect,useRef,useState } from "react";
import { useRouter } from "next/navigation";
import { useViewId } from "./view-provider";
import { tagsForKind,type TagId } from "@/lib/objects/tags";
import type { Artifact,Course } from "@/lib/mock-data";
import { announceArtifactConflict } from "@/lib/artifact-conflict-events";

export function ArtifactManager({artifact,onClose}:{artifact:Artifact;onClose:()=>void}) {
  const viewId=useViewId();const router=useRouter();
  const [title,setTitle]=useState(artifact.title);
  const [description,setDescription]=useState(artifact.description);
  const [courseId,setCourseId]=useState(artifact.courseId);
  const [tags,setTags]=useState<TagId[]>(artifact.tagIds||[]);
  const [courses,setCourses]=useState<Course[]>([]);
  const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  const [confirmTrash,setConfirmTrash]=useState(false);
  const comparison=useRef<Artifact>(artifact);
  useEffect(()=>{
    const controller=new AbortController();
    void fetch(`/api/${viewId}/courses`,{signal:controller.signal}).then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error||"Could not load courses.");setCourses(data.courses);}).catch(error=>{if(!controller.signal.aborted)setError(error.message);});
    return ()=>controller.abort();
  },[viewId]);
  useEffect(()=>{const key=(event:KeyboardEvent)=>{if(event.key==="Escape"&&!busy)onClose();};window.addEventListener("keydown",key);return ()=>window.removeEventListener("keydown",key);},[busy,onClose]);
  async function run(action:"save"|"duplicate"|"trash") {
    setBusy(true);setError("");
    try {
      const patch={title,description,courseId,tagIds:tags};
      const response=await fetch(`/api/${viewId}/artifacts/${encodeURIComponent(artifact.id)}${action==="save"?"":"/lifecycle"}`,{method:action==="save"?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(action==="save"?{...patch,_base:comparison.current}:{action})});
      const data=await response.json();
      if(response.status===409&&data.artifact&&Array.isArray(data.conflictingFields)) {
        const remote=data.artifact as Artifact;
        announceArtifactConflict({key:`details.${viewId}.${artifact.id}`,title:artifact.title,fields:data.conflictingFields,local:patch,remote:remote as unknown as Record<string,unknown>,
          keepLocal:async()=>{comparison.current=remote;await run("save");},
          useSaved:()=>{
            comparison.current=remote;
            if(data.conflictingFields.includes("title"))setTitle(remote.title);
            if(data.conflictingFields.includes("description"))setDescription(remote.description);
            if(data.conflictingFields.includes("courseId"))setCourseId(remote.courseId);
            if(data.conflictingFields.includes("tagIds"))setTags(remote.tagIds||[]);
            setError("Loaded the saved values for conflicting fields. Review and save your details.");
          },
        });
      }
      if(!response.ok)throw new Error(data.error||"Could not update artifact.");
      if(action==="trash") {
        try{localStorage.removeItem(`monarch.draft.${viewId}.${artifact.id}`);localStorage.removeItem(`monarch.draft.${viewId}.${artifact.id}.metadata`);}catch{ /* Browser storage may be disabled. */ }
      }
      router.refresh();onClose();
      if(action==="duplicate")router.push(`/artifacts/${data.artifact.slug}`);
    }catch(error){setError(error instanceof Error?error.message:"Could not update artifact.");}finally{setBusy(false);}
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-5" onMouseDown={event=>{if(event.target===event.currentTarget&&!busy)onClose();}}>
    <form role="dialog" aria-modal="true" aria-labelledby="artifact-manager-title" className="w-full max-w-lg space-y-5 rounded-2xl bg-white p-6 shadow-xl" onSubmit={event=>{event.preventDefault();void run("save");}}>
      <div className="flex items-center justify-between"><h2 id="artifact-manager-title" className="text-lg font-medium">Artifact details</h2><button type="button" disabled={busy} onClick={onClose} aria-label="Close artifact details">✕</button></div>
      <label className="block text-xs text-stone-500">Title<input autoFocus required maxLength={500} value={title} onChange={event=>setTitle(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 p-2 text-sm text-stone-900"/></label>
      <label className="block text-xs text-stone-500">Course<select value={courseId} onChange={event=>setCourseId(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 p-2 text-sm text-stone-900">{!courses.length&&<option value={courseId}>Loading course…</option>}{courses.map(course=><option key={course.id} value={course.id}>{course.code} · {course.title}</option>)}</select></label>
      <div className="flex flex-wrap gap-2">{tagsForKind("artifact").map(tag=><button type="button" key={tag.id} aria-pressed={tags.includes(tag.id)} className={"rounded-full border px-3 py-1 text-xs "+(tags.includes(tag.id)?"border-orange-300 bg-orange-50":"border-stone-200")} onClick={()=>setTags(tags.includes(tag.id)?tags.filter(id=>id!==tag.id):[...tags,tag.id])}>{tag.label}</button>)}</div>
      <label className="block text-xs text-stone-500">Description<textarea rows={3} value={description} onChange={event=>setDescription(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 p-2 text-sm text-stone-900"/></label>
      {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
      {confirmTrash?<div className="rounded-lg bg-amber-50 p-3 text-sm leading-6"><p>Move this artifact to Trash? Linked tasks and other artifacts stay in your workspace. You can restore this artifact from Trash.</p><div className="mt-2 flex gap-3"><button type="button" disabled={busy} className="text-red-700 underline" onClick={()=>void run("trash")}>Move to Trash</button><button type="button" onClick={()=>setConfirmTrash(false)}>Cancel</button></div></div>:<button type="button" className="text-xs text-red-700" disabled={busy} onClick={()=>setConfirmTrash(true)}>Move to Trash</button>}
      <div className="flex items-center justify-between gap-3 border-t border-stone-100 pt-4"><button type="button" disabled={busy} className="rounded-lg border border-stone-200 px-3 py-2 text-sm" onClick={()=>void run("duplicate")}>Make a copy</button><button disabled={busy||!title.trim()} className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-50">{busy?"Working…":"Save details"}</button></div>
      <p className="text-xs text-stone-400">Copies keep saved content and links, with fresh study progress and conversation history.</p>
    </form>
  </div>;
}
