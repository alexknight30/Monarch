"use client";
import { DesignCopy } from "@/components/design/runtime";

import { useState } from "react";
import { tagsForKind,type TagId,type TaggableKind } from "@/lib/objects/tags";

export function ObjectTagPicker({kind,value,onChange,disabled=false}:{kind:TaggableKind;value:TagId[];onChange:(value:TagId[])=>void;disabled?:boolean}) {
  return <div data-design-id="m-db0ade8e1f23" className="flex flex-wrap gap-1.5" aria-label="Tags">{tagsForKind(kind).map(tag=><button data-design-id="m-845c84bc6671" data-design-key={tag.id} type="button" disabled={disabled} key={tag.id} aria-pressed={value.includes(tag.id)} className={"rounded-full border px-2.5 py-1 text-xs disabled:opacity-50 "+(value.includes(tag.id)?"bg-stone-50":"border-stone-200 bg-white text-stone-500")} style={value.includes(tag.id)?{borderColor:tag.color,color:tag.color}:undefined} onClick={()=>onChange(value.includes(tag.id)?value.filter(id=>id!==tag.id):[...value,tag.id])}>{tag.label}</button>)}</div>;
}

export function TaskTagEditor({value,onSave}:{value:TagId[];onSave:(value:TagId[])=>Promise<boolean>}) {
  const [selected,setSelected]=useState(value);const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  return <div data-design-id="m-529ee31e2f0d" className="mt-4 space-y-3 border-t border-stone-200 pt-4"><p data-design-id="m-9784e1895240" className="text-xs text-stone-500"><DesignCopy id="m-9784e1895240">Tags</DesignCopy></p><ObjectTagPicker kind="task" value={selected} onChange={setSelected} disabled={busy}/>{JSON.stringify(selected)!==JSON.stringify(value)&&<button data-design-id="m-e398b9b9252c" type="button" disabled={busy} className="text-xs underline" onClick={async()=>{setBusy(true);setError("");try{if(!await onSave(selected))setError("Tags could not be saved. Try again.");}catch{setError("Tags could not be saved. Try again.");}finally{setBusy(false);}}}>{busy?"Saving…":"Save tags"}</button>}{error&&<p data-design-id="m-791bd897dd55" role="alert" className="text-xs text-red-700">{error}</p>}</div>;
}
