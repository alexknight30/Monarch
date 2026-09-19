"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { GripVertical, PanelLeft, PanelRight, Pin, SlidersHorizontal, X } from "lucide-react";

type Position = { x: number; y: number };
type Preferences = { position: Position | null; pinned: boolean; edge: "left" | "right" };
const preferenceKey = "monarch-design-inspector";
const initial: Preferences = { position: null, pinned: false, edge: "right" };
function restore(): Preferences {
  try {
    const value = JSON.parse(localStorage.getItem(preferenceKey) || "null");
    if (value && typeof value.pinned === "boolean" && ["left", "right"].includes(value.edge) && (value.position === null || (Number.isFinite(value.position?.x) && Number.isFinite(value.position?.y)))) return value;
  } catch { /* Panel preferences are optional. */ }
  return initial;
}
function constrain(position: Position, width: number) {
  return { x: Math.max(8, Math.min(position.x, window.innerWidth - width - 8)), y: Math.max(64, Math.min(position.y, window.innerHeight - 112)) };
}

export function FloatingInspector({ children, onHide }: { children: ReactNode; onHide: () => void }) {
  const [preferences, setPreferences] = useState<Preferences>(restore);
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const panel = useRef<HTMLElement>(null);
  const gesture = useRef<{ pointer: number; x: number; y: number; start: Position } | null>(null);
  const [moving, setMoving] = useState(false);
  useEffect(() => {
    try { localStorage.setItem(preferenceKey, JSON.stringify(preferences)); } catch { /* Storage may be unavailable. */ }
  }, [preferences]);
  useEffect(() => {
    const resize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  const width = Math.min(300, viewport.width - 16);
  const point = constrain(preferences.position || { x: viewport.width - width - 12, y: 64 }, width);
  const dock = (edge: "left" | "right") => setPreferences(p => ({ ...p, edge, position: { x: edge === "left" ? 8 : viewport.width - width - 8, y: point.y }, pinned: false }));
  const pin = () => setPreferences(p => ({ ...p, pinned: true, edge: point.x + width / 2 < viewport.width / 2 ? "left" : "right" }));
  return <>{preferences.pinned && <button className="md-inspector-tab" style={{ top: point.y, [preferences.edge]: 8 }} title="Unpin and open inspector" aria-label="Unpin and open inspector" onClick={() => setPreferences(p => ({ ...p, pinned: false }))}><SlidersHorizontal size={15} /><span>Inspector</span><Pin size={12} /></button>}
  <aside hidden={preferences.pinned} ref={panel} className={`md-inspector${moving ? " md-panel-moving" : ""}`} aria-label="Design inspector" style={{ display: preferences.pinned ? "none" : undefined, left: point.x, top: point.y, width, maxHeight: Math.max(96, viewport.height - point.y - 12) }}>
    <div className="md-panel-dragbar">
      <button className="md-panel-grip" aria-label="Move inspector" title="Drag to move · Arrow keys to nudge" onPointerDown={event => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        gesture.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, start: point };
        setMoving(true);
      }} onPointerMove={event => {
        const drag = gesture.current;
        if (!drag || drag.pointer !== event.pointerId) return;
        const next = constrain({ x: drag.start.x + event.clientX - drag.x, y: drag.start.y + event.clientY - drag.y }, width);
        setPreferences(p => ({ ...p, position: next }));
      }} onPointerUp={event => {
        gesture.current = null; setMoving(false);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      }} onPointerCancel={() => { gesture.current = null; setMoving(false); }} onLostPointerCapture={() => { gesture.current = null; setMoving(false); }} onKeyDown={event => {
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
        event.preventDefault(); event.stopPropagation(); const step = event.shiftKey ? 40 : 10;
        const next = constrain({ x: point.x + (event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0), y: point.y + (event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0) }, width);
        setPreferences(p => ({ ...p, position: next }));
      }}><GripVertical size={14} /><span>Inspector</span></button>
      <div className="md-panel-tools">
        <button aria-label="Dock inspector left" title="Move to left edge" onClick={() => dock("left")}><PanelLeft size={14} /></button>
        <button aria-label="Dock inspector right" title="Move to right edge" onClick={() => dock("right")}><PanelRight size={14} /></button>
        <button aria-label="Pin inspector to edge" title="Pin as a compact edge tab" onClick={pin}><Pin size={14} /></button>
        <button aria-label="Hide inspector" title="Hide inspector" onClick={onHide}><X size={14} /></button>
      </div>
    </div>
    <div className="md-inspector-scroll">{children}</div>
    <footer className="md-panel-footer"><span>Drag the header to reposition</span><span>⌘ S to save</span></footer>
  </aside></>;
}
