"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useViewId } from "@/components/view-provider";
import { ArtifactShell } from "./artifact-shell";
import { MathText } from "@/components/ui/math-text";
import { normalizeFlashcardStudy } from "@/lib/flashcard-study";
import { readArtifactDraft, useArtifactSave } from "@/lib/use-artifact-save";
import type { Flashcard, FlashcardsArtifact, FlashcardStudy } from "@/lib/mock-data";

const control = "rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm hover:bg-stone-50 disabled:opacity-40";
const field = "w-full rounded-lg border border-stone-200 p-3 text-sm outline-none focus:border-stone-500";
function downloadDeck(cards: Flashcard[], title: string) {
  const text = cards.map(c => [c.front, c.back].map(s => s.replace(/[\t\n\r]/g, " ")).join("\t")).join("\n");
  const url = URL.createObjectURL(new Blob([text], { type: "text/tab-separated-values" }));
  const a = document.createElement("a"); a.href = url; a.download = title + ".tsv"; a.click(); URL.revokeObjectURL(url);
}

export default function FlashcardsArtifactPage({ artifact }: { artifact: FlashcardsArtifact }) {
  const viewId = useViewId();
  const { save, retry, status, error } = useArtifactSave(artifact.id, undefined, artifact);
  const [cards, setCards] = useState<Flashcard[]>(artifact.cards ?? []);
  const [study, setStudy] = useState<FlashcardStudy>(() => normalizeFlashcardStudy(artifact.study));
  const [mode, setMode] = useState<"study" | "edit">("study");
  const [filter, setFilter] = useState("all");
  const [order, setOrder] = useState<string[] | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [autoplay, setAutoplay] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  useEffect(() => {
    const draft = readArtifactDraft(viewId, artifact.id);
    if (draft) {
      // Restore browser-only drafts after hydration, preserving the server's first render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (Array.isArray(draft.cards)) setCards(draft.cards as Flashcard[]);
      if (draft.study) setStudy(normalizeFlashcardStudy(draft.study));
      void save(draft);
    }
  }, [artifact.id, viewId, save]);
  const deck = useMemo(() => {
    const filtered = cards.filter(c => filter === "starred" ? study.starred.includes(c.id) : filter === "learning" ? !study.known.includes(c.id) : true);
    return order ? [...filtered].sort((a,b) => order.indexOf(a.id) - order.indexOf(b.id)) : filtered;
  }, [cards, filter, study, order]);
  const safeIndex = Math.min(index, Math.max(0, deck.length - 1));
  const card = deck[safeIndex];
  const advance = useCallback((delta: number) => {
    setIndex(i => deck.length ? (Math.min(i, deck.length - 1) + delta + deck.length) % deck.length : 0);
    setFlipped(false);
  }, [deck.length]);
  const persistStudy = useCallback((next: FlashcardStudy) => { setStudy(next); void save({ study: next }); }, [save]);
  const mark = useCallback((known: boolean) => {
    if (!card) return;
    persistStudy({ ...study, known: known ? [...new Set([...study.known, card.id])] : study.known.filter(id => id !== card.id) });
    if (filter !== "learning" || !known) advance(1);
    else setFlipped(false);
  }, [card, study, persistStudy, advance, filter]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (mode !== "study" || (event.target as HTMLElement)?.closest("input, textarea, select, [contenteditable=true]")) return;
      if (event.code === "Space" && !(event.target as HTMLElement)?.closest("button")) { event.preventDefault(); setFlipped(v => !v); }
      if (event.key === "ArrowRight") { event.preventDefault(); advance(1); }
      if (event.key === "ArrowLeft") { event.preventDefault(); advance(-1); }
      if (event.key === "1") mark(false);
      if (event.key === "2") mark(true);
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [mode, advance, mark]);
  useEffect(() => {
    if (!autoplay || mode !== "study" || !card) return;
    const timer = setTimeout(() => flipped ? advance(1) : setFlipped(true), 4000);
    return () => clearTimeout(timer);
  }, [autoplay, mode, card, flipped, advance]);
  const updateCards = (next: Flashcard[]) => { setCards(next); void save({ cards: next }); };
  const knownCount = cards.filter(c => study.known.includes(c.id)).length;

  return <ArtifactShell artifact={artifact}>
    <div className="flex flex-wrap items-center gap-2">
      <button className={control} aria-pressed={mode === "study"} onClick={() => setMode("study")}>Study</button>
      <button className={control} aria-pressed={mode === "edit"} onClick={() => { setMode("edit"); setAutoplay(false); }}>Edit deck</button>
      <span className="ml-auto text-xs text-stone-500" role="status">{status}</span>
      {error && <button className="text-xs text-red-700" onClick={() => void retry()}>{error} · Retry</button>}
    </div>
    {mode === "study" ? <>
      <div className="flex flex-wrap gap-2">
        <select aria-label="Cards to study" className={control} value={filter} onChange={e => { setFilter(e.target.value); setIndex(0); setFlipped(false); }}>
          <option value="all">All cards ({cards.length})</option><option value="learning">Still learning ({cards.length - knownCount})</option><option value="starred">Starred</option>
        </select>
        <button className={control} onClick={() => { const ids = cards.map(c => c.id); for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; } setOrder(ids); setIndex(0); setFlipped(false); }}>Shuffle</button>
        <button className={control} aria-pressed={study.reverse} onClick={() => { persistStudy({ ...study, reverse: !study.reverse }); setFlipped(false); }}>Start with {study.reverse ? "term" : "definition"}</button>
        <button className={control} aria-pressed={autoplay} onClick={() => setAutoplay(v => !v)}>{autoplay ? "Pause" : "Autoplay"}</button>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-stone-200" role="progressbar" aria-label="Cards learned" aria-valuenow={knownCount} aria-valuemin={0} aria-valuemax={cards.length || 1}><div className="h-full bg-emerald-500" style={{ width: cards.length ? knownCount / cards.length * 100 + "%" : 0 }} /></div>
      {card ? <div className="relative">
        <button className="absolute right-4 top-4 z-10 rounded-full bg-stone-50 px-3 py-2 text-sm" aria-label={study.starred.includes(card.id) ? "Unstar card" : "Star card"} aria-pressed={study.starred.includes(card.id)} onClick={() => persistStudy({ ...study, starred: study.starred.includes(card.id) ? study.starred.filter(id => id !== card.id) : [...study.starred, card.id] })}>{study.starred.includes(card.id) ? "★" : "☆"}</button>
        <button type="button" aria-label={flipped ? "Show front of flashcard" : "Show back of flashcard"} aria-pressed={flipped} onClick={() => setFlipped(v => !v)} className="group block w-full rounded-2xl text-left outline-none [perspective:1200px] focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-4">
          <span className="relative grid min-h-[360px] w-full rounded-2xl shadow-sm transition-transform duration-300 motion-reduce:transition-none [transform-style:preserve-3d]" style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}>
            {[false, true].map(back => <span key={String(back)} aria-hidden={back !== flipped} className={"col-start-1 row-start-1 flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-stone-200 px-10 py-14 [backface-visibility:hidden] " + (back ? "bg-violet-50/80" : "bg-white")} style={{ transform: back ? "rotateY(180deg)" : undefined }}>
              <span className="mb-8 text-[11px] font-medium uppercase tracking-[0.18em] text-stone-400">{back !== study.reverse ? "Definition" : "Term"}</span>
              <span className="whitespace-pre-wrap text-center text-2xl leading-relaxed text-stone-800"><MathText text={back !== study.reverse ? card.back : card.front} /></span>
              <span className="mt-10 text-xs text-stone-400">Click to flip · Space</span>
            </span>)}
          </span>
        </button>
      </div> : <div className="rounded-2xl border border-dashed border-stone-300 p-12 text-center text-stone-500">{!cards.length ? "Add cards in Edit deck to begin." : filter === "learning" ? "You've learned every card. Nice work!" : "No cards match this filter."}</div>}
      <div className="flex items-center justify-between gap-2">
        <button className={control} disabled={!card} onClick={() => advance(-1)}>← Previous</button>
        <span className="text-sm text-stone-500">{card ? safeIndex + 1 : 0} / {deck.length}</span>
        <button className={control} disabled={!card} onClick={() => advance(1)}>Next →</button>
      </div>
      <div className="flex justify-center gap-3">
        <button className={control} disabled={!card} onClick={() => mark(false)}>1 · Still learning</button>
        <button className="rounded-lg bg-stone-900 px-5 py-2 text-sm text-white disabled:opacity-40" disabled={!card} onClick={() => mark(true)}>2 · Know it</button>
      </div>
      <div className="flex items-center justify-between text-xs text-stone-500"><span>{knownCount} of {cards.length} learned · Progress saves automatically</span><button onClick={() => { persistStudy({ ...study, known: [] }); setIndex(0); setFlipped(false); }}>Restart progress</button></div>
    </> : <>
      <div className="flex justify-between"><span className="text-sm text-stone-500">{cards.length} cards · Use $...$ for equations</span><button className={control} onClick={() => downloadDeck(cards, artifact.title)}>Export TSV</button></div>
      {cards.map((c, i) => <div key={c.id} className="rounded-xl border border-stone-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between"><span className="text-xs text-stone-400">CARD {i + 1}</span><div className="flex gap-3 text-xs">
          <button disabled={i === 0} onClick={() => { const next = [...cards]; [next[i-1], next[i]] = [next[i], next[i-1]]; updateCards(next); }}>Move up</button>
          <button disabled={i === cards.length - 1} onClick={() => { const next = [...cards]; [next[i+1], next[i]] = [next[i], next[i+1]]; updateCards(next); }}>Move down</button>
          <button onClick={() => updateCards([...cards.slice(0, i+1), { ...c, id: crypto.randomUUID() }, ...cards.slice(i+1)])}>Duplicate</button>
          <button className="text-red-700" onClick={() => updateCards(cards.filter(x => x.id !== c.id))}>Delete</button>
        </div></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-stone-500">Term<textarea aria-label={"Term " + (i+1)} className={field} rows={3} value={c.front} onChange={e => updateCards(cards.map(x => x.id === c.id ? { ...x, front: e.target.value } : x))} /></label>
          <label className="text-xs text-stone-500">Definition<textarea aria-label={"Definition " + (i+1)} className={field} rows={3} value={c.back} onChange={e => updateCards(cards.map(x => x.id === c.id ? { ...x, back: e.target.value } : x))} /></label>
        </div>
      </div>)}
      <button className={control} onClick={() => updateCards([...cards, { id: crypto.randomUUID(), front: "", back: "" }])}>+ Add card</button>
      <details className="rounded-xl border border-stone-200 p-4"><summary className="cursor-pointer text-sm">Import cards from a spreadsheet or text</summary>
        <p className="py-3 text-xs text-stone-500">One card per line. Separate each term and definition with a tab or |. Import adds to this deck.</p>
        <textarea aria-label="Cards to import" className={field} rows={5} value={importText} onChange={e => setImportText(e.target.value)} placeholder={"Mitosis\tCell division\nMeiosis\tGamete formation"} />
        <input aria-label="Import flashcard text file" type="file" accept=".txt,.tsv" className="my-3 text-sm" onChange={async e => { const file = e.target.files?.[0]; if (file) setImportText(await file.text()); }} />
        {importError && <p role="alert" className="text-sm text-red-700">{importError}</p>}
        <button className={control} onClick={() => { const lines = importText.split(/\r?\n/).filter(l => l.trim()); const parsed = lines.map(line => { const at = line.includes("\t") ? line.indexOf("\t") : line.indexOf("|"); return { id: crypto.randomUUID(), front: at < 0 ? "" : line.slice(0, at).trim(), back: at < 0 ? "" : line.slice(at + 1).trim() }; }); if (!parsed.length || parsed.some(c => !c.front || !c.back)) { setImportError("Each line needs a term and definition, separated by a tab or |."); return; } updateCards([...cards, ...parsed]); setImportText(""); setImportError(""); }}>Import cards</button>
      </details>
    </>}
  </ArtifactShell>;
}
