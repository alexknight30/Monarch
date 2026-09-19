"use client";
import { DesignCopy } from "@/components/design/runtime";

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
    <div data-design-id="m-b4b9708d275a" className="flex flex-wrap items-center gap-2">
      <button data-design-id="m-902819b46a04" className={button} aria-pressed={!editing} onClick={() => setEditing(false)}><DesignCopy id="m-902819b46a04">Read & annotate</DesignCopy></button><button data-design-id="m-93edcd78668e" className={button} aria-pressed={editing} onClick={() => setEditing(true)}><DesignCopy id="m-93edcd78668e">Edit reading</DesignCopy></button>
      <button data-design-id="m-0468040788bf" className={button} onClick={exportNotes}><DesignCopy id="m-0468040788bf">Export text & notes</DesignCopy></button><button data-design-id="m-efa573ff5b2e" className={button} onClick={() => window.print()}><DesignCopy id="m-efa573ff5b2e">Print / PDF</DesignCopy></button>
      <span data-design-id="m-3eaaeaea5713" className="ml-auto text-xs text-stone-500" role="status">{status}</span>{error && <button data-design-id="m-347e2ba7a59c" className="text-xs text-red-700" onClick={() => void retry()}>{error} · Retry</button>}
    </div>
    {sourceDocumentId && <div data-design-id="m-083122aacc3b" className="flex gap-4 text-xs text-stone-500"><a data-design-id="m-7a1e3b9b00b8" className="underline" href={`/api/${viewId}/documents/${sourceDocumentId}/file`} target="_blank" rel="noreferrer"><DesignCopy id="m-7a1e3b9b00b8">Open original source file</DesignCopy></a>{!originalView && <button data-design-id="m-a66930ff154c" className="underline" onClick={() => setOriginalView(true)}><DesignCopy id="m-a66930ff154c">Read original layout</DesignCopy></button>}</div>}
    {editing ? <div data-design-id="m-e3db144deee2" className="space-y-3 rounded-xl border border-stone-200 bg-white p-5">
      <p data-design-id="m-ac17321f369f" className="text-sm text-stone-500"><DesignCopy id="m-ac17321f369f">Paste or import the reading. Existing notes are kept when you edit the source.</DesignCopy></p>
      <input data-design-id="m-cbfad5f21eda" aria-label="Import reading file" type="file" accept=".pdf,.docx,.txt,.md" disabled={importing} className="text-sm" onChange={async e => {
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
      {importing && <p data-design-id="m-7a7cc335e81f" className="text-xs text-stone-500"><DesignCopy id="m-7a7cc335e81f">Reading your file…</DesignCopy></p>}{importError && <p data-design-id="m-1770bce7672e" role="alert" className="text-sm text-red-700">{importError}</p>}
      <textarea data-design-id="m-49729497fb91" aria-label="Reading text" className={field + " min-h-[420px] leading-7"} value={text} onChange={e => { setText(e.target.value); void save({ bodyText: e.target.value }); }} placeholder="Paste the reading here…" />
    </div> : sourceDocumentId && originalView ? <PdfReadingViewer key={sourceDocumentId} url={`/api/${viewId}/documents/${sourceDocumentId}/file`} onTextView={() => setOriginalView(false)} onQuote={selected => { setQuote(selected); setAnchor(undefined); }} /> : <>
      <p data-design-id="m-ba650cba581c" className="text-xs text-stone-500"><DesignCopy id="m-ba650cba581c">Select a passage to quote it in a note. Click a highlighted passage to find its annotation.</DesignCopy></p>
      <article data-design-id="m-c55f16077297" ref={article} onMouseUp={captureSelection} onKeyUp={captureSelection} className="whitespace-pre-wrap rounded-xl border border-stone-200 bg-white px-8 py-8 text-base leading-8">
        {text ? boundaries.slice(0,-1).map((start, i) => { const end = boundaries[i+1]; const highlight = anchored.find(a => a.start <= start && a.start + a.quote.length >= end); return highlight ? <mark data-design-id="m-7ff08033cd03" data-design-key={start} key={start} className="cursor-pointer rounded-sm bg-amber-100" onClick={() => { setActive(highlight.id); document.getElementById("annotation-" + highlight.id)?.scrollIntoView({ behavior: "smooth", block: "center" }); }}><MathText text={text.slice(start,end)} /></mark> : <MathText key={start} text={text.slice(start,end)} />; }) : <span data-design-id="m-e768701bf786" className="text-stone-400"><DesignCopy id="m-e768701bf786">Add the reading in Edit reading.</DesignCopy></span>}
      </article>
    </>}
    <section data-design-id="m-ece20184ebf3" className="space-y-4 rounded-xl border border-stone-200 bg-white p-5">
      <h2 data-design-id="m-85cdb2ed838a" className="font-medium">Annotations <span data-design-id="m-b550afd4ee5d" className="text-sm text-stone-400">({annotations.length})</span></h2>
      <label data-design-id="m-fef68757cc1a" className="block text-xs text-stone-500">Quoted passage<textarea data-design-id="m-f65f5ec487de" className={field} rows={2} value={quote} onChange={e => { setQuote(e.target.value); setAnchor(undefined); }} placeholder="Select text above, or paste a quote…" /></label>
      <label data-design-id="m-d396290a5658" className="block text-xs text-stone-500">Your note<textarea data-design-id="m-f233ceee828c" className={field} rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="What stands out? What questions do you have?" /></label>
      <button data-design-id="m-17cf6c6d20e2" className={button} disabled={!quote.trim() && !note.trim()} onClick={() => { updateAnnotations([...annotations, { id: crypto.randomUUID(), quote: quote.trim(), note: note.trim(), ...(anchor !== undefined ? { start: anchor, end: anchor + quote.trim().length } : {}) }]); setQuote(""); setNote(""); setAnchor(undefined); window.getSelection()?.removeAllRanges(); }}><DesignCopy id="m-17cf6c6d20e2">Add annotation</DesignCopy></button>
      {!!annotations.length && <input data-design-id="m-190645b8cdf9" className={field} aria-label="Search annotations" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes and quotes…" />}
      {annotations.filter(a => (a.quote + " " + a.note).toLowerCase().includes(search.toLowerCase())).map(a => <div data-design-id="m-aa4e7915f857" data-design-key={a.id} id={"annotation-" + a.id} key={a.id} className={"space-y-3 rounded-lg border p-4 " + (active === a.id ? "border-amber-300 bg-amber-50" : "border-stone-100 bg-stone-50")}>
        {a.quote && <blockquote data-design-id="m-6cbd73f25f11" className="border-l-2 border-amber-300 pl-3 text-sm italic leading-relaxed"><MathText text={a.quote} /></blockquote>}
        {a.quote && !text.includes(a.quote) && <p data-design-id="m-ef7355eb8c07" className="text-xs text-amber-700"><DesignCopy id="m-ef7355eb8c07">This passage no longer matches the reading. Your note is preserved.</DesignCopy></p>}
        <textarea data-design-id="m-416211eed0a3" aria-label="Edit annotation note" className={field} rows={2} value={a.note} onChange={e => updateAnnotations(annotations.map(item => item.id === a.id ? { ...item, note: e.target.value } : item))} />
        <button data-design-id="m-b4cc870a4d07" className="text-xs text-red-700" onClick={() => updateAnnotations(annotations.filter(item => item.id !== a.id))}><DesignCopy id="m-b4cc870a4d07">Delete annotation</DesignCopy></button>
      </div>)}
    </section>
  </ArtifactShell>;
}
