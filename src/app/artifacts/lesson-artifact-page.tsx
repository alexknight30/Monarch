"use client";
import { DesignCopy } from "@/components/design/runtime";

import { useEffect,useRef, useState } from "react";
import { useViewId } from "@/components/view-provider";
import { ArtifactShell } from "./artifact-shell";
import { StudyMarkdown } from "@/components/ui/study-markdown";
import { readArtifactDraft, useArtifactSave } from "@/lib/use-artifact-save";
import { htmlToPlainText } from "@/lib/documents";
import type { LessonArtifact, LessonBlock } from "@/lib/mock-data";

const button = "rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm hover:bg-stone-50 disabled:opacity-40";
const field = "w-full rounded-lg border border-stone-200 p-3 text-sm outline-none focus:border-stone-500";
export default function LessonArtifactPage({ artifact }: { artifact: LessonArtifact }) {
  const viewId = useViewId();
  const { save, retry, status, error } = useArtifactSave(artifact.id, undefined, artifact);
  const [blocks, setBlocks] = useState<LessonBlock[]>(artifact.blocks);
  const [progress, setProgress] = useState<NonNullable<LessonArtifact["progress"]>>(artifact.progress ?? {});
  const [editing, setEditing] = useState(!artifact.blocks.length);
  const progressRef=useRef(progress);
  const blocksRef=useRef(blocks);
  const requestRef=useRef<AbortController|null>(null);
  const [tutoring,setTutoring]=useState<string|null>(null);
  const [tutorError,setTutorError]=useState("");
  useEffect(()=>()=>requestRef.current?.abort(),[]);
  useEffect(() => {
    const draft = readArtifactDraft(viewId, artifact.id);
    if (draft) {
      // Restore browser-only drafts after hydration, preserving the server's first render.
      if (Array.isArray(draft.blocks)) {blocksRef.current=draft.blocks as LessonBlock[];setBlocks(blocksRef.current);}
      if (draft.progress) {progressRef.current=draft.progress as NonNullable<LessonArtifact["progress"]>;setProgress(progressRef.current);}
      void save(draft);
    }
  }, [artifact.id, viewId, save]);
  const persistBlocks = (next: LessonBlock[]) => {
    const revised={...progressRef.current};let changed=false;
    for(const id of Object.keys(revised)){
      const previous=blocksRef.current.find(block=>block.id===id);const current=next.find(block=>block.id===id);
      if(!current){delete revised[id];changed=true;}
      else if(previous?.prompt!==current.prompt||previous?.type!==current.type){revised[id]={...revised[id],feedback:undefined,complete:false};changed=true;}
    }
    blocksRef.current=next;setBlocks(next);
    if(changed){progressRef.current=revised;setProgress(revised);}
    save({blocks:next,...(changed?{progress:revised}:{})});
  };
  const updateProgress = (id: string, patch: NonNullable<LessonArtifact["progress"]>[string]) => {
    const next = { ...progressRef.current, [id]: { ...progressRef.current[id], ...patch,...(patch.answer!==undefined?{feedback:undefined}:{}) } };
    progressRef.current=next;setProgress(next); void save({ progress: next });
  };
  async function askTutor(block:LessonBlock){
    if(requestRef.current)return;
    const answer=progressRef.current[block.id]?.answer||"";const question=block.prompt||"";
    const controller=new AbortController();requestRef.current=controller;setTutoring(block.id);setTutorError("");
    try{
      await retry();controller.signal.throwIfAborted();
      const response=await fetch(`/api/${viewId}/artifacts/${encodeURIComponent(artifact.id)}/tutor`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({blockId:block.id,question,answer}),signal:controller.signal});
      const result=await response.json();if(!response.ok)throw new Error(result.error||"Could not get feedback.");
      if(controller.signal.aborted||requestRef.current!==controller)return;
      if(progressRef.current[block.id]?.answer!==answer||blocksRef.current.find(item=>item.id===block.id&&item.type==="prompt")?.prompt!==question){setTutorError("Your answer or question changed. Ask again for feedback on the latest version.");return;}
      updateProgress(block.id,{feedback:result.feedback});
    }catch(cause){if(!controller.signal.aborted)setTutorError(cause instanceof Error?cause.message:"Could not get feedback.");}
    finally{if(requestRef.current===controller){requestRef.current=null;if(!controller.signal.aborted)setTutoring(null);}}
  }
  const completed = blocks.filter(b => progress[b.id]?.complete).length;
  return <ArtifactShell artifact={artifact}>
    <div data-design-id="m-5e9517886ddf" className="flex items-center gap-2">
      <button data-design-id="m-ba19ddda8175" className={button} aria-pressed={!editing} onClick={() => setEditing(false)}><DesignCopy id="m-ba19ddda8175">Learn</DesignCopy></button>
      <button data-design-id="m-aa101ddd7ffc" className={button} aria-pressed={editing} onClick={() => setEditing(true)}><DesignCopy id="m-aa101ddd7ffc">Edit lesson</DesignCopy></button>
      <span data-design-id="m-0ca2a1ca4f24" className="ml-auto text-xs text-stone-500" role="status">{status}</span>{error && <button data-design-id="m-8dc0f2c57f58" className="text-xs text-red-700" onClick={() => void retry()}>{error} · Retry</button>}
    </div>
    {!editing && <div data-design-id="m-7d1ace5d2da0"><div data-design-id="m-120029517678" className="mb-2 text-xs text-stone-500">{completed} / {blocks.length} sections complete</div><div data-design-id="m-45a359093b29" className="h-1.5 rounded-full bg-stone-200"><div data-design-id="m-7cb876005a28" className="h-full rounded-full bg-emerald-500" style={{ width: blocks.length ? completed / blocks.length * 100 + "%" : 0 }} /></div></div>}
    {tutorError&&<p data-design-id="m-2a6116110b04" role="alert" className="text-sm text-red-700">{tutorError}</p>}
    {blocks.map((block, i) => <section data-design-id="m-5f254e401a53" data-design-key={block.id} key={block.id} className={block.type === "prompt" ? "rounded-2xl border border-violet-200 bg-violet-50/40 p-6 sm:p-8" : "border-b border-stone-200/80 px-2 py-6"}>
      <div data-design-id="m-9b10f056b712" className="mb-4 flex items-center justify-between gap-3"><span data-design-id="m-1b26b86f608c" className="text-xs uppercase tracking-wider text-stone-400">{i+1} · {block.type === "prompt" ? "Think it through" : "Explanation"}</span>
        {editing ? <div data-design-id="m-17870093a78b" className="flex gap-3 text-xs"><button data-design-id="m-5eb319fa4bfc" disabled={i === 0} onClick={() => { const next = [...blocks]; [next[i-1], next[i]] = [next[i], next[i-1]]; persistBlocks(next); }}><DesignCopy id="m-5eb319fa4bfc">Move up</DesignCopy></button><button data-design-id="m-b9eb673da3df" onClick={() => persistBlocks([...blocks.slice(0,i+1), { ...block, id: crypto.randomUUID() }, ...blocks.slice(i+1)])}><DesignCopy id="m-b9eb673da3df">Duplicate</DesignCopy></button><button data-design-id="m-839b3adb9045" className="text-red-700" onClick={() => persistBlocks(blocks.filter(b => b.id !== block.id))}><DesignCopy id="m-839b3adb9045">Delete</DesignCopy></button></div> : <label data-design-id="m-9fb173527072" className="flex items-center gap-2 text-xs text-stone-500"><input data-design-id="m-747c9dc984a0" type="checkbox" checked={!!progress[block.id]?.complete} onChange={e => updateProgress(block.id, { complete: e.target.checked })} />Complete</label>}
      </div>
      {editing ? <>
        <select data-design-id="m-5435459c2ae6" aria-label={"Section " + (i+1) + " type"} className={button} value={block.type} onChange={e => persistBlocks(blocks.map(b => b.id === block.id ? { ...b, type: e.target.value as LessonBlock["type"], text: b.text ?? (htmlToPlainText(b.html ?? "") || b.prompt), prompt: b.prompt || b.text || htmlToPlainText(b.html ?? "") } : b))}><option value="text">Explanation</option><option value="prompt">Tutor question</option></select>
        <textarea data-design-id="m-c77f52ee3b53" aria-label={"Section " + (i+1) + " content"} rows={6} className={field + " mt-3"} value={block.type === "prompt" ? block.prompt ?? "" : block.text ?? htmlToPlainText(block.html ?? "")} onChange={e => persistBlocks(blocks.map(b => b.id === block.id ? { ...b, ...(b.type === "prompt" ? { prompt: e.target.value } : { text: e.target.value }) } : b))} />
      </> : <>
        <StudyMarkdown text={block.type === "prompt" ? block.prompt ?? "" : block.text ?? htmlToPlainText(block.html ?? "")} />
        {block.type === "prompt" && <div data-design-id="m-fa446c934201" className="mt-5">
          <label data-design-id="m-8de5bf145e60" className="text-xs text-stone-500">Your reasoning<textarea data-design-id="m-cdb35d4acadb" className={field + " mt-2"} rows={4} value={progress[block.id]?.answer ?? ""} placeholder="Work through the question in your own words…" onChange={e => updateProgress(block.id, { answer: e.target.value })} /></label>
          <div data-design-id="m-54c8903e71bb" className="mt-3 flex items-center gap-3"><button data-design-id="m-e927c079b8c4" className={button} disabled={!!tutoring||!progress[block.id]?.answer?.trim()} onClick={()=>void askTutor(block)}>{tutoring===block.id?"Tutor is reading…":"Get feedback"}</button>{tutoring===block.id&&<button data-design-id="m-d949739f83e9" className="text-xs underline" onClick={()=>{requestRef.current?.abort();requestRef.current=null;setTutoring(null);}}><DesignCopy id="m-d949739f83e9">Stop</DesignCopy></button>}<span data-design-id="m-c45634c95fc5" className="text-xs text-stone-400"><DesignCopy id="m-c45634c95fc5">Uses this lesson and linked material</DesignCopy></span></div>
          {progress[block.id]?.feedback && <div data-design-id="m-f00ce15f002c" className="mt-4 rounded-xl border border-violet-100 bg-white p-5"><StudyMarkdown text={progress[block.id].feedback!} /></div>}
        </div>}
      </>}
    </section>)}
    {editing && <div data-design-id="m-155a20cba794" className="flex gap-3"><button data-design-id="m-01bf8a387c8d" className={button} onClick={() => persistBlocks([...blocks, { id: crypto.randomUUID(), type: "text", text: "" }])}><DesignCopy id="m-01bf8a387c8d">+ Explanation</DesignCopy></button><button data-design-id="m-dbbebe131f19" className={button} onClick={() => persistBlocks([...blocks, { id: crypto.randomUUID(), type: "prompt", prompt: "" }])}><DesignCopy id="m-dbbebe131f19">+ Tutor question</DesignCopy></button><span data-design-id="m-6f2e0549df3b" className="self-center text-xs text-stone-400"><DesignCopy id="m-6f2e0549df3b">Equations: $...$ or $$...$$</DesignCopy></span></div>}
    {!blocks.length && !editing && <p data-design-id="m-2eaa94925a6d" className="p-8 text-center text-stone-500"><DesignCopy id="m-2eaa94925a6d">Add a section in the editor to begin.</DesignCopy></p>}
  </ArtifactShell>;
}
