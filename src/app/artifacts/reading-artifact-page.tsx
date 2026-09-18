"use client";
import { useEffect, useRef, useState } from "react";
import { useViewId } from "@/components/view-provider";
import { ArtifactShell } from "./artifact-shell";
import { MathText } from "@/components/ui/math-text";
import { PdfReadingViewer } from "@/components/pdf-reading-viewer";
import { readArtifactDraft, useArtifactSave } from "@/lib/use-artifact-save";
import type { ReadingAnnotation, ReadingArtifact } from "@/lib/mock-data";

const button = "rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm hover:bg-stone-50 disabled:opacity-40";
const field = "w-full rounded-lg border border-stone-200 p-3 text-sm outline-none focus:border-stone-500";
export default function ReadingArtifactPage({ artifact }: { artifact: ReadingArtifact }) {
  const viewId = useViewId();
  const { save, retry, status, error } = useArtifactSave(artifact.id, undefined, artifact);
  const [text, setText] = useState(artifact.bodyText ?? "");
  const [annotations, setAnnotations] = useState<ReadingAnnotation[]>(artifact.annotations ?? []);
  const [editing, setEditing] = useState(!artifact.bodyText?.trim());
  const [quote, setQuote] = useState("");
  const [anchor, setAnchor] = useState<number | undefined>();
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const [sourceDocumentId, setSourceDocumentId] = useState(artifact.sourceDocumentId);
  const [originalView, setOriginalView] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const article = useRef<HTMLElement>(null);
  useEffect(() => {
    const draft = readArtifactDraft(viewId, artifact.id);
    if (draft) {
      // Restore browser-only drafts after hydration, preserving the server's first render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (typeof draft.bodyText === "string") setText(draft.bodyText);
      if (Array.isArray(draft.annotations)) setAnnotations(draft.annotations as ReadingAnnotation[]);
      if (typeof draft.sourceDocumentId === "string") setSourceDocumentId(draft.sourceDocumentId);
      void save(draft);
    }
  }, [artifact.id, viewId, save]);
  const updateAnnotations = (next: ReadingAnnotation[]) => { setAnnotations(next); void save({ annotations: next }); };
  const captureSelection = () => {
    const selection = window.getSelection();
    if (!selection?.rangeCount || !article.current) return;
    const range = selection.getRangeAt(0);
    if (!article.current.contains(range.commonAncestorContainer)) return;
    const selected = selection.toString().trim();
    if (!selected) return;
    const before = range.cloneRange(); before.selectNodeContents(article.current); before.setEnd(range.startContainer, range.startOffset);
    const approximate = before.toString().length;
    let found = text.indexOf(selected), best = found;
    while (found >= 0) { if (Math.abs(found - approximate) < Math.abs(best - approximate)) best = found; found = text.indexOf(selected, found + 1); }
    setQuote(selected); setAnchor(best >= 0 ? best : undefined);
  };
  const exportNotes = () => {
    const output = artifact.title + "\n\n" + text + "\n\nANNOTATIONS\n\n" + annotations.map(a => (a.quote ? "> " + a.quote + "\n" : "") + a.note).join("\n\n");
    const url = URL.createObjectURL(new Blob([output], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = artifact.title + ".txt"; a.click(); URL.revokeObjectURL(url);
  };
  const anchored = annotations.map(a => { const start = a.start !== undefined && text.slice(a.start, a.start + a.quote.length) === a.quote ? a.start : a.quote ? text.indexOf(a.quote) : -1; return { ...a, start }; }).filter(a => a.start >= 0 && a.quote);
  const boundaries = [...new Set([0, text.length, ...anchored.flatMap(a => [a.start, a.start + a.quote.length])])].sort((a,b) => a-b);
  return <ArtifactShell artifact={artifact}>
    <div className="flex flex-wrap items-center gap-2">
      <button className={button} aria-pressed={!editing} onClick={() => setEditing(false)}>Read & annotate</button><button className={button} aria-pressed={editing} onClick={() => setEditing(true)}>Edit reading</button>
      <button className={button} onClick={exportNotes}>Export text & notes</button><button className={button} onClick={() => window.print()}>Print / PDF</button>
      <span className="ml-auto text-xs text-stone-500" role="status">{status}</span>{error && <button className="text-xs text-red-700" onClick={() => void retry()}>{error} · Retry</button>}
    </div>
    {sourceDocumentId && <div className="flex gap-4 text-xs text-stone-500"><a className="underline" href={`/api/${viewId}/documents/${sourceDocumentId}/file`} target="_blank" rel="noreferrer">Open original source file</a>{!originalView && <button className="underline" onClick={() => setOriginalView(true)}>Read original layout</button>}</div>}
    {editing ? <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-5">
      <p className="text-sm text-stone-500">Paste or import the reading. Existing notes are kept when you edit the source.</p>
      <input aria-label="Import reading file" type="file" accept=".pdf,.docx,.txt,.md" disabled={importing} className="text-sm" onChange={async e => {
        const file = e.target.files?.[0]; e.target.value = ""; if (!file) return;
        setImporting(true); setImportError("");
        try {
          const form = new FormData(); form.append("file", file);
          const res = await fetch(`/api/${viewId}/imports/text`, { method: "POST", body: form }); const result = await res.json();
          if (!res.ok) throw new Error(result.error || "Could not read this file.");
          setText(result.text); setSourceDocumentId(result.document.id); save({ bodyText: result.text, sourceDocumentId: result.document.id });
        } catch (cause) { setImportError(cause instanceof Error ? cause.message : "Import failed."); }
        finally { setImporting(false); }
      }} />
      {importing && <p className="text-xs text-stone-500">Reading your file…</p>}{importError && <p role="alert" className="text-sm text-red-700">{importError}</p>}
      <textarea aria-label="Reading text" className={field + " min-h-[420px] leading-7"} value={text} onChange={e => { setText(e.target.value); void save({ bodyText: e.target.value }); }} placeholder="Paste the reading here…" />
    </div> : sourceDocumentId && originalView ? <PdfReadingViewer key={sourceDocumentId} url={`/api/${viewId}/documents/${sourceDocumentId}/file`} onTextView={() => setOriginalView(false)} onQuote={selected => { setQuote(selected); setAnchor(undefined); }} /> : <>
      <p className="text-xs text-stone-500">Select a passage to quote it in a note. Click a highlighted passage to find its annotation.</p>
      <article ref={article} onMouseUp={captureSelection} onKeyUp={captureSelection} className="whitespace-pre-wrap rounded-xl border border-stone-200 bg-white px-8 py-8 text-base leading-8">
        {text ? boundaries.slice(0,-1).map((start, i) => { const end = boundaries[i+1]; const highlight = anchored.find(a => a.start <= start && a.start + a.quote.length >= end); return highlight ? <mark key={start} className="cursor-pointer rounded-sm bg-amber-100" onClick={() => { setActive(highlight.id); document.getElementById("annotation-" + highlight.id)?.scrollIntoView({ behavior: "smooth", block: "center" }); }}><MathText text={text.slice(start,end)} /></mark> : <MathText key={start} text={text.slice(start,end)} />; }) : <span className="text-stone-400">Add the reading in Edit reading.</span>}
      </article>
    </>}
    <section className="space-y-4 rounded-xl border border-stone-200 bg-white p-5">
      <h2 className="font-medium">Annotations <span className="text-sm text-stone-400">({annotations.length})</span></h2>
      <label className="block text-xs text-stone-500">Quoted passage<textarea className={field} rows={2} value={quote} onChange={e => { setQuote(e.target.value); setAnchor(undefined); }} placeholder="Select text above, or paste a quote…" /></label>
      <label className="block text-xs text-stone-500">Your note<textarea className={field} rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="What stands out? What questions do you have?" /></label>
      <button className={button} disabled={!quote.trim() && !note.trim()} onClick={() => { updateAnnotations([...annotations, { id: crypto.randomUUID(), quote: quote.trim(), note: note.trim(), ...(anchor !== undefined ? { start: anchor, end: anchor + quote.trim().length } : {}) }]); setQuote(""); setNote(""); setAnchor(undefined); window.getSelection()?.removeAllRanges(); }}>Add annotation</button>
      {!!annotations.length && <input className={field} aria-label="Search annotations" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes and quotes…" />}
      {annotations.filter(a => (a.quote + " " + a.note).toLowerCase().includes(search.toLowerCase())).map(a => <div id={"annotation-" + a.id} key={a.id} className={"space-y-3 rounded-lg border p-4 " + (active === a.id ? "border-amber-300 bg-amber-50" : "border-stone-100 bg-stone-50")}>
        {a.quote && <blockquote className="border-l-2 border-amber-300 pl-3 text-sm italic leading-relaxed"><MathText text={a.quote} /></blockquote>}
        {a.quote && !text.includes(a.quote) && <p className="text-xs text-amber-700">This passage no longer matches the reading. Your note is preserved.</p>}
        <textarea aria-label="Edit annotation note" className={field} rows={2} value={a.note} onChange={e => updateAnnotations(annotations.map(item => item.id === a.id ? { ...item, note: e.target.value } : item))} />
        <button className="text-xs text-red-700" onClick={() => updateAnnotations(annotations.filter(item => item.id !== a.id))}>Delete annotation</button>
      </div>)}
    </section>
  </ArtifactShell>;
}
