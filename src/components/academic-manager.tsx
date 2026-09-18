"use client";
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
  const dateField = (key:string,label:string,required=false) => <label className="block text-xs text-stone-500">{label}<input required={required} type={dateOnly ? "date":"datetime-local"} className={field} value={localInput(String(draft?.[key] || "")).slice(0,dateOnly ? 10:16)} onChange={e => update(key,e.target.value || null)} /></label>;
  return <><button className={button} onClick={() => void load()}>{mode === "assignments" ? "Assignments & deadlines" : "Add / edit events"}</button>
    {open && <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/25 p-5" role="dialog" aria-modal="true" aria-label={mode === "assignments" ? "Manage assignments":"Manage calendar events"}>
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-stone-100 p-5"><h2 className="text-lg font-medium">{mode === "assignments" ? "Assignments & deadlines":"Calendar events"}{course ? ` · ${course.code}` : ""}</h2><button disabled={busy} className={button} onClick={() => {setOpen(false);setDraft(null);}}>Close</button></header>
        {error && <p role="alert" className="bg-red-50 px-5 py-3 text-sm text-red-700">{error}</p>}
        <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[280px_1fr]">
          <aside className="space-y-3 border-r border-stone-100 p-5"><button className={button+" w-full"} disabled={busy} onClick={() => edit()}>+ New {singular}</button><input aria-label={`Search ${mode}`} className={field} placeholder="Search…" value={query} onChange={e => setQuery(e.target.value)} />
            {rows.filter(row => (!course || row.courseSlug === course.slug || row.courseId === course.id) && row.title.toLowerCase().includes(query.toLowerCase())).sort((a,b) => String(a.dueAt || a.startsAt || "9999").localeCompare(String(b.dueAt || b.startsAt || "9999"))).map(row => <button key={row.id} onClick={() => edit(row)} className={"block w-full rounded-lg p-3 text-left text-sm "+(draft?.id === row.id ? "bg-stone-100":"hover:bg-stone-50")}><span className="block">{row.title}</span><span className="mt-1 block text-xs text-stone-400">{String(row.dueAt || row.startsAt || "No date").replace("T"," · ").slice(0,25)}</span></button>)}
            {busy && <p className="text-xs text-stone-400">Working…</p>}
          </aside>
          <main className="p-6">{draft ? <form className="space-y-4" onSubmit={e => {e.preventDefault();void persist();}}>
            <label className="block text-xs text-stone-500">Title<input required maxLength={500} className={field} value={String(draft.title || "")} onChange={e => update("title",e.target.value)} /></label>
            <div className="grid gap-4 sm:grid-cols-2"><label className="block text-xs text-stone-500">Course<select className={field} value={String(draft[mode === "assignments" ? "courseSlug":"courseId"] || "unassigned")} onChange={e => update(mode === "assignments" ? "courseSlug":"courseId",e.target.value)}>{courses.map(c => <option key={c.id} value={mode === "assignments" ? c.slug:c.id}>{c.code}</option>)}</select></label><label className="block text-xs text-stone-500">Type<select className={field} value={String(draft[mode === "assignments" ? "type":"kind"])} onChange={e => update(mode === "assignments" ? "type":"kind",e.target.value)}>{(mode === "assignments" ? ASSIGNMENT_TYPES:STORED_CALENDAR_KINDS).map(type => <option key={type} value={type}>{type.replaceAll("-"," ")}</option>)}</select></label></div>
            <label className="flex gap-2 text-xs text-stone-500"><input type="checkbox" checked={dateOnly} onChange={e => {setDateOnly(e.target.checked);for(const key of mode === "assignments" ? ["dueAt"]:["startsAt","endsAt"]) {const value=String(draft[key] || "");if(value)update(key,e.target.checked ? value.slice(0,10):value.length===10 ? value+"T09:00":value);}}} />Date only (no time)</label>
            {mode === "assignments" ? <>{dateField("dueAt","Due date (optional)")}<div className="grid gap-4 sm:grid-cols-2"><label className="text-xs text-stone-500">Status<select className={field} value={String(draft.status)} onChange={e => update("status",e.target.value)}>{["upcoming","submitted","graded"].map(s => <option key={s}>{s}</option>)}</select></label><label className="text-xs text-stone-500">Grade weight (%)<input type="number" min={0} max={100} step="any" className={field} value={draft.weight === null ? "":String(draft.weight ?? "")} onChange={e => update("weight",e.target.value === "" ? null:Number(e.target.value))} /></label></div><label className="block text-xs text-stone-500">Description<textarea className={field} rows={4} value={String(draft.description || "")} onChange={e => update("description",e.target.value)} /></label><p className="text-xs leading-5 text-stone-400">Due date changes update the calendar and linked planner tasks together.</p></> : <><div className="grid gap-4 sm:grid-cols-2">{dateField("startsAt","Start",true)}{dateField("endsAt","End",true)}</div><label className="block text-xs text-stone-500">Location<input className={field} value={String(draft.location || "")} onChange={e => update("location",e.target.value)} /></label>{!!draft.assignmentId && <p className="text-xs text-stone-500">This event is linked to an assignment. Moving it also updates that assignment’s deadline.</p>}</>}
            {mode==="calendar"&&<div className="space-y-2"><p className="text-xs text-stone-500">Tags</p><ObjectTagPicker kind="event" value={sanitizeTagIds(draft.tagIds,"event")} onChange={tagIds=>update("tagIds",tagIds)} disabled={busy}/></div>}
            <div className="flex justify-between gap-3 border-t border-stone-100 pt-4">{draft.id ? <button type="button" disabled={busy} className="text-xs text-red-700" onClick={() => void remove()}>Delete {singular}</button>:<span/>}<button disabled={busy} className="rounded-lg bg-stone-900 px-5 py-2 text-sm text-white disabled:opacity-40">{busy ? "Saving…":"Save "+singular}</button></div>
          </form>:<p className="py-10 text-center text-sm text-stone-400">Select a {singular} to edit, or create a new one.</p>}</main>
        </div>
      </div>
    </div>}
  </>;
}
