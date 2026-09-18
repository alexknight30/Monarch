"use client";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import { useViewId } from "@/components/view-provider";
import { LinkedObjectsPanel } from "@/components/linked-objects-panel";
import { MathText } from "@/components/ui/math-text";
import { readArtifactDraft, useArtifactSave } from "@/lib/use-artifact-save";
import { slideElements, exportPowerPoint } from "@/lib/slides";
import type { Slide, SlideElement, SlidesArtifact } from "@/lib/mock-data";

const button = "rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs hover:bg-stone-50 disabled:opacity-40";
const field = "w-full rounded border border-stone-200 bg-white px-2 py-1.5 text-xs outline-none";
function ElementView({ element }: { element: SlideElement }) {
  // User-uploaded local assets must keep their original dimensions and work in print.
  // eslint-disable-next-line @next/next/no-img-element
  if (element.type === "image") return <img src={element.src} alt={element.text || "Slide image"} draggable={false} className="h-full w-full object-contain" />;
  if (element.type === "text") return <div className="h-full w-full whitespace-pre-wrap break-words leading-[1.2]" style={{ color: element.color, fontSize: element.fontSize / 9.6 + "cqw", fontWeight: element.bold ? 700 : 400, textAlign: element.align || "left" }}><MathText text={element.text || ""} /></div>;
  return <div className="h-full w-full border-2" style={{ borderColor: element.color, background: element.fill, borderRadius: element.type === "ellipse" ? "50%" : 0 }} />;
}
function SlideView({ slide }: { slide: Slide }) {
  return <div className="relative aspect-video w-full overflow-hidden" style={{ background: slide.background || "#fff", containerType: "inline-size" }}>{slideElements(slide).map(element => <div key={element.id} className="absolute" style={{ left: element.x / 9.6 + "%", top: element.y / 5.4 + "%", width: element.width / 9.6 + "%", height: element.height / 5.4 + "%", transform: "rotate(" + (element.rotation || 0) + "deg)" }}><ElementView element={element} /></div>)}</div>;
}

