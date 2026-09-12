"use client";

import { useState } from "react";
import { useViewId } from "@/components/view-provider";
import { ArtifactShell } from "./artifact-shell";
import { MathText } from "@/components/ui/math-text";
import type { LessonArtifact, LessonBlock } from "@/lib/mock-data";

export default function LessonArtifactPage({
  artifact,
}: {
  artifact: LessonArtifact;
}) {
  const viewId = useViewId();
  const [blocks, setBlocks] = useState<LessonBlock[]>(artifact.blocks ?? []);
  const [draft, setDraft] = useState("");
  const [kind, setKind] = useState<"text" | "prompt">("text");

  const persist = async (next: LessonBlock[]) => {
    setBlocks(next);
    await fetch(`/api/${viewId}/artifacts/${artifact.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks: next }),
    });
  };

  return (
    <ArtifactShell artifact={artifact}>
      <div className="flex flex-col gap-3">
        {blocks.map((block) => (
          <div
            key={block.id}
            className="rounded-[14px] border border-[#E6E6E6] bg-white p-5"
          >
            {block.type === "prompt" ? (
              <div>
                <p className="text-[11px] uppercase tracking-[0.08em] text-[#6A618C]">
                  Agent prompt
                </p>
                <p className="pt-2 text-[15px] leading-[24px] text-[#0A0A0A]">
                  {block.prompt}
                </p>
              </div>
            ) : (
              <p className="text-[15px] leading-[24px] text-[#1F1F1D]">
                <MathText text={block.html ?? ""} />
              </p>
            )}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2 rounded-[14px] border border-[#E6E6E6] bg-white p-4">
        <div className="flex gap-2">
          {(["text", "prompt"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setKind(id)}
              className={`h-7 rounded-full px-3 text-[12px] ${
                kind === id ? "bg-[#0A0A0A] text-white" : "bg-[#F1F1EF] text-[#5E5E5E]"
              }`}
            >
              {id === "text" ? "Text" : "Agent prompt"}
            </button>
          ))}
        </div>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={kind === "prompt" ? "Prompt the agent should ask" : "Lesson text"}
          className="min-h-[80px] rounded-md border border-[#E6E6E6] px-3 py-2 text-[13px] outline-none"
        />
        <button
          type="button"
          onClick={() => {
            if (!draft.trim()) return;
            const block: LessonBlock =
              kind === "prompt"
                ? { id: `lb_${Date.now().toString(36)}`, type: "prompt", prompt: draft.trim() }
                : { id: `lb_${Date.now().toString(36)}`, type: "text", html: draft.trim() };
            void persist([...blocks, block]);
            setDraft("");
          }}
          className="h-8 self-start rounded-full border border-[#E6E6E6] px-3 text-[12px] font-medium"
        >
          Add block
        </button>
      </div>
    </ArtifactShell>
  );
}
