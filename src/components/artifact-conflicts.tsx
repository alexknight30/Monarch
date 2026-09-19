"use client";
import { DesignCopy } from "@/components/design/runtime";

import { useEffect,useState,type ReactNode } from "react";
import { ARTIFACT_CONFLICT_EVENT,type ArtifactConflictNotice } from "@/lib/artifact-conflict-events";
import { htmlToPlainText } from "@/lib/documents";
const labels:Record<string,string>={bodyHtml:"Writing",bodyText:"Reading text",title:"Title",description:"Description",snapshot:"Whiteboard",slides:"Slides",cards:"Flashcards",items:"Questions",blocks:"Lesson",progress:"Lesson progress",study:"Study progress",attempts:"Test attempts",comments:"Comments",annotations:"Annotations",thread:"Conversation",tagIds:"Tags",courseId:"Course"};
function preview(field:string,value:unknown):string {
  if(value===null||value===undefined)return "Empty";
  if(typeof value==="string")return (field==="bodyHtml"?htmlToPlainText(value):value).slice(0,2000)||"Empty";
  if(field==="snapshot")return "Whiteboard drawing and layout changed. Download your draft to preserve a separate copy before choosing.";
  if(Array.isArray(value))return value.map(item=>typeof item==="string"?item:item&&typeof item==="object"?[item.title,item.front,item.back,item.prompt,item.text,item.content,item.quote,item.note].filter(Boolean).join(" — "):String(item)).join("\n").slice(0,2000)||"Empty";
  return "Saved progress or settings differ.";
}
export function ArtifactConflicts({children}:{children:ReactNode}) {
  const [queue,setQueue]=useState<ArtifactConflictNotice[]>([]);
  useEffect(()=>{
    const receive=(event:Event)=>{const notice=(event as CustomEvent<ArtifactConflictNotice>).detail;setQueue(current=>[...current.filter(item=>item.key!==notice.key),notice]);};
    window.addEventListener(ARTIFACT_CONFLICT_EVENT,receive);return ()=>window.removeEventListener(ARTIFACT_CONFLICT_EVENT,receive);
  },[]);
  const notice=queue[0];
  const close=()=>setQueue(current=>current.filter(item=>item.key!==notice.key));
  return <>{children}{notice&&<div data-design-id="m-c4bc09b374c5" className="fixed inset-0 z-[250] flex items-center justify-center bg-black/35 p-5"><section data-design-id="m-5630017d02e4" role="dialog" aria-modal="true" aria-labelledby="save-conflict-title" className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
    <header data-design-id="m-e891e91b0aa5" className="border-b border-stone-100 p-5"><h2 data-design-id="m-d0fb38cf0650" id="save-conflict-title" className="text-lg font-medium">Review changes to {notice.title}</h2><p data-design-id="m-aa3582bfd544" className="mt-2 text-sm leading-6 text-stone-500"><DesignCopy id="m-aa3582bfd544">Another tab or conversation saved different content. Your edits are kept in this browser. Choose which version to keep for the fields below.</DesignCopy></p></header>
    <div data-design-id="m-96962f6f0fe1" className="space-y-4 overflow-y-auto p-5">{notice.fields.map(field=><div data-design-id="m-228c934d24e6" data-design-key={field} key={field}><h3 data-design-id="m-6b184c4eaee4" className="mb-2 text-xs font-medium text-stone-500">{labels[field]||"Artifact details"}</h3><div data-design-id="m-f92dbd346529" className="grid gap-3 sm:grid-cols-2"><div data-design-id="m-b2bde9a49b77" className="rounded-lg border border-stone-200 p-3"><p data-design-id="m-c7b06edbd5e0" className="mb-2 text-xs font-medium"><DesignCopy id="m-c7b06edbd5e0">Your draft</DesignCopy></p><pre data-design-id="m-2c17c24e6082" className="max-h-40 overflow-auto whitespace-pre-wrap font-sans text-sm leading-6">{preview(field,notice.local[field])}</pre></div><div data-design-id="m-0c3be1eac7af" className="rounded-lg border border-stone-200 p-3"><p data-design-id="m-f3f4f74b2663" className="mb-2 text-xs font-medium"><DesignCopy id="m-f3f4f74b2663">Saved version</DesignCopy></p><pre data-design-id="m-d1c98c1f0e1a" className="max-h-40 overflow-auto whitespace-pre-wrap font-sans text-sm leading-6">{preview(field,notice.remote[field])}</pre></div></div></div>)}</div>
    <footer data-design-id="m-df0567d8b10b" className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 p-5"><button data-design-id="m-cac9647fa61c" type="button" className="text-xs underline" onClick={()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({title:notice.title,patch:notice.local},null,2)],{type:"application/json"}));const link=document.createElement("a");link.href=url;link.download="monarch-draft.json";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}><DesignCopy id="m-cac9647fa61c">Download my draft</DesignCopy></button><div data-design-id="m-69aaae809399" className="flex flex-wrap gap-2"><button data-design-id="m-4dd4ba1d54e1" type="button" className="rounded-lg px-3 py-2 text-sm" onClick={close}><DesignCopy id="m-4dd4ba1d54e1">Decide later</DesignCopy></button><button data-design-id="m-d5187240fec1" type="button" className="rounded-lg border border-stone-200 px-3 py-2 text-sm" onClick={()=>{close();notice.useSaved();}}><DesignCopy id="m-d5187240fec1">Use saved version</DesignCopy></button><button data-design-id="m-e4305bbfbfdd" type="button" className="rounded-lg bg-stone-900 px-3 py-2 text-sm text-white" onClick={()=>{close();void notice.keepLocal();}}><DesignCopy id="m-e4305bbfbfdd">Keep my edits</DesignCopy></button></div></footer>
  </section></div>}</>;
}
