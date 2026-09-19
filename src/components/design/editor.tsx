"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { EMPTY_DESIGN, targetSelector, validateDesign, compileStyles, type Breakpoint, type DesignDocument, type DesignRule } from "@/lib/design/model";
import type { SourceNode } from "@/lib/design/store";
import { FloatingInspector } from "./floating-inspector";
import { ArrowUp, ChevronDown, Layers2, LockKeyhole, Monitor, MousePointer2, Redo2, SlidersHorizontal, Undo2, X } from "lucide-react";
import "./editor.css";

type Selection = { node: string; element: HTMLElement; instance: { node: string; key: string }[] };
type Frame = { x: number; y: number; width: number; height: number };
type History = { past: DesignDocument[]; present: DesignDocument; future: DesignDocument[] };
const subscribeHydration = () => () => {};
const clientReady = () => true;
const serverReady = () => false;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const clone = <T,>(value: T): T => structuredClone(value);
const preview = (doc: DesignDocument | null) => window.dispatchEvent(new CustomEvent("monarch-design-preview", { detail: doc }));
const editable = (element: Element | null): HTMLElement | null => {
  if (!element || element.closest("[data-design-chrome]")) return null;
  // Embedded editors own their content. Their containing UI remains editable.
  const internal = element.closest(".tiptap,.excalidraw,.react-pdf__Page,canvas,[data-design-content]");
  const candidate = (internal ? internal.parentElement : element)?.closest<HTMLElement>("[data-design-id]");
  return candidate || null;
};
function selectionFor(element: HTMLElement): Selection {
  const instance: Selection["instance"] = [];
  let current: HTMLElement | null = element;
  while (current) {
    if (current.dataset.designKey !== undefined && current.dataset.designId) instance.unshift({ node: current.dataset.designId, key: current.dataset.designKey });
    current = current.parentElement;
  }
  return { node: element.dataset.designId!, element, instance };
}
const rect = (el: HTMLElement): Frame => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
const label = (el: HTMLElement) => (el.getAttribute("aria-label") || el.innerText?.trim().replace(/\s+/g, " ").slice(0, 48) || el.tagName.toLowerCase());

