"use client";

import { useState } from "react";
import { useViewId } from "@/components/view-provider";
import { ArtifactShell } from "./artifact-shell";
import { MathText } from "@/components/ui/math-text";
import type { PracticeItem, PracticeTestArtifact } from "@/lib/mock-data";

export default function PracticeTestArtifactPage({
  artifact,
}: {
  artifact: PracticeTestArtifact;
}) {
  const viewId = useViewId();
  const [items, setItems] = useState<PracticeItem[]>(artifact.items ?? []);
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const persist = async (next: PracticeItem[]) => {
    setItems(next);
    await fetch(`/api/${viewId}/artifacts/${artifact.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: next }),
    });
  };

  return (
    <ArtifactShell artifact={artifact}>
      <ul className="flex flex-col gap-4">
        {items.map((item, index) => (
          <li
            key={item.id}
            className="rounded-[14px] border border-[#E6E6E6] bg-white p-5"
          >
            <p className="text-[13px] font-medium text-[#9A9A98]">
              Question {index + 1}
            </p>
            <p className="pt-2 text-[15px] leading-[24px] text-[#0A0A0A]">
              <MathText text={item.prompt} />
            </p>
            <textarea
              value={item.studentAnswer ?? ""}
              onChange={(event) => {
                const next = items.map((row) =>
                  row.id === item.id
                    ? { ...row, studentAnswer: event.target.value }
                    : row,
                );
                setItems(next);
              }}
              onBlur={() => void persist(items)}
              placeholder="Your answer"
              className="mt-3 min-h-[72px] w-full rounded-md border border-[#E6E6E6] px-3 py-2 text-[13px] outline-none"
            />
            <button
              type="button"
              onClick={() =>
                setRevealed((current) => ({
                  ...current,
                  [item.id]: !current[item.id],
                }))
              }
              className="mt-2 text-[12px] font-medium text-[#6A618C]"
            >
              {revealed[item.id] ? "Hide answer" : "Show answer"}
            </button>
            {revealed[item.id] ? (
              <p className="pt-2 text-[13px] leading-[20px] text-[#4E4E4C]">
                <MathText text={item.answer} />
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2 rounded-[14px] border border-[#E6E6E6] bg-white p-4">
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Question prompt"
          className="min-h-[64px] rounded-md border border-[#E6E6E6] px-3 py-2 text-[13px] outline-none"
        />
        <textarea
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          placeholder="Answer key"
          className="min-h-[64px] rounded-md border border-[#E6E6E6] px-3 py-2 text-[13px] outline-none"
        />
        <button
          type="button"
          onClick={() => {
            if (!prompt.trim()) return;
            void persist([
              ...items,
              {
                id: `q_${Date.now().toString(36)}`,
                prompt: prompt.trim(),
                answer: answer.trim(),
              },
            ]);
            setPrompt("");
            setAnswer("");
          }}
          className="h-8 self-start rounded-full border border-[#E6E6E6] px-3 text-[12px] font-medium"
        >
          Add question
        </button>
      </div>
    </ArtifactShell>
  );
}
