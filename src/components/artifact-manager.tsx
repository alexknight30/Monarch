"use client";
import { DesignCopy } from "@/components/design/runtime";

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
  return <div data-design-id="m-0fe41866ff2c" className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-5" onMouseDown={event=>{if(event.target===event.currentTarget&&!busy)onClose();}}>
    <form data-design-id="m-f20d644a3fe5" role="dialog" aria-modal="true" aria-labelledby="artifact-manager-title" className="w-full max-w-lg space-y-5 rounded-2xl bg-white p-6 shadow-xl" onSubmit={event=>{event.preventDefault();void run("save");}}>
      <div data-design-id="m-410c206577f2" className="flex items-center justify-between"><h2 data-design-id="m-1386f5b46e2b" id="artifact-manager-title" className="text-lg font-medium"><DesignCopy id="m-1386f5b46e2b">Artifact details</DesignCopy></h2><button data-design-id="m-a62c46104e90" type="button" disabled={busy} onClick={onClose} aria-label="Close artifact details"><DesignCopy id="m-a62c46104e90">✕</DesignCopy></button></div>
      <label data-design-id="m-eb302957fa28" className="block text-xs text-stone-500">Title<input data-design-id="m-7420a838fadb" autoFocus required maxLength={500} value={title} onChange={event=>setTitle(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 p-2 text-sm text-stone-900"/></label>
      <label data-design-id="m-c0f9fd3abd1f" className="block text-xs text-stone-500">Course<select data-design-id="m-376ac2fa35ed" value={courseId} onChange={event=>setCourseId(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 p-2 text-sm text-stone-900">{!courses.length&&<option value={courseId}>Loading course…</option>}{courses.map(course=><option key={course.id} value={course.id}>{course.code} · {course.title}</option>)}</select></label>
      <div data-design-id="m-be4b730df7f7" className="flex flex-wrap gap-2">{tagsForKind("artifact").map(tag=><button data-design-id="m-169bcef4b67b" data-design-key={tag.id} type="button" key={tag.id} aria-pressed={tags.includes(tag.id)} className={"rounded-full border px-3 py-1 text-xs "+(tags.includes(tag.id)?"border-orange-300 bg-orange-50":"border-stone-200")} onClick={()=>setTags(tags.includes(tag.id)?tags.filter(id=>id!==tag.id):[...tags,tag.id])}>{tag.label}</button>)}</div>
      <label data-design-id="m-aee60590df24" className="block text-xs text-stone-500">Description<textarea data-design-id="m-ddd4806fb570" rows={3} value={description} onChange={event=>setDescription(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 p-2 text-sm text-stone-900"/></label>
      {error&&<p data-design-id="m-fd7149863e4f" role="alert" className="text-sm text-red-700">{error}</p>}
      {confirmTrash?<div data-design-id="m-08a58117395b" className="rounded-lg bg-amber-50 p-3 text-sm leading-6"><p data-design-id="m-2956aed82298"><DesignCopy id="m-2956aed82298">Move this artifact to Trash? Linked tasks and other artifacts stay in your workspace. You can restore this artifact from Trash.</DesignCopy></p><div data-design-id="m-9dac7a973fbc" className="mt-2 flex gap-3"><button data-design-id="m-cd07805b8285" type="button" disabled={busy} className="text-red-700 underline" onClick={()=>void run("trash")}><DesignCopy id="m-cd07805b8285">Move to Trash</DesignCopy></button><button data-design-id="m-e820b2c9a032" type="button" onClick={()=>setConfirmTrash(false)}><DesignCopy id="m-e820b2c9a032">Cancel</DesignCopy></button></div></div>:<button data-design-id="m-5cfc450bcb5f" type="button" className="text-xs text-red-700" disabled={busy} onClick={()=>setConfirmTrash(true)}><DesignCopy id="m-5cfc450bcb5f">Move to Trash</DesignCopy></button>}
      <div data-design-id="m-cef8d0796fb5" className="flex items-center justify-between gap-3 border-t border-stone-100 pt-4"><button data-design-id="m-76a3c5bab1ea" type="button" disabled={busy} className="rounded-lg border border-stone-200 px-3 py-2 text-sm" onClick={()=>void run("duplicate")}><DesignCopy id="m-76a3c5bab1ea">Make a copy</DesignCopy></button><button data-design-id="m-af1548f0186d" disabled={busy||!title.trim()} className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-50">{busy?"Working…":"Save details"}</button></div>
      <p data-design-id="m-87ead5f08660" className="text-xs text-stone-400"><DesignCopy id="m-87ead5f08660">Copies keep saved content and links, with fresh study progress and conversation history.</DesignCopy></p>
    </form>
  </div>;
}
