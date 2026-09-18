"use client";
import { useEffect, useState } from "react";
import { useViewId } from "@/components/view-provider";
import { ArtifactShell } from "./artifact-shell";
import { MathText } from "@/components/ui/math-text";
import { readArtifactDraft, useArtifactSave } from "@/lib/use-artifact-save";
import type { PracticeItem, PracticeTestArtifact } from "@/lib/mock-data";

type Attempt = NonNullable<PracticeTestArtifact["attempts"]>[number];
const button = "rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm hover:bg-stone-50 disabled:opacity-40";
const field = "w-full rounded-lg border border-stone-200 p-3 text-sm outline-none focus:border-stone-500";
export default function PracticeTestArtifactPage({ artifact }: { artifact: PracticeTestArtifact }) {
  const viewId = useViewId();
  const { save, retry, status, error } = useArtifactSave(artifact.id, undefined, artifact);
  const [items, setItems] = useState<PracticeItem[]>(artifact.items);
  const [attempts, setAttempts] = useState<Attempt[]>(artifact.attempts ?? []);
  const [selected, setSelected] = useState<string | null>(artifact.attempts?.at(-1)?.id ?? null);
  const [editing, setEditing] = useState(!artifact.items.length);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const draft = readArtifactDraft(viewId, artifact.id);
    if (draft) {
      // Restore browser-only drafts after hydration, preserving the server's first render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (Array.isArray(draft.items)) setItems(draft.items as PracticeItem[]);
      if (Array.isArray(draft.attempts)) { const recovered = draft.attempts as Attempt[]; setAttempts(recovered); setSelected(recovered.at(-1)?.id ?? null); }
      void save(draft);
    }
  }, [artifact.id, viewId, save]);
  const attempt = attempts.find(a => a.id === selected);
  const questions = attempt?.questions ?? items;
  const answered = attempt ? questions.filter(q => attempt.answers[q.id]?.trim()).length : 0;
  const persistItems = (next: PracticeItem[]) => { setItems(next); void save({ items: next }); };
  const updateAttempt = (next: Attempt) => { const all = attempts.map(a => a.id === next.id ? next : a); setAttempts(all); void save({ attempts: all }); };
  const start = (missed = false) => {
    const selectedQuestions = missed && attempt ? attempt.questions.filter(q => attempt.marks[q.id] !== true) : items;
    if (!selectedQuestions.length || selectedQuestions.some(q => !q.prompt.trim())) { setMessage("Add a question before starting, and give every question a prompt."); return; }
    const next: Attempt = { id: crypto.randomUUID(), startedAt: new Date().toISOString(), answers: {}, marks: {}, questions: selectedQuestions.map(q => ({ ...q })) };
    const all = [...attempts, next]; setAttempts(all); setSelected(next.id); setEditing(false); setMessage(""); void save({ attempts: all });
  };
  return <ArtifactShell artifact={artifact}>
    <div className="flex flex-wrap items-center gap-2">
      <button className={button} aria-pressed={!editing} onClick={() => setEditing(false)}>Take test</button>
      <button className={button} aria-pressed={editing} onClick={() => setEditing(true)}>Edit questions</button>
      <button className={button} onClick={() => window.print()}>Print / PDF</button>
      <span className="ml-auto text-xs text-stone-500" role="status">{status}</span>
      {error && <button className="text-xs text-red-700" onClick={() => void retry()}>{error} · Retry</button>}
    </div>
    {message && <p role="alert" className="text-sm text-amber-700">{message}</p>}
    {editing ? <>
      <p className="text-sm text-stone-500">Edit the question bank. Existing attempts keep their original questions. Use $...$ for equations.</p>
      {items.map((item, index) => <div key={item.id} className="space-y-3 rounded-xl border border-stone-200 bg-white p-5">
        <div className="flex justify-between text-xs text-stone-500"><span>QUESTION {index + 1}</span><div className="flex gap-3">
          <button disabled={index === 0} onClick={() => { const next = [...items]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; persistItems(next); }}>Move up</button>
          <button onClick={() => persistItems([...items.slice(0, index+1), { ...item, id: crypto.randomUUID() }, ...items.slice(index+1)])}>Duplicate</button>
          <button className="text-red-700" onClick={() => persistItems(items.filter(q => q.id !== item.id))}>Delete</button>
        </div></div>
        <label className="block text-xs text-stone-500">Question<textarea className={field} rows={3} value={item.prompt} onChange={e => persistItems(items.map(q => q.id === item.id ? { ...q, prompt: e.target.value } : q))} /></label>
        <label className="block text-xs text-stone-500">Answer key<textarea className={field} rows={2} value={item.answer} onChange={e => persistItems(items.map(q => q.id === item.id ? { ...q, answer: e.target.value } : q))} /></label>
        <label className="block text-xs text-stone-500">Explanation (optional)<textarea className={field} rows={2} value={item.explanation ?? ""} onChange={e => persistItems(items.map(q => q.id === item.id ? { ...q, explanation: e.target.value } : q))} /></label>
      </div>)}
      <button className={button} onClick={() => persistItems([...items, { id: crypto.randomUUID(), prompt: "", answer: "" }])}>+ Add question</button>
    </> : <>
      <div className="flex flex-wrap items-center gap-3">
        <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-40" disabled={!items.length} onClick={() => start()}>Start new attempt</button>
        {!!attempts.length && <select className={button} aria-label="Choose attempt" value={selected ?? ""} onChange={e => setSelected(e.target.value)}>{[...attempts].reverse().map((a, i) => <option key={a.id} value={a.id}>Attempt {attempts.length - i} · {a.submittedAt ? "Review" : "In progress"}</option>)}</select>}
        <span className="text-sm text-stone-500">{attempt ? answered + " / " + questions.length + " answered" : items.length + " questions"}</span>
      </div>
      {!attempt ? <div className="rounded-xl border border-dashed border-stone-300 p-10 text-center text-stone-500">{items.length ? "Start an attempt when you’re ready. Your answers save as you type; the answer key stays hidden until you finish." : "Add questions in the editor or ask Monarch to prepare a practice test from your course materials."}</div> : <>
        {attempt.submittedAt && <div className="rounded-xl bg-stone-100 p-5">
          <p className="text-lg font-medium">Review your work</p><p className="mt-1 text-sm text-stone-600">Compare your responses with the answer key, then mark each question. This is a self-assessment, not an automatic grade.</p>
          <p className="mt-3 text-sm">{questions.filter(q => attempt.marks[q.id] === true).length} correct · {questions.filter(q => attempt.marks[q.id] === false).length} to review · {questions.filter(q => attempt.marks[q.id] === undefined).length} unmarked</p>
        </div>}
        {questions.map((q, i) => <section key={q.id} className="rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="text-xs uppercase tracking-wider text-stone-400">Question {i + 1}</h2><div className="my-3 whitespace-pre-wrap text-base leading-relaxed"><MathText text={q.prompt} /></div>
          <label className="text-xs text-stone-500">Your answer<textarea className={field} rows={4} readOnly={!!attempt.submittedAt} value={attempt.answers[q.id] ?? ""} onChange={e => updateAttempt({ ...attempt, answers: { ...attempt.answers, [q.id]: e.target.value } })} /></label>
          {attempt.submittedAt && <div className="mt-4 space-y-3 border-t border-stone-100 pt-4">
            <div className="text-xs font-medium text-stone-400">ANSWER KEY</div><div className="whitespace-pre-wrap text-sm"><MathText text={q.answer || "No answer key supplied."} /></div>
            {q.explanation && <div className="text-sm text-stone-600"><MathText text={q.explanation} /></div>}
            <div className="flex gap-2"><button className={button} aria-pressed={attempt.marks[q.id] === true} onClick={() => updateAttempt({ ...attempt, marks: { ...attempt.marks, [q.id]: true } })}>{attempt.marks[q.id] === true ? "✓ " : ""}Got it right</button><button className={button} aria-pressed={attempt.marks[q.id] === false} onClick={() => updateAttempt({ ...attempt, marks: { ...attempt.marks, [q.id]: false } })}>{attempt.marks[q.id] === false ? "✓ " : ""}Needs review</button></div>
          </div>}
        </section>)}
        {!attempt.submittedAt ? <button className="rounded-lg bg-stone-900 px-5 py-3 text-sm text-white" onClick={() => { if (answered < questions.length && !window.confirm("You have unanswered questions. Finish and reveal the answer key?")) return; updateAttempt({ ...attempt, submittedAt: new Date().toISOString() }); }}>Finish and review answers</button> : <button className={button} disabled={questions.every(q => attempt.marks[q.id] === true)} onClick={() => start(true)}>Practice questions that need review</button>}
      </>}
    </>}
  </ArtifactShell>;
}
