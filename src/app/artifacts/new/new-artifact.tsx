"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, NotebookPen, Network, Layers, Presentation, BookOpen, GraduationCap, ListChecks, ArrowRight, Sparkles, Check } from "lucide-react";
import { ARTIFACT_KIND_LABEL, type ArtifactKind, type Course, type Artifact } from "@/lib/mock-data";
import { useViewId } from "@/components/view-provider";
import { tagsForKind, type TagId } from "@/lib/objects/tags";

const kinds = [
  { kind: "document", icon: FileText, detail: "A focused space to write and revise." },
  { kind: "notes", icon: NotebookPen, detail: "Capture ideas, equations, and class notes." },
  { kind: "diagram", icon: Network, detail: "An infinite canvas for connected ideas." },
  { kind: "flashcards", icon: Layers, detail: "Practice recall, one concept at a time." },
  { kind: "slides", icon: Presentation, detail: "Build a presentation, from outline to stage." },
  { kind: "lesson", icon: GraduationCap, detail: "Learn in steps with an embedded tutor." },
  { kind: "practice-test", icon: ListChecks, detail: "Try questions, review, and try again." },
  { kind: "reading", icon: BookOpen, detail: "Read closely, highlight, and annotate." },
] as const;

export default function NewArtifact({ courses, artifacts }: { courses: Course[]; artifacts: Artifact[] }) {
  const viewId = useViewId();
  const router = useRouter();
  const [kind, setKind] = useState<ArtifactKind>("document");
  const [title, setTitle] = useState("");
  const [courseId, setCourseId] = useState("unassigned");
  const [tags, setTags] = useState<TagId[]>([]);
  const [source, setSource] = useState("");
  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const [generate, setGenerate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [sourceDocumentId, setSourceDocumentId] = useState<string | undefined>();
  const [importing, setImporting] = useState(false);

  async function importFile(file: File) {
    setImporting(true); setError(null);
    try {
      const form = new FormData(); form.append("file", file);
      const response = await fetch(`/api/${viewId}/imports/text`, { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not read this file.");
      setSource(result.text); setSourceDocumentId(result.document.id); setFileName(file.name);
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not import."); }
    finally { setImporting(false); }
  }

  async function create() {
    if (!title.trim() || busy || importing) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/${viewId}/artifacts${generate ? "/generate" : ""}`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), kind, courseId, tagIds: tags, bodyText: source, source, sourceIds, sourceDocumentId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not create your artifact.");
      router.push(`/artifacts/${result.artifact.slug}`);
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create."); setBusy(false); }
  }

  return <div className="flex-1 overflow-y-auto bg-[#fcfbf9] px-6 py-10 sm:px-12">
    <div className="mx-auto max-w-[1080px]">
      <Link href="/artifacts" className="text-sm text-stone-500">← Back to artifacts</Link>
      <h1 className="font-display mt-7 text-[38px] tracking-tight">Make room for a new idea.</h1>
      <p className="mt-2 text-sm text-stone-500">Choose how you want to work. Everything stays connected to your course.</p>
      {busy && generate && <div className="fixed inset-0 z-[150] flex items-center justify-center bg-stone-900/15 p-6 backdrop-blur-sm"><div role="status" aria-live="polite" className="w-full max-w-lg overflow-hidden rounded-2xl border border-violet-200 bg-white p-7 shadow-xl">
        <div className="flex items-center gap-4"><span className="flex size-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600"><Sparkles className="motion-safe:animate-pulse" size={24} /></span><div><p className="font-medium text-stone-800">Building your {ARTIFACT_KIND_LABEL[kind].toLowerCase()}</p><p className="mt-1 text-sm text-stone-500">Turning your material into a structured study session. This can take a minute.</p></div></div>
        <div aria-hidden="true" className="mt-6 space-y-3 motion-safe:animate-pulse"><div className="h-3 w-2/5 rounded-full bg-violet-100" /><div className="h-2 w-full rounded-full bg-stone-100" /><div className="h-2 w-4/5 rounded-full bg-stone-100" /><div className="mt-5 h-16 rounded-xl border border-stone-100 bg-stone-50" /></div>
      </div></div>}
      <div inert={busy}>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kinds.map(({ kind: type, icon: Icon, detail }) => <button key={type} type="button" aria-pressed={kind === type} onClick={() => { setKind(type); if (type === "reading") setGenerate(false); }} className={`relative rounded-xl border p-5 text-left transition hover:border-stone-400 ${kind === type ? "border-stone-900 bg-white shadow-sm" : "border-stone-200 bg-white/60"}`}>
          <Icon size={23} strokeWidth={1.5} className={kind === type ? "text-stone-900" : "text-stone-500"} />
          {kind === type && <Check size={14} className="absolute right-4 top-4" />}
          <p className="mt-5 text-sm font-medium">{ARTIFACT_KIND_LABEL[type]}</p><p className="mt-1 text-xs leading-5 text-stone-500">{detail}</p>
        </button>)}
      </div>
      <form onSubmit={(event) => { event.preventDefault(); void create(); }} className="mt-8 grid gap-8 rounded-2xl border border-stone-200 bg-white p-7 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          <label className="block text-xs font-medium text-stone-600">Title<input required autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`Untitled ${ARTIFACT_KIND_LABEL[kind].toLowerCase()}`} className="mt-2 h-11 w-full rounded-lg border border-stone-200 px-3 text-sm outline-none focus:border-stone-700" /></label>
          <label className="block text-xs font-medium text-stone-600">Starting material <span className="font-normal text-stone-400">· optional</span><textarea value={source} onChange={(e) => setSource(e.target.value)} rows={7} placeholder={kind === "reading" ? "Paste the reading you want to annotate…" : "Paste your notes, describe the topic, or add instructions…"} className="mt-2 w-full resize-y rounded-lg border border-stone-200 p-3 text-sm font-normal leading-6 outline-none focus:border-stone-700" /></label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-stone-500">{importing ? "Reading your file…" : "Import PDF, Word, or text"}<input type="file" disabled={importing || busy} accept=".pdf,.docx,.txt,.md,.csv,.tsv,.tex" className="max-w-48 text-xs" onChange={event => { const file = event.target.files?.[0]; if (file) void importFile(file); event.target.value = ""; }} /></label>
          {fileName && <p className="text-xs text-stone-400">{fileName}</p>}
          {kind !== "reading" && <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-[#f5f3ee] p-4"><input type="checkbox" checked={generate} onChange={(e) => setGenerate(e.target.checked)} className="mt-1 accent-stone-900" /><div><span className="flex items-center gap-2 text-sm font-medium"><Sparkles size={15} />Build study material with Monarch</span><p className="mt-1 text-xs leading-5 text-stone-500">Use the topic and linked sources to prepare material you can edit and study.</p></div></label>}
        </div>
        <div className="space-y-6">
          <label className="block text-xs font-medium text-stone-600">Course<select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="mt-2 h-10 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm">{courses.map((course) => <option key={course.id} value={course.id}>{course.code === "Unassigned" ? "Unassigned" : `${course.code} · ${course.title}`}</option>)}</select></label>
          <div><p className="text-xs font-medium text-stone-600">Tags</p><div className="mt-2 flex flex-wrap gap-2">{tagsForKind("artifact").map((tag) => <button key={tag.id} type="button" onClick={() => setTags(tags.includes(tag.id) ? tags.filter((id) => id !== tag.id) : [...tags, tag.id])} className={`rounded-full border px-3 py-1 text-xs ${tags.includes(tag.id) ? "border-orange-300 bg-orange-50 text-orange-800" : "border-stone-200 text-stone-500"}`}>{tag.label}</button>)}</div></div>
          <div><p className="text-xs font-medium text-stone-600">Linked sources</p><p className="mt-1 text-xs leading-5 text-stone-400">Monarch can read these when helping you.</p><div className="mt-3 max-h-52 space-y-3 overflow-y-auto">{artifacts.filter((a) => courseId === "unassigned" || a.courseId === courseId).map((a) => <label key={a.id} className="flex items-start gap-2 text-xs"><input type="checkbox" checked={sourceIds.includes(a.id)} onChange={(e) => setSourceIds(e.target.checked ? [...sourceIds, a.id] : sourceIds.filter((id) => id !== a.id))} className="accent-stone-900" /><span>{a.title}<span className="block pt-1 text-stone-400">{ARTIFACT_KIND_LABEL[a.kind]}</span></span></label>)}{!artifacts.length && <p className="text-xs text-stone-400">Your saved artifacts will appear here.</p>}</div></div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-stone-100 pt-5 lg:col-span-2"><p role="alert" className="max-w-lg text-sm text-red-700">{error}</p><button disabled={busy || !title.trim()} className="ml-auto flex items-center gap-3 rounded-lg bg-stone-900 px-5 py-3 text-sm font-medium text-white disabled:opacity-40">{busy ? (generate ? "Preparing your material…" : "Creating…") : `Create ${ARTIFACT_KIND_LABEL[kind].toLowerCase()}`}<ArrowRight size={16} /></button></div>
      </form>
      </div>
    </div>
  </div>;
}
