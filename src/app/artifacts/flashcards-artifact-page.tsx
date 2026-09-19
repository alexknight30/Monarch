"use client";
import { DesignCopy } from "@/components/design/runtime";


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
    <div data-design-id="m-f2073531a979" className="flex flex-wrap items-center gap-2">
      <button data-design-id="m-3cbfd28d7023" className={control} aria-pressed={mode === "study"} onClick={() => setMode("study")}><DesignCopy id="m-3cbfd28d7023">Study</DesignCopy></button>
      <button data-design-id="m-c96c5c0e595f" className={control} aria-pressed={mode === "edit"} onClick={() => { setMode("edit"); setAutoplay(false); }}><DesignCopy id="m-c96c5c0e595f">Edit deck</DesignCopy></button>
      <span data-design-id="m-472df68491ae" className="ml-auto text-xs text-stone-500" role="status">{status}</span>
      {error && <button data-design-id="m-36709ed88a8f" className="text-xs text-red-700" onClick={() => void retry()}>{error} · Retry</button>}
    </div>
    {mode === "study" ? <>
      <div data-design-id="m-d76cc2087bc6" className="flex flex-wrap gap-2">
        <select data-design-id="m-17961d035b96" aria-label="Cards to study" className={control} value={filter} onChange={e => { setFilter(e.target.value); setIndex(0); setFlipped(false); }}>
          <option value="all">All cards ({cards.length})</option><option value="learning">Still learning ({cards.length - knownCount})</option><option value="starred">Starred</option>
        </select>
        <button data-design-id="m-3c3717f56992" className={control} onClick={() => { const ids = cards.map(c => c.id); for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; } setOrder(ids); setIndex(0); setFlipped(false); }}><DesignCopy id="m-3c3717f56992">Shuffle</DesignCopy></button>
        <button data-design-id="m-4d54818a00d9" className={control} aria-pressed={study.reverse} onClick={() => { persistStudy({ ...study, reverse: !study.reverse }); setFlipped(false); }}>Start with {study.reverse ? "term" : "definition"}</button>
        <button data-design-id="m-606f0c0361a9" className={control} aria-pressed={autoplay} onClick={() => setAutoplay(v => !v)}>{autoplay ? "Pause" : "Autoplay"}</button>
      </div>
      <div data-design-id="m-8cf0ea9343fc" className="h-1.5 overflow-hidden rounded-full bg-stone-200" role="progressbar" aria-label="Cards learned" aria-valuenow={knownCount} aria-valuemin={0} aria-valuemax={cards.length || 1}><div data-design-id="m-12f4872413ff" className="h-full bg-emerald-500" style={{ width: cards.length ? knownCount / cards.length * 100 + "%" : 0 }} /></div>
      {card ? <div data-design-id="m-da8dff44dcd2" className="relative">
        <button data-design-id="m-903494fca772" className="absolute right-4 top-4 z-10 rounded-full bg-stone-50 px-3 py-2 text-sm" aria-label={study.starred.includes(card.id) ? "Unstar card" : "Star card"} aria-pressed={study.starred.includes(card.id)} onClick={() => persistStudy({ ...study, starred: study.starred.includes(card.id) ? study.starred.filter(id => id !== card.id) : [...study.starred, card.id] })}>{study.starred.includes(card.id) ? "★" : "☆"}</button>
        <button data-design-id="m-e1197595fbed" type="button" aria-label={flipped ? "Show front of flashcard" : "Show back of flashcard"} aria-pressed={flipped} onClick={() => setFlipped(v => !v)} className="group block w-full rounded-2xl text-left outline-none [perspective:1200px] focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-4">
          <span data-design-id="m-3b85e5eac873" className="relative grid min-h-[360px] w-full rounded-2xl shadow-sm transition-transform duration-300 motion-reduce:transition-none [transform-style:preserve-3d]" style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}>
            {[false, true].map(back => <span data-design-id="m-0ec262ed7536" key={String(back)} aria-hidden={back !== flipped} className={"col-start-1 row-start-1 flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-stone-200 px-10 py-14 [backface-visibility:hidden] " + (back ? "bg-violet-50/80" : "bg-white")} style={{ transform: back ? "rotateY(180deg)" : undefined }}>
              <span data-design-id="m-ea87216ac777" className="mb-8 text-[11px] font-medium uppercase tracking-[0.18em] text-stone-400">{back !== study.reverse ? "Definition" : "Term"}</span>
              <span data-design-id="m-96b2710d6457" className="whitespace-pre-wrap text-center text-2xl leading-relaxed text-stone-800"><MathText text={back !== study.reverse ? card.back : card.front} /></span>
              <span data-design-id="m-da50999082b6" className="mt-10 text-xs text-stone-400"><DesignCopy id="m-da50999082b6">Click to flip · Space</DesignCopy></span>
            </span>)}
          </span>
        </button>
      </div> : <div data-design-id="m-04ef4edde36d" className="rounded-2xl border border-dashed border-stone-300 p-12 text-center text-stone-500">{!cards.length ? "Add cards in Edit deck to begin." : filter === "learning" ? "You've learned every card. Nice work!" : "No cards match this filter."}</div>}
      <div data-design-id="m-f25ef85c38fa" className="flex items-center justify-between gap-2">
        <button data-design-id="m-c7f60b9cfd29" className={control} disabled={!card} onClick={() => advance(-1)}><DesignCopy id="m-c7f60b9cfd29">← Previous</DesignCopy></button>
        <span data-design-id="m-ccfbbef4399a" className="text-sm text-stone-500">{card ? safeIndex + 1 : 0} / {deck.length}</span>
        <button data-design-id="m-31e018293101" className={control} disabled={!card} onClick={() => advance(1)}><DesignCopy id="m-31e018293101">Next →</DesignCopy></button>
      </div>
      <div data-design-id="m-8ed7ddeca356" className="flex justify-center gap-3">
        <button data-design-id="m-55e8f5e950c6" className={control} disabled={!card} onClick={() => mark(false)}><DesignCopy id="m-55e8f5e950c6">1 · Still learning</DesignCopy></button>
        <button data-design-id="m-e24f1af6d546" className="rounded-lg bg-stone-900 px-5 py-2 text-sm text-white disabled:opacity-40" disabled={!card} onClick={() => mark(true)}><DesignCopy id="m-e24f1af6d546">2 · Know it</DesignCopy></button>
      </div>
      <div data-design-id="m-1fdd12ef0887" className="flex items-center justify-between text-xs text-stone-500"><span data-design-id="m-7a49103f8a34">{knownCount} of {cards.length} learned · Progress saves automatically</span><button data-design-id="m-00ec903b2233" onClick={() => { persistStudy({ ...study, known: [] }); setIndex(0); setFlipped(false); }}><DesignCopy id="m-00ec903b2233">Restart progress</DesignCopy></button></div>
    </> : <>
      <div data-design-id="m-9c0e578cf4b8" className="flex justify-between"><span data-design-id="m-ad5cbdcd4c9c" className="text-sm text-stone-500">{cards.length} cards · Use $...$ for equations</span><button data-design-id="m-1c9f7adbd051" className={control} onClick={() => downloadDeck(cards, artifact.title)}><DesignCopy id="m-1c9f7adbd051">Export TSV</DesignCopy></button></div>
      {cards.map((c, i) => <div data-design-id="m-97e64d5a40e7" data-design-key={c.id} key={c.id} className="rounded-xl border border-stone-200 bg-white p-4">
        <div data-design-id="m-a1569a445181" className="mb-3 flex items-center justify-between"><span data-design-id="m-6e77af5da4ec" className="text-xs text-stone-400">CARD {i + 1}</span><div data-design-id="m-71f4814eb35d" className="flex gap-3 text-xs">
          <button data-design-id="m-a4518e64701a" disabled={i === 0} onClick={() => { const next = [...cards]; [next[i-1], next[i]] = [next[i], next[i-1]]; updateCards(next); }}><DesignCopy id="m-a4518e64701a">Move up</DesignCopy></button>
          <button data-design-id="m-d1e142c50a8f" disabled={i === cards.length - 1} onClick={() => { const next = [...cards]; [next[i+1], next[i]] = [next[i], next[i+1]]; updateCards(next); }}><DesignCopy id="m-d1e142c50a8f">Move down</DesignCopy></button>
          <button data-design-id="m-ee4e8b598d7d" onClick={() => updateCards([...cards.slice(0, i+1), { ...c, id: crypto.randomUUID() }, ...cards.slice(i+1)])}><DesignCopy id="m-ee4e8b598d7d">Duplicate</DesignCopy></button>
          <button data-design-id="m-e23efc38c107" className="text-red-700" onClick={() => updateCards(cards.filter(x => x.id !== c.id))}><DesignCopy id="m-e23efc38c107">Delete</DesignCopy></button>
        </div></div>
        <div data-design-id="m-a595a5f994c0" className="grid gap-3 sm:grid-cols-2">
          <label data-design-id="m-04c7a3da44da" className="text-xs text-stone-500">Term<textarea data-design-id="m-f09cbcff2671" aria-label={"Term " + (i+1)} className={field} rows={3} value={c.front} onChange={e => updateCards(cards.map(x => x.id === c.id ? { ...x, front: e.target.value } : x))} /></label>
          <label data-design-id="m-10740baac831" className="text-xs text-stone-500">Definition<textarea data-design-id="m-2c85c9cd728d" aria-label={"Definition " + (i+1)} className={field} rows={3} value={c.back} onChange={e => updateCards(cards.map(x => x.id === c.id ? { ...x, back: e.target.value } : x))} /></label>
        </div>
      </div>)}
      <button data-design-id="m-1c631087d71f" className={control} onClick={() => updateCards([...cards, { id: crypto.randomUUID(), front: "", back: "" }])}><DesignCopy id="m-1c631087d71f">+ Add card</DesignCopy></button>
      <details data-design-id="m-608be746eed3" className="rounded-xl border border-stone-200 p-4"><summary data-design-id="m-93abaec0ae71" className="cursor-pointer text-sm"><DesignCopy id="m-93abaec0ae71">Import cards from a spreadsheet or text</DesignCopy></summary>
        <p data-design-id="m-3087ff7307ea" className="py-3 text-xs text-stone-500"><DesignCopy id="m-3087ff7307ea">One card per line. Separate each term and definition with a tab or |. Import adds to this deck.</DesignCopy></p>
        <textarea data-design-id="m-16af077aa9d1" aria-label="Cards to import" className={field} rows={5} value={importText} onChange={e => setImportText(e.target.value)} placeholder={"Mitosis\tCell division\nMeiosis\tGamete formation"} />
        <input data-design-id="m-64a36eeadee7" aria-label="Import flashcard text file" type="file" accept=".txt,.tsv" className="my-3 text-sm" onChange={async e => { const file = e.target.files?.[0]; if (file) setImportText(await file.text()); }} />
        {importError && <p data-design-id="m-0393dff26c28" role="alert" className="text-sm text-red-700">{importError}</p>}
        <button data-design-id="m-5a0e17beb7f0" className={control} onClick={() => { const lines = importText.split(/\r?\n/).filter(l => l.trim()); const parsed = lines.map(line => { const at = line.includes("\t") ? line.indexOf("\t") : line.indexOf("|"); return { id: crypto.randomUUID(), front: at < 0 ? "" : line.slice(0, at).trim(), back: at < 0 ? "" : line.slice(at + 1).trim() }; }); if (!parsed.length || parsed.some(c => !c.front || !c.back)) { setImportError("Each line needs a term and definition, separated by a tab or |."); return; } updateCards([...cards, ...parsed]); setImportText(""); setImportError(""); }}><DesignCopy id="m-5a0e17beb7f0">Import cards</DesignCopy></button>
      </details>
    </>}
  </ArtifactShell>;
}
