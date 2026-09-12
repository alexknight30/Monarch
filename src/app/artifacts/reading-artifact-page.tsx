"use client";

import { useMemo, useState } from "react";
import { useViewId } from "@/components/view-provider";
import { ArtifactShell } from "./artifact-shell";
import { MathText } from "@/components/ui/math-text";
import type { ReadingAnnotation, ReadingArtifact } from "@/lib/mock-data";

export default function ReadingArtifactPage({
  artifact,
}: {
  artifact: ReadingArtifact;
}) {
  const viewId = useViewId();
  const [text, setText] = useState(artifact.bodyText ?? "");
  const [annotations, setAnnotations] = useState<ReadingAnnotation[]>(
    artifact.annotations ?? [],
  );
  const [quote, setQuote] = useState("");
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(artifact.updated);

  const persist = async (next: {
    bodyText?: string;
    annotations?: ReadingAnnotation[];
  }) => {
    const res = await fetch(`/api/${viewId}/artifacts/${artifact.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    if (res.ok) setSaved("Saved just now");
  };

  const addAnnotation = async () => {
    if (!quote.trim() && !note.trim()) return;
    const next = [
      {
        id: `ann_${Date.now().toString(36)}`,
        quote: quote.trim(),
        note: note.trim(),
      },
      ...annotations,
    ];
    setAnnotations(next);
    setQuote("");
    setNote("");
    await persist({ annotations: next });
  };

  const paragraphs = useMemo(
    () => text.split(/\n{2,}/).filter((p) => p.trim()),
    [text],
  );

  return (
    <ArtifactShell artifact={artifact}>
      <article className="rounded-[14px] border border-[#E6E6E6] bg-white px-8 py-7">
        {paragraphs.length ? (
          paragraphs.map((paragraph, index) => (
            <p
              key={index}
              className="pb-4 text-[15px] leading-[26px] text-[#1F1F1D] last:pb-0"
            >
              <MathText text={paragraph} />
            </p>
          ))
        ) : (
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onBlur={() => persist({ bodyText: text })}
            placeholder="Paste the reading here."
            className="min-h-[280px] w-full resize-y text-[15px] leading-[26px] text-[#1F1F1D] outline-none"
          />
        )}
      </article>
      <section className="rounded-[14px] border border-[#E6E6E6] bg-white p-5">
        <h2 className="text-sm font-medium text-[#0A0A0A]">Annotations</h2>
        <p className="pt-1 text-[12px] text-[#9A9A98]">{saved}</p>
        <div className="mt-3 flex flex-col gap-2">
          <textarea
            value={quote}
            onChange={(event) => setQuote(event.target.value)}
            placeholder="Quoted passage"
            className="min-h-[56px] rounded-md border border-[#E6E6E6] px-3 py-2 text-[13px] outline-none"
          />
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Your note"
            className="min-h-[56px] rounded-md border border-[#E6E6E6] px-3 py-2 text-[13px] outline-none"
          />
          <button
            type="button"
            onClick={() => void addAnnotation()}
            className="h-8 self-start rounded-full border border-[#E6E6E6] px-3 text-[12px] font-medium"
          >
            Add annotation
          </button>
        </div>
        <ul className="mt-4 flex flex-col gap-3">
          {annotations.map((item) => (
            <li key={item.id} className="rounded-md bg-[#F7F7F5] px-3 py-2">
              {item.quote ? (
                <p className="text-[13px] italic leading-[18px] text-[#4E4E4C]">
                  “{item.quote}”
                </p>
              ) : null}
              {item.note ? (
                <p className="pt-1 text-[13px] leading-[18px] text-[#0A0A0A]">
                  {item.note}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </ArtifactShell>
  );
}
