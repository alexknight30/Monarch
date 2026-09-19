"use client";
import { DesignCopy } from "@/components/design/runtime";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useViewId } from "./view-provider";
import { ASSIGNMENT_TYPES } from "@/lib/assignments";
import { STORED_CALENDAR_KINDS, parseStoredDate } from "@/lib/calendar-events";
import type { Course } from "@/lib/mock-data";
import { ObjectTagPicker } from "./ui/object-tag-picker";
import { sanitizeTagIds } from "@/lib/objects/tags";
const field = "mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-500";
const button = "rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs hover:bg-stone-50 disabled:opacity-40";
type Row = Record<string, unknown> & { id: string; title: string };
function localInput(value: string) {
  if (!value || value.length === 10 || !/[zZ]|[+-]\d{2}:\d{2}$/.test(value)) return value.slice(0,16);
  const date = parseStoredDate(value); const pad = (n: number) => String(n).padStart(2,"0");
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
export function AcademicManager({ mode, course }: { mode: "assignments" | "calendar"; course?: Course }) {
  const viewId = useViewId(); const router = useRouter();
  const [open,setOpen] = useState(false); const [busy,setBusy] = useState(false); const [error,setError] = useState("");
  const [rows,setRows] = useState<Row[]>([]); const [courses,setCourses] = useState<Course[]>([]);
  const [draft,setDraft] = useState<Record<string,unknown> | null>(null); const [query,setQuery] = useState("");
  const [dateOnly,setDateOnly] = useState(false);
  const singular = mode === "assignments" ? "assignment" : "event";
  const load = async () => {
    setOpen(true); setBusy(true); setError("");
    try {
      const [dataRes,coursesRes] = await Promise.all([fetch(`/api/${viewId}/${mode}`),fetch(`/api/${viewId}/courses`)]);
      const [data,courseData] = await Promise.all([dataRes.json(),coursesRes.json()]);
      if (!dataRes.ok || !coursesRes.ok) throw new Error(data.error || courseData.error || "Could not load your workspace.");
      setRows(data[mode]); setCourses(courseData.courses);
    } catch(cause) { setError(cause instanceof Error ? cause.message : "Could not load."); }
    finally { setBusy(false); }
  };
  const edit = (row?: Row) => {
    const next = row ? { ...row } : mode === "assignments" ? { title:"",type:"problem-set",status:"upcoming",courseSlug:course?.slug || "unassigned",dueAt:null,weight:null,description:"" } : { title:"",kind:"session",courseId:course?.id || "unassigned",startsAt:"",endsAt:"",location:"" };
    const date = String(next[mode === "assignments" ? "dueAt" : "startsAt"] || "");
    setDateOnly(date.length === 10); setDraft(next); setError("");
  };
  const update = (key: string,value: unknown) => setDraft(current => ({ ...current,[key]:value }));
  const persist = async () => {
    if (!draft) return; setBusy(true); setError("");
    try {
      const response = await fetch(`/api/${viewId}/${mode}${draft.id ? "/"+encodeURIComponent(String(draft.id)) : ""}`, { method:draft.id ? "PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(draft) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Could not save.");
      const row = result[singular]; setRows(current => draft.id ? current.map(r => r.id === draft.id ? row:r) : [...current,row]); setDraft(null); router.refresh();
    } catch(cause) { setError(cause instanceof Error ? cause.message : "Could not save."); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!draft?.id || !window.confirm(`Delete this ${singular}? ${mode === "assignments" ? "Its calendar deadline will be removed. Planner tasks are kept." : "This removes this occurrence only."}`)) return;
    setBusy(true); setError("");
    try { const response = await fetch(`/api/${viewId}/${mode}/${encodeURIComponent(String(draft.id))}`,{method:"DELETE"}); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Could not delete."); setRows(current => current.filter(r => r.id !== draft.id));setDraft(null);router.refresh(); }
    catch(cause) { setError(cause instanceof Error ? cause.message : "Could not delete."); } finally {setBusy(false);}
  };
  const dateField = (key:string,label:string,required=false) => <label data-design-id="m-7a137a430d00" className="block text-xs text-stone-500">{label}<input data-design-id="m-9a7ab9b1b231" required={required} type={dateOnly ? "date":"datetime-local"} className={field} value={localInput(String(draft?.[key] || "")).slice(0,dateOnly ? 10:16)} onChange={e => update(key,e.target.value || null)} /></label>;
  return <><button data-design-id="m-5ac2f0eaf35a" className={button} onClick={() => void load()}>{mode === "assignments" ? "Assignments & deadlines" : "Add / edit events"}</button>
    {open && <div data-design-id="m-d0846fa6e686" className="fixed inset-0 z-[150] flex items-center justify-center bg-black/25 p-5" role="dialog" aria-modal="true" aria-label={mode === "assignments" ? "Manage assignments":"Manage calendar events"}>
      <div data-design-id="m-11cfbbd0d3d7" className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl">
        <header data-design-id="m-3824711db38f" className="flex items-center justify-between border-b border-stone-100 p-5"><h2 data-design-id="m-f571e85c80d7" className="text-lg font-medium">{mode === "assignments" ? "Assignments & deadlines":"Calendar events"}{course ? ` · ${course.code}` : ""}</h2><button data-design-id="m-f9b4275f48e5" disabled={busy} className={button} onClick={() => {setOpen(false);setDraft(null);}}><DesignCopy id="m-f9b4275f48e5">Close</DesignCopy></button></header>
        {error && <p data-design-id="m-c91817eea37b" role="alert" className="bg-red-50 px-5 py-3 text-sm text-red-700">{error}</p>}
        <div data-design-id="m-a4d0fdf583ee" className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[280px_1fr]">
          <aside data-design-id="m-38c5b5ca3e6a" className="space-y-3 border-r border-stone-100 p-5"><button data-design-id="m-024286205091" className={button+" w-full"} disabled={busy} onClick={() => edit()}>+ New {singular}</button><input data-design-id="m-0b7b5cb568d3" aria-label={`Search ${mode}`} className={field} placeholder="Search…" value={query} onChange={e => setQuery(e.target.value)} />
            {rows.filter(row => (!course || row.courseSlug === course.slug || row.courseId === course.id) && row.title.toLowerCase().includes(query.toLowerCase())).sort((a,b) => String(a.dueAt || a.startsAt || "9999").localeCompare(String(b.dueAt || b.startsAt || "9999"))).map(row => <button data-design-id="m-8f9eae2435d0" data-design-key={row.id} key={row.id} onClick={() => edit(row)} className={"block w-full rounded-lg p-3 text-left text-sm "+(draft?.id === row.id ? "bg-stone-100":"hover:bg-stone-50")}><span data-design-id="m-34ff83e1c04e" className="block">{row.title}</span><span data-design-id="m-1c4cb0372dbd" className="mt-1 block text-xs text-stone-400">{String(row.dueAt || row.startsAt || "No date").replace("T"," · ").slice(0,25)}</span></button>)}
            {busy && <p data-design-id="m-aa6843effba9" className="text-xs text-stone-400"><DesignCopy id="m-aa6843effba9">Working…</DesignCopy></p>}
          </aside>
          <main data-design-id="m-d48335338509" className="p-6">{draft ? <form data-design-id="m-1d8c3908ccf8" className="space-y-4" onSubmit={e => {e.preventDefault();void persist();}}>
            <label data-design-id="m-8e43e0dde014" className="block text-xs text-stone-500">Title<input data-design-id="m-b7525f02d9b4" required maxLength={500} className={field} value={String(draft.title || "")} onChange={e => update("title",e.target.value)} /></label>
            <div data-design-id="m-506ee32a087b" className="grid gap-4 sm:grid-cols-2"><label data-design-id="m-2607c224e4c0" className="block text-xs text-stone-500">Course<select data-design-id="m-9140aba3bca7" className={field} value={String(draft[mode === "assignments" ? "courseSlug":"courseId"] || "unassigned")} onChange={e => update(mode === "assignments" ? "courseSlug":"courseId",e.target.value)}>{courses.map(c => <option key={c.id} value={mode === "assignments" ? c.slug:c.id}>{c.code}</option>)}</select></label><label data-design-id="m-2ea687641a54" className="block text-xs text-stone-500">Type<select data-design-id="m-3d5c5396c3dc" className={field} value={String(draft[mode === "assignments" ? "type":"kind"])} onChange={e => update(mode === "assignments" ? "type":"kind",e.target.value)}>{(mode === "assignments" ? ASSIGNMENT_TYPES:STORED_CALENDAR_KINDS).map(type => <option key={type} value={type}>{type.replaceAll("-"," ")}</option>)}</select></label></div>
            <label data-design-id="m-0595a03cf337" className="flex gap-2 text-xs text-stone-500"><input data-design-id="m-d0138546a67a" type="checkbox" checked={dateOnly} onChange={e => {setDateOnly(e.target.checked);for(const key of mode === "assignments" ? ["dueAt"]:["startsAt","endsAt"]) {const value=String(draft[key] || "");if(value)update(key,e.target.checked ? value.slice(0,10):value.length===10 ? value+"T09:00":value);}}} />Date only (no time)</label>
            {mode === "assignments" ? <>{dateField("dueAt","Due date (optional)")}<div data-design-id="m-5d33f80097a7" className="grid gap-4 sm:grid-cols-2"><label data-design-id="m-320d629ebd56" className="text-xs text-stone-500">Status<select data-design-id="m-bd37c0186aef" className={field} value={String(draft.status)} onChange={e => update("status",e.target.value)}>{["upcoming","submitted","graded"].map(s => <option key={s}>{s}</option>)}</select></label><label data-design-id="m-ffa778d3307b" className="text-xs text-stone-500">Grade weight (%)<input data-design-id="m-c88fbd86594f" type="number" min={0} max={100} step="any" className={field} value={draft.weight === null ? "":String(draft.weight ?? "")} onChange={e => update("weight",e.target.value === "" ? null:Number(e.target.value))} /></label></div><label data-design-id="m-f67961642a61" className="block text-xs text-stone-500">Description<textarea data-design-id="m-d0d498bf645c" className={field} rows={4} value={String(draft.description || "")} onChange={e => update("description",e.target.value)} /></label><p data-design-id="m-0c8fef5504e5" className="text-xs leading-5 text-stone-400"><DesignCopy id="m-0c8fef5504e5">Due date changes update the calendar and linked planner tasks together.</DesignCopy></p></> : <><div data-design-id="m-262117fada2c" className="grid gap-4 sm:grid-cols-2">{dateField("startsAt","Start",true)}{dateField("endsAt","End",true)}</div><label data-design-id="m-34cabc8bd5e3" className="block text-xs text-stone-500">Location<input data-design-id="m-2f59e04f5eee" className={field} value={String(draft.location || "")} onChange={e => update("location",e.target.value)} /></label>{!!draft.assignmentId && <p data-design-id="m-330d965a302e" className="text-xs text-stone-500"><DesignCopy id="m-330d965a302e">This event is linked to an assignment. Moving it also updates that assignment’s deadline.</DesignCopy></p>}</>}
            {mode==="calendar"&&<div data-design-id="m-72195cc7f703" className="space-y-2"><p data-design-id="m-e80ea94db244" className="text-xs text-stone-500"><DesignCopy id="m-e80ea94db244">Tags</DesignCopy></p><ObjectTagPicker kind="event" value={sanitizeTagIds(draft.tagIds,"event")} onChange={tagIds=>update("tagIds",tagIds)} disabled={busy}/></div>}
            <div data-design-id="m-279b173b9def" className="flex justify-between gap-3 border-t border-stone-100 pt-4">{draft.id ? <button data-design-id="m-99402f48fd1a" type="button" disabled={busy} className="text-xs text-red-700" onClick={() => void remove()}>Delete {singular}</button>:<span data-design-id="m-6d064b58d7f5"/>}<button data-design-id="m-11f3db6b2d1d" disabled={busy} className="rounded-lg bg-stone-900 px-5 py-2 text-sm text-white disabled:opacity-40">{busy ? "Saving…":"Save "+singular}</button></div>
          </form>:<p data-design-id="m-e394e47ab763" className="py-10 text-center text-sm text-stone-400">Select a {singular} to edit, or create a new one.</p>}</main>
        </div>
      </div>
    </div>}
  </>;
}
