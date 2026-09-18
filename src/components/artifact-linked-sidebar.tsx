"use client";
import { useState } from "react";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { LinkedObjectsPanel } from "./linked-objects-panel";

export function ArtifactLinkedSidebar({ artifactId, compact = false }: { artifactId: string; compact?: boolean }) {
  const [pinned, setPinned] = useState(true);
  return <aside className={(pinned ? (compact ? "w-full xl:w-[260px]" : "w-[280px]") : "w-12") + " shrink-0 overflow-y-auto border-l border-stone-200 bg-[#fbfbfa]"}>
    <div className="flex items-center justify-between gap-2 p-3">
      {pinned && <span className="text-xs font-medium text-stone-500">Linked objects</span>}
      <button type="button" aria-label={pinned ? "Unpin linked objects sidebar" : "Pin linked objects sidebar"} aria-expanded={pinned} title={pinned ? "Unpin sidebar" : "Pin sidebar"} onClick={() => setPinned(value => !value)} className="rounded-md p-1 text-stone-500 hover:bg-stone-200 focus-visible:ring-2 focus-visible:ring-violet-500">{pinned ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}</button>
    </div>
    {pinned && <div className="px-4 pb-5"><LinkedObjectsPanel object={{ kind: "artifact", id: artifactId }} /></div>}
  </aside>;
}
