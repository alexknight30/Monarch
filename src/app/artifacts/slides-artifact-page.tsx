"use client";
import { DesignCopy } from "@/components/design/runtime";

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
  if (element.type === "image") return <img data-design-id="m-9ea89ca82e59" src={element.src} alt={element.text || "Slide image"} draggable={false} className="h-full w-full object-contain" />;
  if (element.type === "text") return <div data-design-id="m-2ffe519bccc6" className="h-full w-full whitespace-pre-wrap break-words leading-[1.2]" style={{ color: element.color, fontSize: element.fontSize / 9.6 + "cqw", fontWeight: element.bold ? 700 : 400, textAlign: element.align || "left" }}><MathText text={element.text || ""} /></div>;
  return <div data-design-id="m-bab0a38f3698" className="h-full w-full border-2" style={{ borderColor: element.color, background: element.fill, borderRadius: element.type === "ellipse" ? "50%" : 0 }} />;
}
function SlideView({ slide }: { slide: Slide }) {
  return <div data-design-id="m-4f74fa8108e0" className="relative aspect-video w-full overflow-hidden" style={{ background: slide.background || "#fff", containerType: "inline-size" }}>{slideElements(slide).map(element => <div data-design-id="m-9ba08c6b84aa" data-design-key={element.id} key={element.id} className="absolute" style={{ left: element.x / 9.6 + "%", top: element.y / 5.4 + "%", width: element.width / 9.6 + "%", height: element.height / 5.4 + "%", transform: "rotate(" + (element.rotation || 0) + "deg)" }}><ElementView element={element} /></div>)}</div>;
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
  return <div data-design-id="m-77c8da636797" className="flex min-h-0 flex-1 flex-col bg-stone-50">
    <style>{`@media print { body * { visibility: hidden; } .monarch-print-deck, .monarch-print-deck * { visibility: visible; } .monarch-print-deck { display:block !important; position:absolute; left:0; top:0; width:100%; } .monarch-print-slide { break-after:page; width:100%; } @page { size:landscape; margin:0; } }`}</style>
    <header data-design-id="m-989d3c1b867b" className="flex flex-wrap items-center gap-3 border-b border-stone-200 bg-white px-5 py-3">
      <Link data-design-id="m-81aa870b4506" href="/artifacts" className="text-sm text-stone-500"><DesignCopy id="m-81aa870b4506">← Artifacts</DesignCopy></Link>
      <input data-design-id="m-6b690623d543" aria-label="Presentation title" className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none" value={title} onChange={e => { setTitle(e.target.value); if (e.target.value.trim()) void save({ title: e.target.value }); }} />
      <span data-design-id="m-19fd1db69941" className="text-xs text-stone-400" role="status">{status}</span><button data-design-id="m-66c2d694c52d" className={button} onClick={() => setLinksOpen(v => !v)}><DesignCopy id="m-66c2d694c52d">Linked context</DesignCopy></button>
      <button data-design-id="m-df304ae4b7c4" className={button} onClick={() => window.print()}><DesignCopy id="m-df304ae4b7c4">Print / PDF</DesignCopy></button>
      <button data-design-id="m-36f563b958a1" className={button} disabled={busy} onClick={async () => { setBusy(true); setNotice(""); try { await exportPowerPoint(slides, title); } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Export failed."); } finally { setBusy(false); } }}><DesignCopy id="m-36f563b958a1">Export PowerPoint</DesignCopy></button>
      <button data-design-id="m-ecfc87e80502" className="rounded-lg bg-stone-900 px-4 py-1.5 text-xs text-white" onClick={() => setPresenting(true)}><DesignCopy id="m-ecfc87e80502">Present</DesignCopy></button>
    </header>
    {(notice || error) && <div data-design-id="m-a2819c1ad63d" role="alert" className="bg-amber-50 px-5 py-2 text-sm">{notice || error}{error && <button data-design-id="m-5a39c90e5f9a" className="ml-3 underline" onClick={() => void retry()}><DesignCopy id="m-5a39c90e5f9a">Retry save</DesignCopy></button>}</div>}
    <div data-design-id="m-e1a14c7a2cc8" className="flex flex-wrap items-center gap-2 border-b border-stone-200 bg-white px-5 py-2">
      <button data-design-id="m-667956d01b07" className={button} disabled={!historyCounts.past} onClick={() => moveHistory("undo")}><DesignCopy id="m-667956d01b07">Undo</DesignCopy></button><button data-design-id="m-ca6965362876" className={button} disabled={!historyCounts.future} onClick={() => moveHistory("redo")}><DesignCopy id="m-ca6965362876">Redo</DesignCopy></button>
      <span data-design-id="m-5704bbe8d7a9" className="mx-1 h-5 border-l border-stone-200" />
      <button data-design-id="m-33f4b049fa2e" className={button} onClick={() => addElement("text")}><DesignCopy id="m-33f4b049fa2e">Text box</DesignCopy></button><button data-design-id="m-6be766ec99ac" className={button} onClick={() => addElement("rectangle")}><DesignCopy id="m-6be766ec99ac">Rectangle</DesignCopy></button><button data-design-id="m-167e8a12f79c" className={button} onClick={() => addElement("ellipse")}><DesignCopy id="m-167e8a12f79c">Ellipse</DesignCopy></button><button data-design-id="m-48f71f3ba95f" className={button} disabled={busy} onClick={() => imageInput.current?.click()}><DesignCopy id="m-48f71f3ba95f">Image</DesignCopy></button>
      <input data-design-id="m-7129f1cdcfba" ref={imageInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={e => { if (e.target.files?.[0]) void uploadImage(e.target.files[0]); e.target.value = ""; }} />
      <label data-design-id="m-7939e744a6a2" className="ml-auto flex items-center gap-2 text-xs text-stone-500">Background<input data-design-id="m-7d806208b608" aria-label="Slide background" type="color" value={current.background || "#ffffff"} onChange={e => updateCurrent({ background: e.target.value })} /></label>
    </div>
    <div data-design-id="m-91af9eb64b04" className="flex min-h-0 flex-1">
      <aside data-design-id="m-7e26e9b9ff67" className="w-44 shrink-0 overflow-y-auto border-r border-stone-200 bg-white p-3">
        {slides.map((s,i) => <button data-design-id="m-2242afafb940" data-design-key={s.id} key={s.id} className={"mb-3 w-full rounded border-2 p-1 text-left " + (currentIndex === i ? "border-violet-500" : "border-transparent hover:border-stone-300")} onClick={() => { setIndex(i); setSelected(null); }} aria-label={"Slide " + (i+1) + ": " + s.title}><div data-design-id="m-793ef40484ba" className="mb-1 text-[10px] text-stone-400">{i+1}</div><div data-design-id="m-d913e2713031" className="pointer-events-none overflow-hidden rounded border border-stone-200"><SlideView slide={s} /></div></button>)}
        <select data-design-id="m-81a6d499550a" aria-label="New slide layout" className={field} value="" onChange={e => { if (e.target.value) addSlide(e.target.value as "title" | "content" | "blank"); }}><option value="">+ New slide</option><option value="title">Title slide</option><option value="content">Title & body</option><option value="blank">Blank</option></select>
        <div data-design-id="m-71a6b3d6f1a4" className="mt-3 flex flex-col gap-2">
          <button data-design-id="m-718d64514c68" className={button} onClick={() => { const copy = { ...current, id: crypto.randomUUID(), elements: elements.map(e => ({ ...e, id: crypto.randomUUID() })) }; commit([...slides.slice(0,currentIndex+1),copy,...slides.slice(currentIndex+1)]); setIndex(currentIndex+1); setSelected(null); }}><DesignCopy id="m-718d64514c68">Duplicate slide</DesignCopy></button>
          <button data-design-id="m-154ac4e27694" className={button} disabled={currentIndex === 0} onClick={() => { const next = [...slides]; [next[currentIndex-1],next[currentIndex]] = [next[currentIndex],next[currentIndex-1]]; commit(next); setIndex(currentIndex-1); }}><DesignCopy id="m-154ac4e27694">Move up</DesignCopy></button>
          <button data-design-id="m-cb3bcf8e0738" className={button} disabled={currentIndex === slides.length-1} onClick={() => { const next = [...slides]; [next[currentIndex+1],next[currentIndex]] = [next[currentIndex],next[currentIndex+1]]; commit(next); setIndex(currentIndex+1); }}><DesignCopy id="m-cb3bcf8e0738">Move down</DesignCopy></button>
          <button data-design-id="m-02aa1ed403d2" className={button} disabled={slides.length <= 1} onClick={() => { commit(slides.filter(s => s.id !== current.id)); setIndex(Math.max(0,currentIndex-1)); setSelected(null); }}><DesignCopy id="m-02aa1ed403d2">Delete slide</DesignCopy></button>
        </div>
      </aside>
      <main data-design-id="m-eb5f1637dc4f" className="min-w-0 flex-1 overflow-y-auto p-6">
        <div data-design-id="m-5febef3f6fd4" ref={canvas} className="relative mx-auto aspect-video w-full max-w-[1100px] shadow-md" style={{ background: current.background || "#ffffff", containerType: "inline-size" }} onPointerDown={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          {elements.map(e => <div data-design-id="m-e7f321efc600" data-design-key={e.id} key={e.id} role="button" tabIndex={0} aria-label={e.type === "text" ? "Text: " + e.text : e.type} onDoubleClick={() => { if (e.type === "text") { setSelected(e.id); setEditingText(e.id); } }} onFocus={() => setSelected(e.id)} className={"absolute touch-none select-none " + (selected === e.id ? "outline-2 outline-violet-500" : "hover:outline-1 hover:outline-violet-300")} style={{ left: e.x/9.6 + "%", top: e.y/5.4 + "%", width: e.width/9.6 + "%", height: e.height/5.4 + "%", transform: "rotate(" + (e.rotation || 0) + "deg)", cursor: "move" }} onPointerDown={event => startDrag(event,e,"move")} onPointerMove={dragMove} onPointerUp={endDrag} onPointerCancel={endDrag} onKeyDown={event => { if (event.key === "Enter" && e.type === "text") { event.preventDefault(); setEditingText(e.id); return; } if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key)) { event.preventDefault(); const step = event.shiftKey ? 10 : 1; updateCurrent({ elements: elements.map(item => item.id === e.id ? { ...item, x: Math.max(0,Math.min(940,item.x + (event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0))), y: Math.max(0,Math.min(520,item.y + (event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0))) } : item) }); } }}>
            {editingText === e.id && e.type === "text" ? <textarea data-design-id="m-b1d65a05fef8" autoFocus aria-label="Edit slide text inline" value={e.text || ""} onChange={event => updateCurrent({ elements: elements.map(item => item.id === e.id ? { ...item, text: event.target.value } : item) })} onBlur={() => setEditingText(null)} onPointerDown={event => event.stopPropagation()} onKeyDown={event => { event.stopPropagation(); if (event.key === "Escape") { event.preventDefault(); setEditingText(null); } }} className="h-full w-full resize-none border-0 bg-transparent p-0 leading-[1.2] outline-none" style={{ color: e.color, fontSize: e.fontSize / 9.6 + "cqw", fontWeight: e.bold ? 700 : 400, textAlign: e.align || "left" }} /> : <div data-design-id="m-5342a1c21b89" className="h-full w-full overflow-hidden" onDoubleClick={event => { if (e.type === "text") { event.stopPropagation(); setSelected(e.id); setEditingText(e.id); } }}><ElementView element={e} /></div>}
            {selected === e.id && <span data-design-id="m-e0a90138ccd8" role="button" aria-label="Resize selected element" className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-se-resize border border-violet-600 bg-white" onPointerDown={event => startDrag(event,e,"resize")} />}
          </div>)}
        </div>
        <label data-design-id="m-d04b097a58b7" className="mx-auto mt-6 block max-w-[1100px] text-xs text-stone-500">Speaker notes<textarea data-design-id="m-7f3a68f2fd6e" className={field + " mt-2 min-h-24"} value={current.notes || ""} onChange={e => updateCurrent({ notes: e.target.value })} placeholder="Notes visible to you, included in PowerPoint export…" /></label>
      </main>
      <aside data-design-id="m-83733aa8914e" className="w-60 shrink-0 space-y-4 overflow-y-auto border-l border-stone-200 bg-white p-4">
        {linksOpen && <LinkedObjectsPanel object={{ kind: "artifact", id: artifact.id }} />}
        <label data-design-id="m-64a10c05ba9f" className="block text-xs text-stone-500">Slide name<input data-design-id="m-29fb43e8efd2" className={field + " mt-1"} value={current.title} onChange={e => updateCurrent({ title: e.target.value })} /></label>
        {element ? <>
          <h2 data-design-id="m-7c86a33f100e" className="text-sm font-medium capitalize">{element.type} properties</h2>
          {(element.type === "text" || element.type === "image") && <label data-design-id="m-a8d4adb28bfa" className="block text-xs text-stone-500">{element.type === "text" ? "Text (equations: $...$)" : "Image description"}<textarea data-design-id="m-374e14f16206" className={field + " mt-1"} rows={6} value={element.text || ""} onChange={e => updateElement({ text: e.target.value })} /></label>}
          <div data-design-id="m-e1210dff9d7c" className="grid grid-cols-2 gap-2">{(["x","y","width","height","rotation"] as const).map(key => <label data-design-id="m-5e95b9bc46b6" key={key} className="text-xs text-stone-500 capitalize">{key}<input data-design-id="m-c9d7d35d37e6" type="number" className={field} value={Math.round(element[key] || 0)} onChange={e => { const n = Number(e.target.value); if (Number.isFinite(n)) updateElement({ [key]: key === "width" || key === "height" ? Math.max(24,n) : n }); }} /></label>)}</div>
          <div data-design-id="m-d1390f052e27" className="flex items-center justify-between text-xs"><label data-design-id="m-86a2b260959f">Color <input data-design-id="m-e2ae0fbabd93" aria-label="Element color" type="color" value={element.color} onChange={e => updateElement({ color: e.target.value })} /></label>{element.type !== "text" && element.type !== "image" && <label data-design-id="m-347d5c14a52e">Fill <input data-design-id="m-4863a4416687" aria-label="Shape fill" type="color" value={element.fill === "transparent" ? "#ffffff" : element.fill} onChange={e => updateElement({ fill: e.target.value })} /></label>}</div>
          {element.type === "text" && <><label data-design-id="m-697081ead57e" className="block text-xs text-stone-500">Font size<input data-design-id="m-a98c0eba5166" className={field} type="number" min={8} max={160} value={element.fontSize} onChange={e => updateElement({ fontSize: Math.max(8,Math.min(160,Number(e.target.value))) })} /></label><div data-design-id="m-64d8ea44bbb4" className="flex gap-2"><button data-design-id="m-c1009b602e16" className={button} aria-pressed={!!element.bold} onClick={() => updateElement({ bold: !element.bold })}><DesignCopy id="m-c1009b602e16">Bold</DesignCopy></button><select data-design-id="m-e92cbc350bba" aria-label="Text alignment" className={field} value={element.align || "left"} onChange={e => updateElement({ align: e.target.value as SlideElement["align"] })}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></div></>}
          <div data-design-id="m-ba86bf748a18" className="flex flex-wrap gap-2"><button data-design-id="m-27948e4b3487" className={button} onClick={() => updateElement({ x: (960 - element.width)/2 })}><DesignCopy id="m-27948e4b3487">Center horizontally</DesignCopy></button><button data-design-id="m-1024cbaca88f" className={button} onClick={() => updateElement({ y: (540 - element.height)/2 })}><DesignCopy id="m-1024cbaca88f">Center vertically</DesignCopy></button><button data-design-id="m-0c5efa524e6a" className={button} onClick={() => updateCurrent({ elements: [...elements.filter(e => e.id !== selected),element] })}><DesignCopy id="m-0c5efa524e6a">Bring to front</DesignCopy></button><button data-design-id="m-634dae4b3323" className={button} onClick={() => updateCurrent({ elements: [element,...elements.filter(e => e.id !== selected)] })}><DesignCopy id="m-634dae4b3323">Send to back</DesignCopy></button><button data-design-id="m-056987fc4b8c" className={button} onClick={() => { const copy = { ...element,id:crypto.randomUUID(),x:element.x+20,y:element.y+20 }; updateCurrent({ elements:[...elements,copy] }); setSelected(copy.id); }}><DesignCopy id="m-056987fc4b8c">Duplicate</DesignCopy></button><button data-design-id="m-13fad086158a" className={button} onClick={() => { updateCurrent({ elements:elements.filter(e => e.id !== selected) }); setSelected(null); }}><DesignCopy id="m-13fad086158a">Delete</DesignCopy></button></div>
        </> : <p data-design-id="m-8e7b6a515669" className="text-xs leading-5 text-stone-400"><DesignCopy id="m-8e7b6a515669">Select an element to edit it. Drag to move; use the corner handle to resize. Arrow keys move selected elements.</DesignCopy></p>}
      </aside>
    </div>
    {presenting && <div data-design-id="m-ee8d53f3af6f" className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black p-5"><div data-design-id="m-b926dceb9c40" className="w-full max-w-[calc((100vh-100px)*16/9)]"><SlideView slide={current} /></div><div data-design-id="m-a847f969f599" className="mt-4 flex items-center gap-6 text-sm text-white"><button data-design-id="m-dd42faff2965" disabled={currentIndex === 0} onClick={() => setIndex(i => Math.max(0,i-1))}><DesignCopy id="m-dd42faff2965">← Previous</DesignCopy></button><span data-design-id="m-fa92c3806757">{currentIndex+1} / {slides.length}</span><button data-design-id="m-f0fef9f92eeb" disabled={currentIndex === slides.length-1} onClick={() => setIndex(i => Math.min(slides.length-1,i+1))}><DesignCopy id="m-f0fef9f92eeb">Next →</DesignCopy></button><button data-design-id="m-09efbee28ee5" onClick={() => setPresenting(false)}><DesignCopy id="m-09efbee28ee5">Exit · Esc</DesignCopy></button></div></div>}
    <div data-design-id="m-e43b629f67ab" className="monarch-print-deck hidden">{slides.map(s => <div data-design-id="m-6ff66a743383" data-design-key={s.id} key={s.id} className="monarch-print-slide"><SlideView slide={s} /></div>)}</div>
  </div>;
}
