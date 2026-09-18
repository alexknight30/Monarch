"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useViewId } from "@/components/view-provider";
import type { Artifact } from "./mock-data";
import { announceArtifactConflict } from "./artifact-conflict-events";

type Fields=Record<string,unknown>;
export function artifactDraftKey(viewId:string,id:string){return "monarch.draft."+viewId+"."+id;}
export function readArtifactDraft(viewId:string,id:string):Fields|null {
  try {
    const draft=JSON.parse(localStorage.getItem(artifactDraftKey(viewId,id))||"null");
    if(!draft||typeof draft!=="object"||Array.isArray(draft))return null;
    return draft.__monarchBase ? draft : {...draft,__monarchLegacyDraft:true};
  }catch{return null;}
}

/** Serialized field-aware saves, durable browser drafts and explicit conflict resolution. */
export function useArtifactSave(id:string,draftScope?:string,initial?:object) {
  const viewId=useViewId();
  const [status,setStatus]=useState("Saved");
  const [error,setError]=useState<string|null>(null);
  const initialFields=useRef<Fields>({...initial});
  const base=useRef<Fields>({...initial});
  const pending=useRef<Fields>({});
  const inflight=useRef<Fields>({});
  const conflict=useRef<{remote:Fields;fields:string[]}|null>(null);
  const running=useRef<Promise<Artifact|undefined>|null>(null);
  const mounted=useRef(true);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const key=artifactDraftKey(viewId,draftScope?id+"."+draftScope:id);

  const cache=useCallback(()=>{
    const patch={...inflight.current,...pending.current};
    const comparison=Object.fromEntries(Object.keys(patch).map(field=>[field,base.current[field]??null]));
    try{localStorage.setItem(key,JSON.stringify({...patch,__monarchBase:comparison,...(conflict.current?{__monarchNeedsReview:conflict.current.fields}:{})}));}
    catch{/* Pending changes remain in memory and the close warning stays active. */}
  },[key]);

  const flush=useCallback(function flush():Promise<Artifact|undefined>{
    if(timer.current){clearTimeout(timer.current);timer.current=null;}
    if(running.current)return running.current;
    const openConflict=()=>{
      const current=conflict.current;if(!current)return;
      announceArtifactConflict({
        key,title:String(initialFields.current.title||"Artifact"),fields:current.fields,
        local:{...inflight.current,...pending.current},remote:current.remote,
        keepLocal:async()=>{
          for(const field of current.fields)base.current[field]=current.remote[field]??null;
          conflict.current=null;cache();
          return flush();
        },
        useSaved:async()=>{
          for(const field of current.fields){
            delete pending.current[field];
            base.current[field]=current.remote[field]??null;
          }
          conflict.current=null;cache();
          await flush();
          if(!Object.keys(pending.current).length){
            try{localStorage.removeItem(key);}catch{/* Storage can be disabled. */}
            window.location.reload();
          }
        },
      });
    };
    if(conflict.current){openConflict();return Promise.resolve(undefined);}
    const operation=async()=>{
      let saved:Artifact|undefined;
      while(Object.keys(pending.current).length){
        const patch=pending.current;pending.current={};inflight.current=patch;
        const comparison=Object.fromEntries(Object.keys(patch).map(field=>[field,base.current[field]??null]));
        try{
          const response=await fetch("/api/"+viewId+"/artifacts/"+encodeURIComponent(id),{
            method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({...patch,_base:comparison}),
          });
          const result=await response.json();
          if(response.status===409&&result.artifact&&Array.isArray(result.conflictingFields)){
            conflict.current={remote:result.artifact,fields:result.conflictingFields};
          }
          if(!response.ok)throw new Error(result.error||"Your changes could not be saved.");
          saved=result.artifact;
          // Do not advance untouched fields: the editor still displays its original versions.
          for(const field of Object.keys(patch))base.current[field]=result.artifact[field]??null;
          inflight.current={};
          if(!Object.keys(pending.current).length){
            try{localStorage.removeItem(key);}catch{/* Storage can be disabled. */}
            if(mounted.current){setStatus("Saved");setError(null);}
          }else cache();
        }catch(cause){
          pending.current={...patch,...pending.current};inflight.current={};cache();
          if(mounted.current){setStatus(conflict.current?"Needs review":"Not saved");setError(cause instanceof Error?cause.message:"Save failed. Retry when connected.");}
          openConflict();return undefined;
        }
      }
      return saved;
    };
    const promise=operation().finally(()=>{running.current=null;});
    running.current=promise;return promise;
  },[cache,id,key,viewId]);

  const save=useCallback((input:Fields)=>{
    const alreadyConflicted=!!conflict.current;
    const {__monarchBase,__monarchNeedsReview,__monarchLegacyDraft,...patch}=input;
    if(__monarchBase&&typeof __monarchBase==="object"&&!Array.isArray(__monarchBase))Object.assign(base.current,__monarchBase);
    if(__monarchLegacyDraft||Array.isArray(__monarchNeedsReview)){
      conflict.current={remote:initialFields.current,fields:Object.keys(patch)};
    }
    pending.current={...pending.current,...patch};cache();
    if(mounted.current){
      setStatus(conflict.current?"Needs review":"Saving…");
      setError(conflict.current?"A saved version and your browser draft need review. Your draft has been kept.":null);
    }
    if(timer.current)clearTimeout(timer.current);
    if(!alreadyConflicted)timer.current=setTimeout(()=>{void flush();},250);
  },[cache,flush]);

  useEffect(()=>{
    mounted.current=true;
    const warn=(event:BeforeUnloadEvent)=>{if(running.current||Object.keys(pending.current).length){event.preventDefault();event.returnValue="";}};
    const retry=()=>{void flush();};
    window.addEventListener("beforeunload",warn);window.addEventListener("online",retry);
    return ()=>{
      mounted.current=false;window.removeEventListener("beforeunload",warn);window.removeEventListener("online",retry);void flush();
    };
  },[flush]);
  return {save,retry:flush,status,error};
}
