"use client";
import { useState } from "react";
import { useViewId } from "./view-provider";
import { flushChatHistory } from "@/lib/chat-history";
type Preview={exportedAt:string;courses:number;artifacts:number;tasks:number;conversations:number;files:number};

export function WorkspaceBackupControls() {
  const viewId=useViewId();
  const [file,setFile]=useState<File|null>(null);
  const [preview,setPreview]=useState<Preview|null>(null);
  const [confirmation,setConfirmation]=useState("");
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState("");
  async function download() {
    setBusy(true);setStatus("Preparing backup…");
    try {
      await flushChatHistory();
      const response=await fetch(`/api/${viewId}/workspace/backup`);
      if(!response.ok){const data=await response.json();throw new Error(data.error||"Backup failed.");}
      const url=URL.createObjectURL(await response.blob());const link=document.createElement("a");link.href=url;link.download=`monarch-${viewId}-${new Date().toISOString().slice(0,10)}.monarch.gz`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      setStatus("Backup downloaded. Keep it somewhere safe outside the Monarch folder.");
    }catch(error){setStatus(error instanceof Error?error.message:"Backup failed.");}finally{setBusy(false);}
  }
  async function upload(selected:File,restore=false) {
    setBusy(true);setStatus(restore?"Restoring workspace…":"Checking backup…");
    try {
      if(restore)await flushChatHistory();
      const form=new FormData();form.append("file",selected);form.append("action",restore?"restore":"preview");form.append("confirmation",confirmation);
      const response=await fetch(`/api/${viewId}/workspace/restore`,{method:"POST",body:form});const data=await response.json();
      if(!response.ok)throw new Error(data.error||"The backup could not be read.");
      if(restore) {
        // Older drafts must not be replayed on top of the restored records.
        try {for(const key of Object.keys(localStorage))if(key.startsWith(`monarch.draft.${viewId}.`)||key===`monarch.chat.threads.${viewId}`||key===`monarch.chat.active.${viewId}`)localStorage.removeItem(key);} catch { /* Disabled browser storage has no drafts to replay. */ }
        window.location.reload();
      }else {setPreview(data.preview);setStatus("Backup checked. Nothing has been replaced.");}
    }catch(error){setStatus(error instanceof Error?error.message:"Restore failed.");}finally{setBusy(false);}
  }
  return <section className="space-y-4 rounded-xl border border-stone-200 p-5">
    <h2 className="font-medium">Full backup & restore</h2>
    <p className="text-sm leading-6 text-stone-500">Includes workspace records, original documents, chat attachments and whiteboard media. Provider keys and older recovery snapshots are not included.</p>
    <button disabled={busy} className="rounded-lg border border-stone-200 px-4 py-2 text-sm disabled:opacity-50" onClick={()=>void download()}>Download full backup</button>
    <label className="block text-sm">Restore a backup<input disabled={busy} type="file" accept=".gz,application/gzip" className="mt-2 block w-full text-xs" onChange={event=>{const selected=event.target.files?.[0]||null;setFile(selected);setPreview(null);setConfirmation("");if(selected)void upload(selected);}}/></label>
    {preview&&file&&<div className="space-y-3 rounded-lg bg-amber-50 p-4 text-sm leading-6">
      <p>Backup from {new Date(preview.exportedAt).toLocaleString()}: {preview.courses} courses, {preview.artifacts} artifacts, {preview.tasks} top-level tasks, {preview.conversations} conversations and {preview.files} files.</p>
      <p>Restoring replaces this workspace’s current records. The current records get a recovery snapshot and existing files stay on disk. Close other Monarch tabs first so they cannot save older edits over the restored work.</p>
      <label className="block">Type REPLACE to confirm<input aria-label="Restore confirmation" className="ml-2 rounded border border-amber-200 bg-white px-2 py-1" value={confirmation} onChange={event=>setConfirmation(event.target.value)}/></label>
      <button disabled={busy||confirmation!=="REPLACE"} className="rounded-lg bg-stone-900 px-4 py-2 text-white disabled:opacity-40" onClick={()=>void upload(file,true)}>Restore this workspace</button>
    </div>}
    <p role="status" className="text-sm text-stone-600">{status}</p>
  </section>;
}
