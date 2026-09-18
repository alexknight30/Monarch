"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Excalidraw, MainMenu, restoreElements } from "@excalidraw/excalidraw";
import type { AppState, BinaryFiles, ExcalidrawInitialDataState } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import "@excalidraw/excalidraw/index.css";
import { useViewId } from "@/components/view-provider";
import { ArtifactLinkedSidebar } from "@/components/artifact-linked-sidebar";
import { useArtifactSave, readArtifactDraft } from "@/lib/use-artifact-save";
import { isWhiteboardDocument, migrateWhiteboard, type WhiteboardDocument } from "@/lib/whiteboard";
import type { DiagramArtifact } from "@/lib/mock-data";

if (typeof window !== "undefined") (window as Window & { EXCALIDRAW_ASSET_PATH?: string }).EXCALIDRAW_ASSET_PATH = "/api/whiteboard-assets/";
const button = "rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs hover:bg-stone-50";
function download(value: unknown, name: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}
export default function WhiteboardCanvas({ artifact }: { artifact: DiagramArtifact }) {
  const viewId = useViewId();
  const { save, retry, status, error } = useArtifactSave(artifact.id, undefined, artifact);
  const [draft] = useState(() => readArtifactDraft(viewId, artifact.id));
  const [title, setTitle] = useState(() => typeof draft?.title === "string" ? draft.title : artifact.title);
  const [board, setBoard] = useState<WhiteboardDocument>(() => {
    if (isWhiteboardDocument(draft?.whiteboard)) return draft.whiteboard;
    return migrateWhiteboard({ ...artifact, ...(draft?.snapshot ? { snapshot: draft.snapshot as DiagramArtifact["snapshot"] } : {}) });
  });
  const boardRef = useRef(board);
  const [pageId, setPageId] = useState(board.pages[0].id);
  const [migrationOpen, setMigrationOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [canvasVersion, setCanvasVersion] = useState(0);
  const backupInput = useRef<HTMLInputElement>(null);
  const lastSaved = useRef("");
  const readyPages = useRef(new Set<string>());
  const page = board.pages.find(page => page.id === pageId) || board.pages[0];
  useEffect(() => {
    if (draft) void save({ ...draft, whiteboard: boardRef.current });
  }, [draft, save]);
  const persist = (next: WhiteboardDocument) => {
    const signature = JSON.stringify(next);
    if (signature === lastSaved.current) return;
    boardRef.current = next; lastSaved.current = signature;
    void save({ whiteboard: next });
  };
  const change = (elements: readonly ExcalidrawElement[], state: AppState, files: BinaryFiles) => {
    if (state.isLoading || !readyPages.current.has(page.id)) return;
    const next = { ...boardRef.current, pages: boardRef.current.pages.map(p => p.id === page.id ? { ...p, elements, files, appState: { viewBackgroundColor: state.viewBackgroundColor, gridSize: state.gridSize } } : p) };
    persist(next);
  };
  const initialData = async (): Promise<ExcalidrawInitialDataState> => {
    const latest = boardRef.current.pages.find(p => p.id === page.id)!;
    const files = { ...latest.files };
    await Promise.all(Object.entries(files).map(async ([id, file]) => {
      if (!file.dataURL.startsWith(`/api/${viewId}/assets/`)) return;
      const response = await fetch(file.dataURL);
      if (!response.ok) throw new Error("A saved whiteboard image could not be loaded.");
      const blob = await response.blob();
      const dataURL = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Could not read whiteboard image.")); reader.readAsDataURL(blob); });
      files[id] = { ...file, dataURL: dataURL as typeof file.dataURL };
    }));
    const elements = restoreElements(latest.elements, null, { repairBindings: true, refreshDimensions: true });
    readyPages.current.add(page.id);
    return { elements, files, appState: { ...latest.appState, currentItemRoughness: 0, currentItemFontFamily: 2 }, scrollToContent: true };
  };
  return <div className="flex min-h-0 min-w-0 flex-1 flex-col">
    <header className="flex min-h-14 shrink-0 flex-wrap items-center gap-3 border-b border-stone-200 px-5 py-2">
      <Link href="/artifacts" className="text-sm text-stone-500">← Artifacts</Link>
      <input aria-label="Diagram title" value={title} onChange={event => setTitle(event.target.value)} onBlur={() => { if (title.trim()) void save({ title: title.trim() }); }} className="min-w-24 flex-1 bg-transparent text-sm font-medium outline-none" />
      <select aria-label="Whiteboard page" className={button} value={page.id} onChange={event => { readyPages.current.delete(event.target.value); setBoard(boardRef.current); setPageId(event.target.value); }}>{board.pages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      <button className={button} onClick={() => { const id = crypto.randomUUID(); const next: WhiteboardDocument = { ...boardRef.current, pages: [...boardRef.current.pages, { id, name: `Page ${boardRef.current.pages.length + 1}`, elements: [], files: {} }] }; persist(next); setBoard(next); setPageId(id); }}>+ Page</button>
      <button className={button} onClick={() => download(boardRef.current, title + ".monarch-board.json")}>Back up drawing</button>
      {artifact.snapshot && <button className={button} onClick={() => download(artifact.snapshot, title + ".original-tldraw.json")}>Original drawing</button>}
      <span className="text-xs text-stone-400" role="status">{status}</span>
    </header>
    <input ref={backupInput} hidden type="file" accept=".json" aria-label="Restore drawing backup" onChange={async event => {
      const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
      try {
        if (file.size > 50 * 1024 * 1024) throw new Error("Choose a drawing backup smaller than 50 MB.");
        const next: unknown = JSON.parse(await file.text());
        if (!isWhiteboardDocument(next)) throw new Error("This is not a Monarch drawing backup. Use Open in the drawing menu for .excalidraw files.");
        if (!window.confirm("Replace this drawing's pages with the selected backup?")) return;
        readyPages.current.clear(); persist(next); setBoard(next); setPageId(next.pages[0].id); setCanvasVersion(value => value + 1); setNotice("");
      } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Could not restore the drawing."); }
    }} />
    {notice && <p role="alert" className="bg-amber-50 px-5 py-2 text-sm text-amber-900">{notice}</p>}
    {board.migrationNotes?.length ? <div className="border-b border-amber-200 bg-amber-50 px-5 py-2 text-xs text-amber-900"><button className="underline" onClick={() => setMigrationOpen(value => !value)}>Some original shapes were adapted · Details</button>{migrationOpen && <ul className="mt-2 list-disc space-y-1 pl-4">{board.migrationNotes.map(note => <li key={note}>{note}</li>)}</ul>}</div> : null}
    {error && <div role="alert" className="flex items-center justify-between bg-amber-50 px-5 py-2 text-sm">{error}<button onClick={() => void retry()} className="underline">Retry save</button></div>}
    <div className="flex min-h-0 min-w-0 flex-1">
      <div className="relative min-h-0 min-w-0 flex-1">
        <Excalidraw key={page.id + ":" + canvasVersion} name={title} initialData={initialData} onChange={change} theme="light" UIOptions={{ canvasActions: { export: { saveFileToDisk: true }, loadScene: true } }}>
          <MainMenu><MainMenu.DefaultItems.LoadScene /><MainMenu.Item onSelect={() => backupInput.current?.click()}>Restore Monarch drawing backup</MainMenu.Item><MainMenu.DefaultItems.SaveToActiveFile /><MainMenu.DefaultItems.Export /><MainMenu.DefaultItems.SaveAsImage /><MainMenu.DefaultItems.ClearCanvas /><MainMenu.Separator /><MainMenu.DefaultItems.ChangeCanvasBackground /><MainMenu.DefaultItems.Help /></MainMenu>
        </Excalidraw>
      </div>
      <ArtifactLinkedSidebar artifactId={artifact.id} />
    </div>
  </div>;
}