export default function DesignEditor() {
  const page = usePathname();
  const ready = useSyncExternalStore(subscribeHydration, clientReady, serverReady);
  const [active, setActive] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [frame, setFrame] = useState<Frame | null>(null);
  const [hover, setHover] = useState<Frame | null>(null);
  const [history, setHistory] = useState<History>({ past: [], present: EMPTY_DESIGN, future: [] });
  const historyRef = useRef(history);
  useLayoutEffect(() => { historyRef.current = history; }, [history]);
  const [baseline, setBaseline] = useState<DesignDocument>(EMPTY_DESIGN);
  const [revision, setRevision] = useState("");
  const [nodes, setNodes] = useState<Record<string, SourceNode>>({});
  const [snapshots, setSnapshots] = useState<{id: string; time: number}[]>([]);
  const [snapshotId, setSnapshotId] = useState("");
  const [status, setStatus] = useState("Ready");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [scope, setScope] = useState<"page" | "instance" | "shared">("page");
  const [breakpoint, setBreakpoint] = useState<Breakpoint>("all");
  const [state, setState] = useState<DesignRule["state"]>("normal");
  const [layers, setLayers] = useState<HTMLElement[]>([]);
  const [layerQuery, setLayerQuery] = useState("");
  const [layersOpen, setLayersOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [exitOpen, setExitOpen] = useState(false);
  const [previewWidth, setPreviewWidth] = useState(0);
  const iframe = useRef<HTMLIFrameElement>(null);
  const [snap, setSnap] = useState(true);
  const [tab, setTab] = useState<"design" | "changes">("design");
  const [computed, setComputed] = useState<Record<string, string>>({});
  const startUrl = useRef("");
  const dirty = !same(history.present, baseline);
  const doc = history.present;
  const rule = selection ? doc.rules.find(r => r.node === selection.node && r.page === (scope === "shared" ? "*" : page) && same(r.instance || [], scope === "instance" ? selection.instance : []) && r.breakpoint === breakpoint && r.state === state) : undefined;

  const commit = useCallback((next: DesignDocument, before?: DesignDocument) => {
    setHistory(h => {
      const previous = before || h.present;
      if (same(previous, next)) return { ...h, present: next };
      return { past: [...h.past.slice(-99), previous], present: next, future: [] };
    });
    setStatus("Unsaved changes");
  }, []);
  const undo = useCallback(() => setHistory(h => h.past.length ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] } : h), []);
  const redo = useCallback(() => setHistory(h => h.future.length ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) } : h), []);

  function patchRule(current: DesignDocument, patch: Record<string, string>, text?: string): DesignDocument {
    if (!selection) return current;
    const next = clone(current);
    const target = { node: selection.node, page: scope === "shared" ? "*" : page, instance: scope === "instance" ? selection.instance : [], breakpoint, state };
    let found = next.rules.find(r => r.node === target.node && r.page === target.page && same(r.instance || [], target.instance) && r.breakpoint === breakpoint && r.state === state);
    if (!found) { found = { id: crypto.randomUUID(), ...target, style: {} }; next.rules.push(found); }
    for (const [key, value] of Object.entries(patch)) {
      if (value === "") delete found.style[key]; else found.style[key] = value;
    }
    if (text !== undefined) found.text = text;
    next.rules = next.rules.filter(r => Object.keys(r.style).length || r.text !== undefined);
    return next;
  }
  function patch(p: Record<string, string>) {
    const lengths = /^(width|height|min-width|max-width|min-height|max-height|top|left|right|bottom|gap|row-gap|column-gap|padding.*|margin.*|border-width|border-radius|font-size|letter-spacing)$/;
    for (const [property, raw] of Object.entries(p)) {
      let value = raw.trim();
      if (/^-?(?:\d+\.?\d*|\.\d+)$/.test(value)) {
        if (lengths.test(property)) value += "px";
        else if (property === "rotate") value += "deg";
      }
      if (property === "translate" && /^-?\d+(?:\s+-?\d+)?$/.test(value)) value = value.split(/\s+/).map(v => v + "px").join(" ");
      if (value && !CSS.supports(property, value)) { setError(`“${raw}” is not a valid ${property} value.`); return; }
      p[property] = value;
    }
    setError(""); commit(patchRule(historyRef.current.present, p));
  }
  function choose(el: HTMLElement) {
    const selected = selectionFor(el);
    setSelection(selected); setHover(null); setFrame(rect(el));
    setScope(selected.instance.length ? "instance" : "page"); setState("normal"); setTab("design");
  }
  async function load(enter: boolean) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/design", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not open design mode.");
      setBaseline(result.document); setRevision(result.revision); setNodes(result.nodes); setSnapshots(result.snapshots || []);
      let current = result.document as DesignDocument;
      if (enter) {
        const cached = sessionStorage.getItem("monarch-design-draft:" + page);
        if (cached) {
          const draft = JSON.parse(cached);
          if (draft.revision === result.revision) { current = validateDesign(draft.document); setStatus("Recovered unsaved draft"); }
          else setError("An older draft exists, but the saved source has changed. The saved design is shown.");
        }
      }
      setHistory({ past: [], present: current, future: [] });
      if (enter) { startUrl.current = location.href; setActive(true); setSelection(null); }
      else setStatus("Loaded saved changes");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load design."); }
    finally { setBusy(false); }
  }
  async function save() {
    setBusy(true); setError("");
    const saving = clone(historyRef.current.present);
    try {
      const response = await fetch("/api/design", { method: "POST", headers: { "Content-Type": "application/json", "X-Monarch-Design": "1" }, body: JSON.stringify({ document: saving, revision }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Save failed.");
      setRevision(result.revision); setBaseline(saving); setStatus("Saved to source");
      sessionStorage.removeItem("monarch-design-draft:" + page);
      return true;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Save failed. Your preview is still here."); return false; }
    finally { setBusy(false); }
  }
  async function restoreSnapshot() {
    if (!snapshotId) return;
    setError("");
    try {
      const response = await fetch("/api/design?snapshot=" + encodeURIComponent(snapshotId), { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      commit(validateDesign(result.document)); setStatus("Recovery preview — save to apply");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load recovery snapshot."); }
  }
  function close() {
    preview(null);
    sessionStorage.removeItem("monarch-design-draft:" + page);
    setActive(false); setExitOpen(false); setSelection(null); setFrame(null); setHover(null); setPreviewWidth(0);
  }

  useEffect(() => {
    if (!active) return;
    preview(doc);
    if (dirty) sessionStorage.setItem("monarch-design-draft:" + new URL(startUrl.current).pathname, JSON.stringify({ revision, document: doc }));
    else sessionStorage.removeItem("monarch-design-draft:" + page);
    iframe.current?.contentWindow?.postMessage({ type: "monarch-design-preview", document: doc }, location.origin);
  }, [doc, active, dirty, page, revision]);

  useEffect(() => {
    if (!active) return;
    document.documentElement.dataset.designEditing = "true";
    let raf = 0;
    const update = () => {
      if (location.href !== startUrl.current) {
        setActive(false); setSelection(null); setFrame(null); setHover(null); preview(null);
        return;
      }
      if (selection) {
        // React may replace a node during Fast Refresh. Reacquire by stable identity.
        let element = selection.element;
        if (!element.isConnected) element = document.querySelector<HTMLElement>(targetSelector(selection)) || element;
        if (element.isConnected) {
          selection.element = element;
          const nextFrame = rect(element); setFrame(old => same(old, nextFrame) ? old : nextFrame);
          const style = getComputedStyle(element); const next: Record<string, string> = {};
          for (const property of ["width","height","color","background-color","border-radius","border-color","border-width","border-style","font-size","font-family","font-weight","line-height","letter-spacing","text-align","opacity","padding","padding-top","padding-right","padding-bottom","padding-left","margin","gap","display","position","flex-direction","align-items","justify-content","grid-template-columns","box-shadow","translate","rotate","order","z-index","overflow","aspect-ratio"]) next[property] = style.getPropertyValue(property);
          setComputed(old => same(old, next) ? old : next);
        } else setFrame(null);
      }
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    const refreshLayers = () => setLayers(Array.from(document.querySelectorAll<HTMLElement>("[data-design-id]")).filter(el => !el.closest("[data-design-chrome]") && el.getBoundingClientRect().width > 0));
    refreshLayers();
    const onDown = (e: PointerEvent) => {
      if ((e.target as Element).closest("[data-design-chrome]")) return;
      e.preventDefault(); e.stopImmediatePropagation();
      const el = editable(e.target as Element); if (el) choose(el);
    };
    const block = (e: Event) => { if (!(e.target as Element)?.closest?.("[data-design-chrome]")) { e.preventDefault(); e.stopImmediatePropagation(); } };
    const move = (e: PointerEvent) => { const el = editable(e.target as Element); setHover(el && el !== selection?.element ? rect(el) : null); };
    const unload = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    const push = historyPushGuard();
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("click", block, true); document.addEventListener("dblclick", block, true); document.addEventListener("submit", block, true);
    document.addEventListener("pointermove", move, true);
    window.addEventListener("beforeunload", unload);
    window.addEventListener("resize", refreshLayers);
    return () => {
      cancelAnimationFrame(raf); delete document.documentElement.dataset.designEditing;
      document.removeEventListener("pointerdown", onDown, true); document.removeEventListener("click", block, true); document.removeEventListener("dblclick", block, true); document.removeEventListener("submit", block, true); document.removeEventListener("pointermove", move, true);
      window.removeEventListener("beforeunload", unload); window.removeEventListener("resize", refreshLayers); push();
    };
    function historyPushGuard() {
      const originalPush = window.history.pushState; const originalReplace = window.history.replaceState;
      const guard = (original: typeof window.history.pushState): typeof window.history.pushState => function(data, unused, url) {
        if (url && new URL(String(url), location.href).href !== startUrl.current) { setStatus("Exit design mode to navigate"); return; }
        original.call(window.history, data, unused, url);
      };
      window.history.pushState = guard(originalPush); window.history.replaceState = guard(originalReplace);
      return () => { window.history.pushState = originalPush; window.history.replaceState = originalReplace; };
    }
  // Selection and dirty state deliberately refresh capture handlers.
  }, [active, selection, dirty]);

  useEffect(() => {
    if (active && startUrl.current && new URL(startUrl.current).pathname !== page) {
      setActive(false); setSelection(null); setFrame(null); setHover(null); preview(null);
    }
  }, [page, active]);

  useEffect(() => {
    if (!active) return;
    const key = (event: KeyboardEvent) => {
      const inChrome = (event.target as Element)?.closest?.("[data-design-chrome]");
      const typing = (event.target as Element)?.matches?.("input,textarea,select,[contenteditable=true]");
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") { event.preventDefault(); if (!busy) void save(); return; }
      if (typing && inChrome) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); return; }
      if (event.key === "Escape") { event.preventDefault(); if (previewWidth) setPreviewWidth(0); else if (selection) { setSelection(null); setFrame(null); } else if (dirty) setExitOpen(true); else close(); return; }
      if (!inChrome) { event.preventDefault(); event.stopImmediatePropagation(); }
      if (!inChrome && selection && ["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key)) {
        const [x,y] = (getComputedStyle(selection.element).translate === "none" ? "0 0" : getComputedStyle(selection.element).translate).split(" ").map(parseFloat);
        const step = event.shiftKey ? 10 : 1;
        patch({ translate: `${(x || 0) + (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0)}px ${(y || 0) + (event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0)}px` });
      }
    };
    document.addEventListener("keydown", key, true); return () => document.removeEventListener("keydown", key, true);
  });

  function drag(event: React.PointerEvent, handle: string) {
    if (!selection || busy) return;
    event.preventDefault(); event.stopPropagation();
    const before = clone(historyRef.current.present); const box = rect(selection.element);
    const sx = event.clientX, sy = event.clientY;
    const values = getComputedStyle(selection.element).translate.split(" ").map(parseFloat);
    const tx = values[0] || 0, ty = values[1] || 0;
    let latest = before; let moved = false;
    const move = (e: PointerEvent) => {
      let dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      if (snap && !e.altKey) { dx = Math.round(dx / 4) * 4; dy = Math.round(dy / 4) * 4; }
      if (e.shiftKey && handle === "move") { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
      const changes: Record<string, string> = {};
      if (handle === "move") changes.translate = `${tx + dx}px ${ty + dy}px`;
      else {
        const left = handle.includes("w"), top = handle.includes("n");
        if (handle.includes("e") || left) changes.width = Math.max(8, box.width + (left ? -dx : dx)) + "px";
        if (handle.includes("s") || top) changes.height = Math.max(8, box.height + (top ? -dy : dy)) + "px";
        if (e.shiftKey && changes.width) changes.height = (parseFloat(changes.width) * box.height / box.width) + "px";
        if (left || top) changes.translate = `${tx + (left ? dx : 0)}px ${ty + (top ? dy : 0)}px`;
        changes["flex-shrink"] = "0";
        changes["flex-grow"] = "0";
        changes["flex-basis"] = "auto";
        if (getComputedStyle(selection.element).display === "inline") changes.display = "inline-block";
      }
      latest = patchRule(before, changes); preview(latest);
    };
    const end = () => { window.removeEventListener("pointermove", move, true); window.removeEventListener("pointerup", end, true); window.removeEventListener("pointercancel", cancel, true); commit(latest, before);
      if (!moved && handle === "move") {
        const underneath = document.elementsFromPoint(sx, sy).find(el => !el.closest("[data-design-chrome]"));
        const child = editable(underneath || null); if (child) choose(child);
      }
    };
    const cancel = () => { latest = before; preview(before); end(); };
    window.addEventListener("pointermove", move, true); window.addEventListener("pointerup", end, true); window.addEventListener("pointercancel", cancel, true);
  }
  function reorder(direction: -1 | 1) {
    if (!selection?.element.parentElement) return;
    const parent = selection.element.parentElement;
    if (!["flex", "inline-flex", "grid", "inline-grid"].includes(getComputedStyle(parent).display)) { setError("Choose a card in a flex or grid container to reorder it."); return; }
    const children = Array.from(parent.children).filter((e): e is HTMLElement => e instanceof HTMLElement && !!e.dataset.designId).sort((a,b) => (parseInt(getComputedStyle(a).order) || 0) - (parseInt(getComputedStyle(b).order) || 0));
    if (new Set(children.map(child => targetSelector(selectionFor(child)))).size !== children.length) { setError("These repeated items do not have stable IDs. Reorder their containing section instead."); return; }
    const index = children.indexOf(selection.element), destination = index + direction;
    if (destination < 0 || destination >= children.length) return;
    [children[index], children[destination]] = [children[destination], children[index]];
    const next = clone(historyRef.current.present);
    children.forEach((child, order) => {
      const item = selectionFor(child);
      let entry = next.rules.find(r => r.node === item.node && r.page === page && same(r.instance || [], item.instance) && r.breakpoint === breakpoint && r.state === "normal");
      if (!entry) { entry = { id: crypto.randomUUID(), node: item.node, page, instance: item.instance, breakpoint, state: "normal", style: {} }; next.rules.push(entry); }
      entry.style.order = String(order);
    });
    commit(next); setScope(selection.instance.length ? "instance" : "page");
  }
  function field(name: string, property: string, options?: string[]) {
    const value = rule?.style[property] ?? computed[property] ?? "";
    return <label className="md-field" key={property}><span>{name}</span>{options ? <select aria-label={name} value={value} onChange={e => patch({ [property]: e.target.value })}><option value="">Default</option>{!options.includes(value) && value && <option value={value}>{value}</option>}{options.map(v => <option key={v} value={v}>{v}</option>)}</select> : <PropertyInput key={`${selection?.node}:${scope}:${breakpoint}:${state}:${property}`} name={name} value={value} color={property.includes("color")} onCommit={v => patch({ [property]: v })} />}</label>;
  }

  if (!ready || process.env.NODE_ENV !== "development" || new URLSearchParams(location.search).has("design-preview")) return null;
  if (!active) return createPortal(<div data-design-chrome className="md-launcher"><button onClick={() => void load(true)} disabled={busy} title="Open visual design editor"><SlidersHorizontal size={14} />{busy ? "Opening…" : "Design"}</button>{error && <div className="md-launch-error" role="alert">{error}<button onClick={() => setError("")}>Dismiss</button></div>}</div>, document.body);
  const source = selection ? nodes[selection.node] : undefined;
  const statePreview = rule && state !== "normal" ? { version: 1 as const, rules: [{ ...rule, state: "normal" as const }] } : null;
  const matches = selection ? document.querySelectorAll(targetSelector({ node: selection.node, instance: scope === "instance" ? selection.instance : [] })).length : 0;
  return createPortal(<div data-design-chrome className="md-root">
    {statePreview && <style>{compileStyles(statePreview)}</style>}
    <header className="md-bar">
      <div className="md-brand"><SlidersHorizontal size={16} />Monarch<span>Design studio</span></div>
      <span className="md-page" title="Exit design mode to navigate"><LockKeyhole size={11} />{page}</span>
      <div className="md-actions">
        <div className="md-toolbar-group"><button aria-label="Undo" title="Undo · ⌘ Z" disabled={!history.past.length || busy} onClick={undo}><Undo2 size={15} /></button><button aria-label="Redo" title="Redo · ⌘ Shift Z" disabled={!history.future.length || busy} onClick={redo}><Redo2 size={15} /></button></div>
        <button onClick={() => setLayersOpen(!layersOpen)} aria-pressed={layersOpen} title="Show layers"><Layers2 size={14} /><span className="md-tool-label">Layers</span></button>
        <button onClick={() => setInspectorOpen(!inspectorOpen)} aria-pressed={inspectorOpen} title="Show or hide inspector"><SlidersHorizontal size={14} /><span className="md-tool-label">Inspector</span></button>
        <button onClick={() => setPreviewWidth(390)} title="Responsive preview"><Monitor size={14} /><span className="md-tool-label">Preview</span></button>
        <span className="md-status" data-dirty={dirty} role="status">{busy ? "Saving…" : dirty ? "Unsaved" : status}</span>
        <button className="md-primary" onClick={() => void save()} disabled={!dirty || busy}>Save</button>
        <button className="md-exit" onClick={() => dirty ? setExitOpen(true) : close()} disabled={busy}>Done</button>
      </div>
    </header>
    {hover && <div className="md-hover" style={{ left: hover.x, top: hover.y, width: hover.width, height: hover.height }} />}
    {frame && selection && <div className="md-selection" style={{ left: frame.x, top: frame.y, width: frame.width, height: frame.height }}><button className="md-move" aria-label="Move selected element" onPointerDown={e => drag(e, "move")}>{selection.element.tagName.toLowerCase()} · {Math.round(frame.width)} × {Math.round(frame.height)} <span>✥</span></button><div className="md-drag-surface" onPointerDown={e => drag(e,"move")} />{["nw","n","ne","e","se","s","sw","w"].map(handle => <button key={handle} className={`md-handle md-${handle}`} aria-label={`Resize ${handle}`} onPointerDown={e => drag(e, handle)} />)}</div>}
    {layersOpen && <aside className="md-layers"><div className="md-panel-heading"><strong>Layers</strong><button aria-label="Close layers" onClick={() => setLayersOpen(false)}><X size={14} /></button></div><input aria-label="Find layer" placeholder="Find a layer…" value={layerQuery} onChange={e => setLayerQuery(e.target.value)} /><div className="md-layer-list">{layers.filter(el => label(el).toLowerCase().includes(layerQuery.toLowerCase())).map((el,i) => <button key={i} className={el === selection?.element ? "md-layer-active" : ""} onClick={() => { choose(el); el.scrollIntoView({ block: "nearest", inline: "nearest" }); }} title={nodes[el.dataset.designId!]?.file}><small>{el.tagName.toLowerCase()}</small>{label(el)}</button>)}</div></aside>}
    {inspectorOpen && <FloatingInspector onHide={() => setInspectorOpen(false)}><div className="md-panel-heading"><button className={tab === "design" ? "md-current" : ""} onClick={() => setTab("design")}>Design</button><button className={tab === "changes" ? "md-current" : ""} onClick={() => setTab("changes")}>Changes <small>{doc.rules.length}</small></button></div>
      {error && <div className="md-error" role="alert">{error}<button onClick={() => setError("")}>Dismiss</button></div>}
      {tab === "changes" ? <div className="md-section"><p>Edits save to <code>src/design/overrides.json</code>. They remain active when design mode is off and in production.</p><button disabled={busy} onClick={() => { if (!dirty || window.confirm("Discard this unsaved preview and load the saved design?")) void load(false); }}>Reload saved changes</button><button onClick={() => { const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "monarch-design.json"; a.click(); URL.revokeObjectURL(url); }}>Export design</button><div className="md-recovery"><label className="md-field"><span>Recovery snapshots</span><select aria-label="Recovery snapshot" value={snapshotId} onChange={e => setSnapshotId(e.target.value)}><option value="">Choose a previous save…</option>{snapshots.map(item => <option key={item.id} value={item.id}>{new Date(item.time).toLocaleString()}</option>)}</select></label><button disabled={!snapshotId || busy} onClick={() => void restoreSnapshot()}>Preview recovery</button><p className="md-hint">Recovery is a preview until you save. Undo returns to your current design.</p><button onClick={() => commit({ ...doc, rules: doc.rules.filter(r => r.page !== page) })}>Reset this page</button></div>{doc.rules.map(r => <div className="md-change" key={r.id}><strong>{r.page === "*" ? "Shared" : r.page}</strong><small>{nodes[r.node]?.file || r.node} · {r.breakpoint}</small><code>{Object.entries(r.style).map(([k,v]) => `${k}: ${v}`).join("\n")}{r.text !== undefined ? `\nText: ${r.text}` : ""}</code><button onClick={() => commit({ ...doc, rules: doc.rules.filter(x => x.id !== r.id) })}>Remove override</button></div>)}</div> : !selection ? <div className="md-empty"><div className="md-empty-mark"><MousePointer2 size={19} strokeWidth={1.5} /></div><h2>Select an element</h2><p>Select an element to adjust its layout, appearance, and type.</p><p>Move this panel by its header, or pin it to the edge for a clear canvas.</p><div className="md-shortcuts"><div><span>Undo a change</span><kbd>⌘ / Ctrl Z</kbd></div><div><span>Move by 10px</span><kbd>Shift + arrows</kbd></div></div></div> : <>
        <div className="md-section md-identity"><strong>{label(selection.element)}</strong><small>{source?.file}:{source?.line}</small><button onClick={() => { const parent = selection.element.parentElement?.closest<HTMLElement>("[data-design-id]"); if (parent) choose(parent); }}><ArrowUp size={12} />Select parent</button></div>
        <div className="md-section"><label className="md-field"><span>Apply to</span><select aria-label="Apply to" value={scope} onChange={e => setScope(e.target.value as typeof scope)}><option value="page">This page’s template</option><option value="instance" disabled={!selection.instance.length}>This item on this page</option><option value="shared">Shared across pages</option></select></label><small className="md-hint">{matches} matching {matches === 1 ? "element" : "elements"} here{scope === "shared" ? "; also affects other pages" : ""}.</small><div className="md-grid">{<label className="md-field"><span>Screen size</span><select aria-label="Screen size" value={breakpoint} onChange={e => setBreakpoint(e.target.value as Breakpoint)}><option value="all">All sizes</option><option value="mobile">Mobile &lt;640</option><option value="tablet">Tablet 640–1023</option><option value="desktop">Desktop 1024+</option></select></label>}<label className="md-field"><span>State</span><select aria-label="Element state" value={state} onChange={e => setState(e.target.value as DesignRule["state"])}><option value="normal">Normal</option><option value="hover">Hover</option><option value="focus">Keyboard focus</option></select></label></div></div>
        <Section title="Position & size"><div className="md-grid">{field("Width", "width")}{field("Height", "height")}{field("Offset X / Y", "translate")}{field("Rotation", "rotate")}{field("Position", "position", ["static","relative","absolute","fixed","sticky"])}{field("Layer", "z-index")}{field("Top", "top")}{field("Left", "left")}{field("Min width", "min-width")}{field("Max width", "max-width")}{field("Aspect ratio", "aspect-ratio")}{field("Overflow", "overflow", ["visible","hidden","auto","scroll"])}</div><div className="md-row"><button onClick={() => reorder(-1)}>← Earlier</button><button onClick={() => reorder(1)}>Later →</button></div><label className="md-check"><input type="checkbox" checked={snap} onChange={e => setSnap(e.target.checked)} /> Snap to 4px <small>Alt bypasses · Shift locks axis</small></label></Section>
        <Section title="Layout & spacing"><div className="md-grid">{field("Layout", "display", ["block","flex","grid","inline-flex","inline-block","none"])}{field("Direction", "flex-direction", ["row","column","row-reverse","column-reverse"])}{field("Align items", "align-items", ["stretch","flex-start","center","flex-end","baseline"])}{field("Justify", "justify-content", ["flex-start","center","flex-end","space-between","space-around","space-evenly"])}{field("Columns", "grid-template-columns")}{field("Gap", "gap")}{field("Padding top", "padding-top")}{field("Padding right", "padding-right")}{field("Padding bottom", "padding-bottom")}{field("Padding left", "padding-left")}{field("Margin", "margin")}{field("Order", "order")}</div></Section>
        <Section title="Appearance"><div className="md-grid">{field("Fill", "background-color")}{field("Text color", "color")}{field("Corner radius", "border-radius")}{field("Opacity", "opacity")}{field("Border width", "border-width")}{field("Border color", "border-color")}{field("Border style", "border-style", ["none","solid","dashed","dotted","double"])}{field("Shape", "clip-path")}</div>{field("Shadow", "box-shadow")}{field("Gradient", "background-image")}</Section>
        <Section title="Typography">{field("Font family", "font-family", ['var(--font-inter), sans-serif','var(--font-newsreader), Georgia, serif','var(--font-neuton), Georgia, serif','var(--font-work-sans), sans-serif','Georgia, serif','system-ui, sans-serif','monospace'])}<div className="md-grid">{field("Font size", "font-size")}{field("Weight", "font-weight", ["300","400","500","600","700","800"])}{field("Line height", "line-height")}{field("Letter spacing", "letter-spacing")}{field("Text align", "text-align", ["left","center","right","justify"])}{field("Transform", "text-transform", ["none","uppercase","lowercase","capitalize"])}</div></Section>
        <Section title="Text">{source?.text && scope !== "instance" && breakpoint === "all" && state === "normal" ? <TextInput key={`${selection.node}:${scope}`} value={rule?.text ?? selection.element.textContent ?? ""} onCommit={value => commit(patchRule(historyRef.current.present, {}, value))} /> : <p className="md-hint">{source?.text ? "Text edits use the page or shared template scope, All sizes, Normal state." : "This element contains live data or nested content. Select a static text label to edit its wording; typography remains editable."}</p>}</Section>
        <div className="md-section"><button className="md-danger" disabled={!rule} onClick={() => commit({ ...doc, rules: doc.rules.filter(r => r.id !== rule?.id) })}>Reset this override</button><p className="md-hint">Values accept CSS units: px, %, rem, auto. Clear a field to inherit its original style.</p></div>
      </>}
    </FloatingInspector>}
    {exitOpen && <div className="md-modal-shade"><div className="md-modal" role="dialog" aria-modal="true" aria-label="Leave design mode"><h2>Save before leaving?</h2><p>Your changes are previewed on this page. Save them to keep them in the project.</p><div className="md-row"><button onClick={() => setExitOpen(false)}>Keep editing</button><button onClick={() => close()}>Discard</button><button className="md-primary" disabled={busy} onClick={async () => { if (await save()) close(); }}>Save & exit</button></div></div></div>}
    {!!previewWidth && <div className="md-preview"><div className="md-preview-bar"><strong>Responsive preview</strong>{[390,768,1280].map(w => <button key={w} className={previewWidth === w ? "md-current" : ""} onClick={() => setPreviewWidth(w)}>{w === 390 ? "Phone" : w === 768 ? "Tablet" : "Desktop"} · {w}px</button>)}<button onClick={() => setPreviewWidth(0)}>Close preview</button></div><div className="md-preview-scroll"><iframe ref={iframe} title="Responsive design preview" src={page + (location.search ? location.search + "&" : "?") + "design-preview=1"} style={{ width: previewWidth }} onLoad={() => iframe.current?.contentWindow?.postMessage({ type: "monarch-design-preview", document: doc }, location.origin)} /></div></div>}
  </div>, document.body);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <details className="md-section" open><summary>{title}<ChevronDown size={13} /></summary>{children}</details>; }
function PropertyInput({ name, value, color, onCommit }: { name: string; value: string; color?: boolean; onCommit: (value: string) => void }) {
  const [draft, setDraft] = useState(value); const [focused, setFocused] = useState(false);
  return <div className="md-property">{color && <input type="color" aria-label={name + " picker"} value={/^#[0-9a-f]{6}$/i.test(value) ? value : rgbHex(value)} onChange={e => onCommit(e.target.value)} />}<input aria-label={name} value={focused ? draft : value} onFocus={() => { setDraft(value); setFocused(true); }} onChange={e => setDraft(e.target.value)} onBlur={() => { setFocused(false); if (draft !== value) onCommit(draft); }} onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { setDraft(value); setFocused(false); } }} /></div>;
}
function rgbHex(value: string) { const m = value.match(/^rgba?\((\d+),?\s+(\d+),?\s+(\d+)/); return m ? "#" + m.slice(1,4).map(x => Number(x).toString(16).padStart(2,"0")).join("") : "#000000"; }
function TextInput({ value, onCommit }: { value: string; onCommit: (value: string) => void }) { const [edit, setEdit] = useState({ base: value, text: value }); const draft = edit.base === value ? edit.text : value; return <><textarea aria-label="Label text" rows={3} value={draft} onChange={e => setEdit({base: value, text: e.target.value})} /><button disabled={draft === value} onClick={() => onCommit(draft)}>Apply text</button></>; }
