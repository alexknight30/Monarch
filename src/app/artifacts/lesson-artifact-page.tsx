"use client";
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
    <div className="flex items-center gap-2">
      <button className={button} aria-pressed={!editing} onClick={() => setEditing(false)}>Learn</button>
      <button className={button} aria-pressed={editing} onClick={() => setEditing(true)}>Edit lesson</button>
      <span className="ml-auto text-xs text-stone-500" role="status">{status}</span>{error && <button className="text-xs text-red-700" onClick={() => void retry()}>{error} · Retry</button>}
    </div>
    {!editing && <div><div className="mb-2 text-xs text-stone-500">{completed} / {blocks.length} sections complete</div><div className="h-1.5 rounded-full bg-stone-200"><div className="h-full rounded-full bg-emerald-500" style={{ width: blocks.length ? completed / blocks.length * 100 + "%" : 0 }} /></div></div>}
    {tutorError&&<p role="alert" className="text-sm text-red-700">{tutorError}</p>}
    {blocks.map((block, i) => <section key={block.id} className={block.type === "prompt" ? "rounded-2xl border border-violet-200 bg-violet-50/40 p-6 sm:p-8" : "border-b border-stone-200/80 px-2 py-6"}>
      <div className="mb-4 flex items-center justify-between gap-3"><span className="text-xs uppercase tracking-wider text-stone-400">{i+1} · {block.type === "prompt" ? "Think it through" : "Explanation"}</span>
        {editing ? <div className="flex gap-3 text-xs"><button disabled={i === 0} onClick={() => { const next = [...blocks]; [next[i-1], next[i]] = [next[i], next[i-1]]; persistBlocks(next); }}>Move up</button><button onClick={() => persistBlocks([...blocks.slice(0,i+1), { ...block, id: crypto.randomUUID() }, ...blocks.slice(i+1)])}>Duplicate</button><button className="text-red-700" onClick={() => persistBlocks(blocks.filter(b => b.id !== block.id))}>Delete</button></div> : <label className="flex items-center gap-2 text-xs text-stone-500"><input type="checkbox" checked={!!progress[block.id]?.complete} onChange={e => updateProgress(block.id, { complete: e.target.checked })} />Complete</label>}
      </div>
      {editing ? <>
        <select aria-label={"Section " + (i+1) + " type"} className={button} value={block.type} onChange={e => persistBlocks(blocks.map(b => b.id === block.id ? { ...b, type: e.target.value as LessonBlock["type"], text: b.text ?? (htmlToPlainText(b.html ?? "") || b.prompt), prompt: b.prompt || b.text || htmlToPlainText(b.html ?? "") } : b))}><option value="text">Explanation</option><option value="prompt">Tutor question</option></select>
        <textarea aria-label={"Section " + (i+1) + " content"} rows={6} className={field + " mt-3"} value={block.type === "prompt" ? block.prompt ?? "" : block.text ?? htmlToPlainText(block.html ?? "")} onChange={e => persistBlocks(blocks.map(b => b.id === block.id ? { ...b, ...(b.type === "prompt" ? { prompt: e.target.value } : { text: e.target.value }) } : b))} />
      </> : <>
        <StudyMarkdown text={block.type === "prompt" ? block.prompt ?? "" : block.text ?? htmlToPlainText(block.html ?? "")} />
        {block.type === "prompt" && <div className="mt-5">
          <label className="text-xs text-stone-500">Your reasoning<textarea className={field + " mt-2"} rows={4} value={progress[block.id]?.answer ?? ""} placeholder="Work through the question in your own words…" onChange={e => updateProgress(block.id, { answer: e.target.value })} /></label>
          <div className="mt-3 flex items-center gap-3"><button className={button} disabled={!!tutoring||!progress[block.id]?.answer?.trim()} onClick={()=>void askTutor(block)}>{tutoring===block.id?"Tutor is reading…":"Get feedback"}</button>{tutoring===block.id&&<button className="text-xs underline" onClick={()=>{requestRef.current?.abort();requestRef.current=null;setTutoring(null);}}>Stop</button>}<span className="text-xs text-stone-400">Uses this lesson and linked material</span></div>
          {progress[block.id]?.feedback && <div className="mt-4 rounded-xl border border-violet-100 bg-white p-5"><StudyMarkdown text={progress[block.id].feedback!} /></div>}
        </div>}
      </>}
    </section>)}
    {editing && <div className="flex gap-3"><button className={button} onClick={() => persistBlocks([...blocks, { id: crypto.randomUUID(), type: "text", text: "" }])}>+ Explanation</button><button className={button} onClick={() => persistBlocks([...blocks, { id: crypto.randomUUID(), type: "prompt", prompt: "" }])}>+ Tutor question</button><span className="self-center text-xs text-stone-400">Equations: $...$ or $$...$$</span></div>}
    {!blocks.length && !editing && <p className="p-8 text-center text-stone-500">Add a section in the editor to begin.</p>}
  </ArtifactShell>;
}
