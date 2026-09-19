"use client";
import { DesignCopy } from "@/components/design/runtime";

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
    <div data-design-id="m-0dde3c12e9bd" className="flex flex-wrap items-center gap-2">
      <button data-design-id="m-cd677734adaa" className={button} aria-pressed={!editing} onClick={() => setEditing(false)}><DesignCopy id="m-cd677734adaa">Take test</DesignCopy></button>
      <button data-design-id="m-84d9baa4bfc0" className={button} aria-pressed={editing} onClick={() => setEditing(true)}><DesignCopy id="m-84d9baa4bfc0">Edit questions</DesignCopy></button>
      <button data-design-id="m-f770ff393680" className={button} onClick={() => window.print()}><DesignCopy id="m-f770ff393680">Print / PDF</DesignCopy></button>
      <span data-design-id="m-bf0d134e320b" className="ml-auto text-xs text-stone-500" role="status">{status}</span>
      {error && <button data-design-id="m-2e0b2402d804" className="text-xs text-red-700" onClick={() => void retry()}>{error} · Retry</button>}
    </div>
    {message && <p data-design-id="m-e27f2c5f3711" role="alert" className="text-sm text-amber-700">{message}</p>}
    {editing ? <>
      <p data-design-id="m-f2b3a4358ee7" className="text-sm text-stone-500"><DesignCopy id="m-f2b3a4358ee7">Edit the question bank. Existing attempts keep their original questions. Use $...$ for equations.</DesignCopy></p>
      {items.map((item, index) => <div data-design-id="m-95a57cbe902e" data-design-key={item.id} key={item.id} className="space-y-3 rounded-xl border border-stone-200 bg-white p-5">
        <div data-design-id="m-c260af322a74" className="flex justify-between text-xs text-stone-500"><span data-design-id="m-f34b95fb035a">QUESTION {index + 1}</span><div data-design-id="m-dfc548b1587b" className="flex gap-3">
          <button data-design-id="m-c1ad65d26f8f" disabled={index === 0} onClick={() => { const next = [...items]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; persistItems(next); }}><DesignCopy id="m-c1ad65d26f8f">Move up</DesignCopy></button>
          <button data-design-id="m-df692cbc4c63" onClick={() => persistItems([...items.slice(0, index+1), { ...item, id: crypto.randomUUID() }, ...items.slice(index+1)])}><DesignCopy id="m-df692cbc4c63">Duplicate</DesignCopy></button>
          <button data-design-id="m-e79efd783763" className="text-red-700" onClick={() => persistItems(items.filter(q => q.id !== item.id))}><DesignCopy id="m-e79efd783763">Delete</DesignCopy></button>
        </div></div>
        <label data-design-id="m-f9c94beb53a7" className="block text-xs text-stone-500">Question<textarea data-design-id="m-e9b8b5db2d7e" className={field} rows={3} value={item.prompt} onChange={e => persistItems(items.map(q => q.id === item.id ? { ...q, prompt: e.target.value } : q))} /></label>
        <label data-design-id="m-caa32e63cbb3" className="block text-xs text-stone-500">Answer key<textarea data-design-id="m-42f49b5812c7" className={field} rows={2} value={item.answer} onChange={e => persistItems(items.map(q => q.id === item.id ? { ...q, answer: e.target.value } : q))} /></label>
        <label data-design-id="m-e0b9d9b00f28" className="block text-xs text-stone-500">Explanation (optional)<textarea data-design-id="m-9e4065eab645" className={field} rows={2} value={item.explanation ?? ""} onChange={e => persistItems(items.map(q => q.id === item.id ? { ...q, explanation: e.target.value } : q))} /></label>
      </div>)}
      <button data-design-id="m-4200807525cb" className={button} onClick={() => persistItems([...items, { id: crypto.randomUUID(), prompt: "", answer: "" }])}><DesignCopy id="m-4200807525cb">+ Add question</DesignCopy></button>
    </> : <>
      <div data-design-id="m-89630a14e138" className="flex flex-wrap items-center gap-3">
        <button data-design-id="m-98535edd8798" className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-40" disabled={!items.length} onClick={() => start()}><DesignCopy id="m-98535edd8798">Start new attempt</DesignCopy></button>
        {!!attempts.length && <select data-design-id="m-09f557de2ad1" className={button} aria-label="Choose attempt" value={selected ?? ""} onChange={e => setSelected(e.target.value)}>{[...attempts].reverse().map((a, i) => <option key={a.id} value={a.id}>Attempt {attempts.length - i} · {a.submittedAt ? "Review" : "In progress"}</option>)}</select>}
        <span data-design-id="m-a67150b57853" className="text-sm text-stone-500">{attempt ? answered + " / " + questions.length + " answered" : items.length + " questions"}</span>
      </div>
      {!attempt ? <div data-design-id="m-d5cffa198f16" className="rounded-xl border border-dashed border-stone-300 p-10 text-center text-stone-500">{items.length ? "Start an attempt when you’re ready. Your answers save as you type; the answer key stays hidden until you finish." : "Add questions in the editor or ask Monarch to prepare a practice test from your course materials."}</div> : <>
        {attempt.submittedAt && <div data-design-id="m-993269ad036f" className="rounded-xl bg-stone-100 p-5">
          <p data-design-id="m-157074903c41" className="text-lg font-medium"><DesignCopy id="m-157074903c41">Review your work</DesignCopy></p><p data-design-id="m-dde506db9123" className="mt-1 text-sm text-stone-600"><DesignCopy id="m-dde506db9123">Compare your responses with the answer key, then mark each question. This is a self-assessment, not an automatic grade.</DesignCopy></p>
          <p data-design-id="m-1e38dbf22e89" className="mt-3 text-sm">{questions.filter(q => attempt.marks[q.id] === true).length} correct · {questions.filter(q => attempt.marks[q.id] === false).length} to review · {questions.filter(q => attempt.marks[q.id] === undefined).length} unmarked</p>
        </div>}
        {questions.map((q, i) => <section data-design-id="m-4c079046f641" data-design-key={q.id} key={q.id} className="rounded-xl border border-stone-200 bg-white p-5">
          <h2 data-design-id="m-5ebf9fe1a981" className="text-xs uppercase tracking-wider text-stone-400">Question {i + 1}</h2><div data-design-id="m-67d4fd1ba8aa" className="my-3 whitespace-pre-wrap text-base leading-relaxed"><MathText text={q.prompt} /></div>
          <label data-design-id="m-4d7f971351cc" className="text-xs text-stone-500">Your answer<textarea data-design-id="m-ffbe8614b38a" className={field} rows={4} readOnly={!!attempt.submittedAt} value={attempt.answers[q.id] ?? ""} onChange={e => updateAttempt({ ...attempt, answers: { ...attempt.answers, [q.id]: e.target.value } })} /></label>
          {attempt.submittedAt && <div data-design-id="m-aea678b8fa41" className="mt-4 space-y-3 border-t border-stone-100 pt-4">
            <div data-design-id="m-a1d5f891251a" className="text-xs font-medium text-stone-400"><DesignCopy id="m-a1d5f891251a">ANSWER KEY</DesignCopy></div><div data-design-id="m-a7246bf6888e" className="whitespace-pre-wrap text-sm"><MathText text={q.answer || "No answer key supplied."} /></div>
            {q.explanation && <div data-design-id="m-65fd1d8a71d2" className="text-sm text-stone-600"><MathText text={q.explanation} /></div>}
            <div data-design-id="m-217c93a26549" className="flex gap-2"><button data-design-id="m-e540c17ce353" className={button} aria-pressed={attempt.marks[q.id] === true} onClick={() => updateAttempt({ ...attempt, marks: { ...attempt.marks, [q.id]: true } })}>{attempt.marks[q.id] === true ? "✓ " : ""}Got it right</button><button data-design-id="m-e42afffd1ef0" className={button} aria-pressed={attempt.marks[q.id] === false} onClick={() => updateAttempt({ ...attempt, marks: { ...attempt.marks, [q.id]: false } })}>{attempt.marks[q.id] === false ? "✓ " : ""}Needs review</button></div>
          </div>}
        </section>)}
        {!attempt.submittedAt ? <button data-design-id="m-235b1e42b848" className="rounded-lg bg-stone-900 px-5 py-3 text-sm text-white" onClick={() => { if (answered < questions.length && !window.confirm("You have unanswered questions. Finish and reveal the answer key?")) return; updateAttempt({ ...attempt, submittedAt: new Date().toISOString() }); }}><DesignCopy id="m-235b1e42b848">Finish and review answers</DesignCopy></button> : <button data-design-id="m-85795f44efea" className={button} disabled={questions.every(q => attempt.marks[q.id] === true)} onClick={() => start(true)}><DesignCopy id="m-85795f44efea">Practice questions that need review</DesignCopy></button>}
      </>}
    </>}
  </ArtifactShell>;
}
