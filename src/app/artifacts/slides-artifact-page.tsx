"use client";

import { useState } from "react";
import { useViewId } from "@/components/view-provider";
import { ArtifactShell } from "./artifact-shell";
import { MathText } from "@/components/ui/math-text";
import type { Slide, SlidesArtifact } from "@/lib/mock-data";

export default function SlidesArtifactPage({
  artifact,
}: {
  artifact: SlidesArtifact;
}) {
  const viewId = useViewId();
  const [slides, setSlides] = useState<Slide[]>(
    artifact.slides?.length
      ? artifact.slides
      : [{ id: "s1", title: artifact.title, bodyHtml: "<p></p>" }],
  );
  const [index, setIndex] = useState(0);
  const current = slides[index] ?? slides[0];

  const persist = async (next: Slide[]) => {
    setSlides(next);
    await fetch(`/api/${viewId}/artifacts/${artifact.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slides: next }),
    });
  };

  const updateCurrent = (patch: Partial<Slide>) => {
    const next = slides.map((slide, i) =>
      i === index ? { ...slide, ...patch } : slide,
    );
    setSlides(next);
  };

  return (
    <ArtifactShell artifact={artifact}>
      <div className="flex min-h-[320px] flex-col justify-between rounded-[14px] border border-[#E6E6E6] bg-white px-10 py-9">
        <input
          value={current?.title ?? ""}
          onChange={(event) => updateCurrent({ title: event.target.value })}
          onBlur={() => void persist(slides)}
          className="font-display text-[28px] leading-[34px] tracking-[-0.02em] text-[#0A0A0A] outline-none"
        />
        <textarea
          value={current?.bodyHtml?.replace(/<[^>]+>/g, "") ?? ""}
          onChange={(event) =>
            updateCurrent({ bodyHtml: `<p>${event.target.value}</p>` })
          }
          onBlur={() => void persist(slides)}
          className="mt-6 min-h-[140px] resize-none text-[16px] leading-[26px] text-[#1F1F1D] outline-none"
        />
        {current?.bodyHtml?.includes("$") ? (
          <div className="mt-4 text-[16px] leading-[26px] text-[#1F1F1D]">
            <MathText text={current.bodyHtml.replace(/<[^>]+>/g, "")} />
          </div>
        ) : null}
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={index <= 0}
          onClick={() => setIndex((value) => Math.max(0, value - 1))}
          className="h-8 rounded-full border border-[#E6E6E6] px-3 text-[12px] disabled:opacity-40"
        >
          Previous
        </button>
        <span className="text-[12px] text-[#9A9A98]">
          {index + 1} / {slides.length}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              const next = [
                ...slides,
                {
                  id: `s_${Date.now().toString(36)}`,
                  title: "New slide",
                  bodyHtml: "<p></p>",
                },
              ];
              void persist(next);
              setIndex(next.length - 1);
            }}
            className="h-8 rounded-full border border-[#E6E6E6] px-3 text-[12px]"
          >
            Add slide
          </button>
          <button
            type="button"
            disabled={index >= slides.length - 1}
            onClick={() => setIndex((value) => Math.min(slides.length - 1, value + 1))}
            className="h-8 rounded-full border border-[#E6E6E6] px-3 text-[12px] disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </ArtifactShell>
  );
}