export default function SlidesArtifactPage({ artifact }: { artifact: SlidesArtifact }) {
  const viewId = useViewId();
  const { save, retry, status, error } = useArtifactSave(artifact.id, undefined, artifact);
  const [slides, setSlides] = useState<Slide[]>(artifact.slides.length ? artifact.slides : [{ id: "initial", title: artifact.title, bodyHtml: "" }]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string | null>(null);
  const [presenting, setPresenting] = useState(false);
  const [linksOpen, setLinksOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [title, setTitle] = useState(artifact.title);
  const [historyCounts, setHistoryCounts] = useState({ past: 0, future: 0 });
  const history = useRef<{ past: Slide[][]; future: Slide[][] }>({ past: [], future: [] });
  const slidesRef = useRef(slides);
  const canvas = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; startY: number; element: SlideElement; original: Slide[]; slideId: string; mode: "move" | "resize"; scale: number } | null>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const currentIndex = Math.min(index, slides.length - 1);
  const current = slides[currentIndex];
  const elements = current ? slideElements(current) : [];
  const element = elements.find(e => e.id === selected);
  useEffect(() => { slidesRef.current = slides; }, [slides]);
  useEffect(() => {
    const draft = readArtifactDraft(viewId, artifact.id);
    if (draft) {
      // Restore browser-only drafts after hydration, preserving the server's first render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (Array.isArray(draft.slides) && draft.slides.length) { setSlides(draft.slides as Slide[]); slidesRef.current = draft.slides as Slide[]; }
      if (typeof draft.title === "string") setTitle(draft.title);
      void save(draft);
    }
  }, [artifact.id, viewId, save]);
  const commit = (next: Slide[], record = true) => {
    if (record) { history.current.past.push(slidesRef.current); if (history.current.past.length > 100) history.current.past.shift(); history.current.future = []; setHistoryCounts({ past: history.current.past.length, future: 0 }); }
    slidesRef.current = next; setSlides(next); void save({ slides: next });
  };
  const updateCurrent = (patch: Partial<Slide>) => commit(slides.map(s => s.id === current.id ? { ...s, ...patch } : s));
  const updateElement = (patch: Partial<SlideElement>) => updateCurrent({ elements: elements.map(e => e.id === selected ? { ...e, ...patch } : e) });
  const addElement = (type: SlideElement["type"], src?: string) => {
    const next: SlideElement = { id: crypto.randomUUID(), type, x: 160, y: 180, width: type === "text" ? 500 : 280, height: type === "text" ? 110 : 200, text: type === "text" ? "Your text" : "", color: "#292524", fill: type === "text" || type === "image" ? "transparent" : "#ddd6fe", fontSize: 32, src };
    updateCurrent({ elements: [...elements, next] }); setSelected(next.id);
  };
  const moveHistory = (direction: "undo" | "redo") => {
    const from = direction === "undo" ? history.current.past : history.current.future;
    const to = direction === "undo" ? history.current.future : history.current.past;
    const next = from.pop(); if (!next) return; to.push(slidesRef.current); commit(next, false); setIndex(i => Math.min(i, next.length - 1)); setSelected(null); setHistoryCounts({ past: history.current.past.length, future: history.current.future.length });
  };
  const startDrag = (event: ReactPointerEvent, target: SlideElement, mode: "move" | "resize") => {
    if (editingText === target.id) return;
    if (event.button !== 0) return;
    event.stopPropagation(); event.preventDefault(); setSelected(target.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startX: event.clientX, startY: event.clientY, element: { ...target }, original: slidesRef.current, slideId: current.id, mode, scale: (canvas.current?.getBoundingClientRect().width || 960) / 960 };
  };
  const dragMove = (event: ReactPointerEvent) => {
    const action = drag.current; if (!action) return;
    const dx = (event.clientX - action.startX) / action.scale, dy = (event.clientY - action.startY) / action.scale;
    const changes = action.mode === "move" ? { x: Math.max(0, Math.min(940, action.element.x + dx)), y: Math.max(0, Math.min(520, action.element.y + dy)) } : { width: Math.max(24, Math.min(960 - action.element.x, action.element.width + dx)), height: Math.max(24, Math.min(540 - action.element.y, action.element.height + dy)) };
    const next = slidesRef.current.map(s => s.id === action.slideId ? { ...s, elements: slideElements(s).map(e => e.id === action.element.id ? { ...e, ...changes } : e) } : s);
    slidesRef.current = next; setSlides(next);
  };
  const endDrag = () => {
    const action = drag.current; if (!action) return; drag.current = null;
    history.current.past.push(action.original); history.current.future = []; setHistoryCounts({ past: history.current.past.length, future: 0 }); void save({ slides: slidesRef.current });
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.closest("input, textarea, select, [contenteditable]")) return;
      if (presenting) {
        if (event.key === "Escape") setPresenting(false);
        if (["ArrowRight", "ArrowDown", " "].includes(event.key)) { event.preventDefault(); setIndex(i => Math.min(slides.length - 1, i + 1)); }
        if (["ArrowLeft", "ArrowUp"].includes(event.key)) { event.preventDefault(); setIndex(i => Math.max(0, i - 1)); }
      }
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [presenting, slides.length]);
  const addSlide = (layout: "title" | "content" | "blank") => {
    const next: Slide = { id: crypto.randomUUID(), title: layout === "title" ? "Presentation title" : "New slide", bodyHtml: layout === "content" ? "<p>Your main points</p>" : "", background: "#ffffff" };
    if (layout === "blank") next.elements = [];
    if (layout === "title") next.elements = [{ ...slideElements(next)[0], y: 160, height: 180, fontSize: 54, align: "center" }];
    commit([...slides.slice(0,currentIndex+1), next, ...slides.slice(currentIndex+1)]); setIndex(currentIndex+1); setSelected(null);
  };
  const uploadImage = async (file: File) => {
    setBusy(true); setNotice("");
    try { const form = new FormData(); form.append("file", file); const res = await fetch("/api/" + viewId + "/assets", { method: "POST", body: form }); const result = await res.json(); if (!res.ok) throw new Error(result.error || "Image upload failed."); addElement("image", result.src); }
    catch (cause) { setNotice(cause instanceof Error ? cause.message : "Image upload failed."); }
    finally { setBusy(false); }
  };
  return <div className="flex min-h-0 flex-1 flex-col bg-stone-50">
    <style>{`@media print { body * { visibility: hidden; } .monarch-print-deck, .monarch-print-deck * { visibility: visible; } .monarch-print-deck { display:block !important; position:absolute; left:0; top:0; width:100%; } .monarch-print-slide { break-after:page; width:100%; } @page { size:landscape; margin:0; } }`}</style>
    <header className="flex flex-wrap items-center gap-3 border-b border-stone-200 bg-white px-5 py-3">
      <Link href="/artifacts" className="text-sm text-stone-500">← Artifacts</Link>
      <input aria-label="Presentation title" className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none" value={title} onChange={e => { setTitle(e.target.value); if (e.target.value.trim()) void save({ title: e.target.value }); }} />
      <span className="text-xs text-stone-400" role="status">{status}</span><button className={button} onClick={() => setLinksOpen(v => !v)}>Linked context</button>
      <button className={button} onClick={() => window.print()}>Print / PDF</button>
      <button className={button} disabled={busy} onClick={async () => { setBusy(true); setNotice(""); try { await exportPowerPoint(slides, title); } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Export failed."); } finally { setBusy(false); } }}>Export PowerPoint</button>
      <button className="rounded-lg bg-stone-900 px-4 py-1.5 text-xs text-white" onClick={() => setPresenting(true)}>Present</button>
    </header>
    {(notice || error) && <div role="alert" className="bg-amber-50 px-5 py-2 text-sm">{notice || error}{error && <button className="ml-3 underline" onClick={() => void retry()}>Retry save</button>}</div>}
    <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 bg-white px-5 py-2">
      <button className={button} disabled={!historyCounts.past} onClick={() => moveHistory("undo")}>Undo</button><button className={button} disabled={!historyCounts.future} onClick={() => moveHistory("redo")}>Redo</button>
      <span className="mx-1 h-5 border-l border-stone-200" />
      <button className={button} onClick={() => addElement("text")}>Text box</button><button className={button} onClick={() => addElement("rectangle")}>Rectangle</button><button className={button} onClick={() => addElement("ellipse")}>Ellipse</button><button className={button} disabled={busy} onClick={() => imageInput.current?.click()}>Image</button>
      <input ref={imageInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={e => { if (e.target.files?.[0]) void uploadImage(e.target.files[0]); e.target.value = ""; }} />
      <label className="ml-auto flex items-center gap-2 text-xs text-stone-500">Background<input aria-label="Slide background" type="color" value={current.background || "#ffffff"} onChange={e => updateCurrent({ background: e.target.value })} /></label>
    </div>
    <div className="flex min-h-0 flex-1">
      <aside className="w-44 shrink-0 overflow-y-auto border-r border-stone-200 bg-white p-3">
        {slides.map((s,i) => <button key={s.id} className={"mb-3 w-full rounded border-2 p-1 text-left " + (currentIndex === i ? "border-violet-500" : "border-transparent hover:border-stone-300")} onClick={() => { setIndex(i); setSelected(null); }} aria-label={"Slide " + (i+1) + ": " + s.title}><div className="mb-1 text-[10px] text-stone-400">{i+1}</div><div className="pointer-events-none overflow-hidden rounded border border-stone-200"><SlideView slide={s} /></div></button>)}
        <select aria-label="New slide layout" className={field} value="" onChange={e => { if (e.target.value) addSlide(e.target.value as "title" | "content" | "blank"); }}><option value="">+ New slide</option><option value="title">Title slide</option><option value="content">Title & body</option><option value="blank">Blank</option></select>
        <div className="mt-3 flex flex-col gap-2">
          <button className={button} onClick={() => { const copy = { ...current, id: crypto.randomUUID(), elements: elements.map(e => ({ ...e, id: crypto.randomUUID() })) }; commit([...slides.slice(0,currentIndex+1),copy,...slides.slice(currentIndex+1)]); setIndex(currentIndex+1); setSelected(null); }}>Duplicate slide</button>
          <button className={button} disabled={currentIndex === 0} onClick={() => { const next = [...slides]; [next[currentIndex-1],next[currentIndex]] = [next[currentIndex],next[currentIndex-1]]; commit(next); setIndex(currentIndex-1); }}>Move up</button>
          <button className={button} disabled={currentIndex === slides.length-1} onClick={() => { const next = [...slides]; [next[currentIndex+1],next[currentIndex]] = [next[currentIndex],next[currentIndex+1]]; commit(next); setIndex(currentIndex+1); }}>Move down</button>
          <button className={button} disabled={slides.length <= 1} onClick={() => { commit(slides.filter(s => s.id !== current.id)); setIndex(Math.max(0,currentIndex-1)); setSelected(null); }}>Delete slide</button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-y-auto p-6">
        <div ref={canvas} className="relative mx-auto aspect-video w-full max-w-[1100px] shadow-md" style={{ background: current.background || "#ffffff", containerType: "inline-size" }} onPointerDown={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          {elements.map(e => <div key={e.id} role="button" tabIndex={0} aria-label={e.type === "text" ? "Text: " + e.text : e.type} onDoubleClick={() => { if (e.type === "text") { setSelected(e.id); setEditingText(e.id); } }} onFocus={() => setSelected(e.id)} className={"absolute touch-none select-none " + (selected === e.id ? "outline-2 outline-violet-500" : "hover:outline-1 hover:outline-violet-300")} style={{ left: e.x/9.6 + "%", top: e.y/5.4 + "%", width: e.width/9.6 + "%", height: e.height/5.4 + "%", transform: "rotate(" + (e.rotation || 0) + "deg)", cursor: "move" }} onPointerDown={event => startDrag(event,e,"move")} onPointerMove={dragMove} onPointerUp={endDrag} onPointerCancel={endDrag} onKeyDown={event => { if (event.key === "Enter" && e.type === "text") { event.preventDefault(); setEditingText(e.id); return; } if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key)) { event.preventDefault(); const step = event.shiftKey ? 10 : 1; updateCurrent({ elements: elements.map(item => item.id === e.id ? { ...item, x: Math.max(0,Math.min(940,item.x + (event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0))), y: Math.max(0,Math.min(520,item.y + (event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0))) } : item) }); } }}>
            {editingText === e.id && e.type === "text" ? <textarea autoFocus aria-label="Edit slide text inline" value={e.text || ""} onChange={event => updateCurrent({ elements: elements.map(item => item.id === e.id ? { ...item, text: event.target.value } : item) })} onBlur={() => setEditingText(null)} onPointerDown={event => event.stopPropagation()} onKeyDown={event => { event.stopPropagation(); if (event.key === "Escape") { event.preventDefault(); setEditingText(null); } }} className="h-full w-full resize-none border-0 bg-transparent p-0 leading-[1.2] outline-none" style={{ color: e.color, fontSize: e.fontSize / 9.6 + "cqw", fontWeight: e.bold ? 700 : 400, textAlign: e.align || "left" }} /> : <div className="h-full w-full overflow-hidden" onDoubleClick={event => { if (e.type === "text") { event.stopPropagation(); setSelected(e.id); setEditingText(e.id); } }}><ElementView element={e} /></div>}
            {selected === e.id && <span role="button" aria-label="Resize selected element" className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-se-resize border border-violet-600 bg-white" onPointerDown={event => startDrag(event,e,"resize")} />}
          </div>)}
        </div>
        <label className="mx-auto mt-6 block max-w-[1100px] text-xs text-stone-500">Speaker notes<textarea className={field + " mt-2 min-h-24"} value={current.notes || ""} onChange={e => updateCurrent({ notes: e.target.value })} placeholder="Notes visible to you, included in PowerPoint export…" /></label>
      </main>
      <aside className="w-60 shrink-0 space-y-4 overflow-y-auto border-l border-stone-200 bg-white p-4">
        {linksOpen && <LinkedObjectsPanel object={{ kind: "artifact", id: artifact.id }} />}
        <label className="block text-xs text-stone-500">Slide name<input className={field + " mt-1"} value={current.title} onChange={e => updateCurrent({ title: e.target.value })} /></label>
        {element ? <>
          <h2 className="text-sm font-medium capitalize">{element.type} properties</h2>
          {(element.type === "text" || element.type === "image") && <label className="block text-xs text-stone-500">{element.type === "text" ? "Text (equations: $...$)" : "Image description"}<textarea className={field + " mt-1"} rows={6} value={element.text || ""} onChange={e => updateElement({ text: e.target.value })} /></label>}
          <div className="grid grid-cols-2 gap-2">{(["x","y","width","height","rotation"] as const).map(key => <label key={key} className="text-xs text-stone-500 capitalize">{key}<input type="number" className={field} value={Math.round(element[key] || 0)} onChange={e => { const n = Number(e.target.value); if (Number.isFinite(n)) updateElement({ [key]: key === "width" || key === "height" ? Math.max(24,n) : n }); }} /></label>)}</div>
          <div className="flex items-center justify-between text-xs"><label>Color <input aria-label="Element color" type="color" value={element.color} onChange={e => updateElement({ color: e.target.value })} /></label>{element.type !== "text" && element.type !== "image" && <label>Fill <input aria-label="Shape fill" type="color" value={element.fill === "transparent" ? "#ffffff" : element.fill} onChange={e => updateElement({ fill: e.target.value })} /></label>}</div>
          {element.type === "text" && <><label className="block text-xs text-stone-500">Font size<input className={field} type="number" min={8} max={160} value={element.fontSize} onChange={e => updateElement({ fontSize: Math.max(8,Math.min(160,Number(e.target.value))) })} /></label><div className="flex gap-2"><button className={button} aria-pressed={!!element.bold} onClick={() => updateElement({ bold: !element.bold })}>Bold</button><select aria-label="Text alignment" className={field} value={element.align || "left"} onChange={e => updateElement({ align: e.target.value as SlideElement["align"] })}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></div></>}
          <div className="flex flex-wrap gap-2"><button className={button} onClick={() => updateElement({ x: (960 - element.width)/2 })}>Center horizontally</button><button className={button} onClick={() => updateElement({ y: (540 - element.height)/2 })}>Center vertically</button><button className={button} onClick={() => updateCurrent({ elements: [...elements.filter(e => e.id !== selected),element] })}>Bring to front</button><button className={button} onClick={() => updateCurrent({ elements: [element,...elements.filter(e => e.id !== selected)] })}>Send to back</button><button className={button} onClick={() => { const copy = { ...element,id:crypto.randomUUID(),x:element.x+20,y:element.y+20 }; updateCurrent({ elements:[...elements,copy] }); setSelected(copy.id); }}>Duplicate</button><button className={button} onClick={() => { updateCurrent({ elements:elements.filter(e => e.id !== selected) }); setSelected(null); }}>Delete</button></div>
        </> : <p className="text-xs leading-5 text-stone-400">Select an element to edit it. Drag to move; use the corner handle to resize. Arrow keys move selected elements.</p>}
      </aside>
    </div>
    {presenting && <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black p-5"><div className="w-full max-w-[calc((100vh-100px)*16/9)]"><SlideView slide={current} /></div><div className="mt-4 flex items-center gap-6 text-sm text-white"><button disabled={currentIndex === 0} onClick={() => setIndex(i => Math.max(0,i-1))}>← Previous</button><span>{currentIndex+1} / {slides.length}</span><button disabled={currentIndex === slides.length-1} onClick={() => setIndex(i => Math.min(slides.length-1,i+1))}>Next →</button><button onClick={() => setPresenting(false)}>Exit · Esc</button></div></div>}
    <div className="monarch-print-deck hidden">{slides.map(s => <div key={s.id} className="monarch-print-slide"><SlideView slide={s} /></div>)}</div>
  </div>;
}
