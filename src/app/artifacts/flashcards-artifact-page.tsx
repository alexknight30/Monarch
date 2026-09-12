"use client";

import { useState } from "react";
import { useViewId } from "@/components/view-provider";
import { ArtifactShell } from "./artifact-shell";
import { MathText } from "@/components/ui/math-text";
import type { Flashcard, FlashcardsArtifact } from "@/lib/mock-data";

export default function FlashcardsArtifactPage({
  artifact,
}: {
  artifact: FlashcardsArtifact;
}) {
  const viewId = useViewId();
  const [cards, setCards] = useState<Flashcard[]>(artifact.cards ?? []);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");

  const persist = async (next: Flashcard[]) => {
    setCards(next);
    await fetch(`/api/${viewId}/artifacts/${artifact.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cards: next }),
    });
  };

  const card = cards[index];

  return (
    <ArtifactShell artifact={artifact}>
      {card ? (
        <button
          type="button"
          onClick={() => setFlipped((value) => !value)}
          className="flex min-h-[220px] w-full flex-col items-center justify-center rounded-[14px] border border-[#E6E6E6] bg-white px-8 py-10 text-center"
        >
          <span className="text-[11px] uppercase tracking-[0.08em] text-[#9A9A98]">
            {flipped ? "Back" : "Front"}
          </span>
          <p className="pt-3 text-xl leading-7 text-[#0A0A0A]">
            <MathText text={flipped ? card.back : card.front} />
          </p>
        </button>
      ) : (
        <p className="text-sm text-[#9A9A98]">No cards yet.</p>
      )}
      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={index <= 0}
          onClick={() => {
            setIndex((value) => Math.max(0, value - 1));
            setFlipped(false);
          }}
          className="h-8 rounded-full border border-[#E6E6E6] px-3 text-[12px] disabled:opacity-40"
        >
          Previous
        </button>
        <span className="text-[12px] text-[#9A9A98]">
          {cards.length ? `${index + 1} / ${cards.length}` : "0 / 0"}
        </span>
        <button
          type="button"
          disabled={index >= cards.length - 1}
          onClick={() => {
            setIndex((value) => Math.min(cards.length - 1, value + 1));
            setFlipped(false);
          }}
          className="h-8 rounded-full border border-[#E6E6E6] px-3 text-[12px] disabled:opacity-40"
        >
          Next
        </button>
      </div>
      <div className="flex flex-col gap-2 rounded-[14px] border border-[#E6E6E6] bg-white p-4">
        <input
          value={front}
          onChange={(event) => setFront(event.target.value)}
          placeholder="Front"
          className="h-9 rounded-md border border-[#E6E6E6] px-3 text-[13px] outline-none"
        />
        <input
          value={back}
          onChange={(event) => setBack(event.target.value)}
          placeholder="Back"
          className="h-9 rounded-md border border-[#E6E6E6] px-3 text-[13px] outline-none"
        />
        <button
          type="button"
          onClick={() => {
            if (!front.trim() || !back.trim()) return;
            const next = [
              ...cards,
              {
                id: `card_${Date.now().toString(36)}`,
                front: front.trim(),
                back: back.trim(),
              },
            ];
            setFront("");
            setBack("");
            void persist(next);
            setIndex(next.length - 1);
            setFlipped(false);
          }}
          className="h-8 self-start rounded-full border border-[#E6E6E6] px-3 text-[12px] font-medium"
        >
          Add card
        </button>
      </div>
    </ArtifactShell>
  );
}
