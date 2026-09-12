"use client";

/**
 * Detail page for a diagram artifact.
 *
 * The Diagram / Source toggle is doing real work here: it's the visible proof
 * this is a stored spec you can keep changing, not an exported picture.
 */

import { useState } from "react";
import Link from "next/link";
import { DiagramView } from "@/components/ui/diagram-view";
import { BreadcrumbBack } from "@/components/ui/breadcrumb-back";
import { useViewId } from "@/components/view-provider";
import {
  canExpandDiagram,
  describeDiagram,
  diagramToOutline,
  type DiagramDetail,
  type DiagramSpec,
} from "@/lib/diagram";
import { ARTIFACT_KIND_LABEL, type DiagramArtifact } from "@/lib/mock-data";
import { LinkedObjectsPanel } from "@/components/linked-objects-panel";

const ACCENT = "#6A618C";
const ACCENT_SOFT = "#F5F4F8";

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" className="shrink-0">
      <rect x="4.5" y="10.5" width="15" height="9.5" rx="2" fill="none" stroke="#9A9A98" strokeWidth="2" />
      <path d="M8 10.5V7.5a4 4 0 018 0v3" fill="none" stroke="#9A9A98" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" className="shrink-0 animate-spin">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeOpacity="0.25" />
      <path d="M21 12a9 9 0 00-9-9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export default function DiagramArtifactPage({
  artifact,
}: {
  artifact: DiagramArtifact;
}) {
  const viewId = useViewId();
  const [spec, setSpec] = useState<DiagramSpec>(artifact.spec);
  const [tab, setTab] = useState<"diagram" | "source">("diagram");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expandable = canExpandDiagram(spec);

  const copyOutline = async () => {
    try {
      await navigator.clipboard.writeText(diagramToOutline(spec));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard unavailable — nothing useful to say here.
    }
  };

  /** Re-render at a new depth, then persist the new spec to the artifact. */
  const changeDetail = async (detail: DiagramDetail) => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/chat/diagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec, detail, source: artifact.description }),
      });
      const data = (await res.json()) as { spec?: DiagramSpec; error?: string };
      if (!res.ok || !data.spec) {
        throw new Error(data.error || "Could not redraw this diagram.");
      }

      const saved = await fetch(
        `/api/${viewId}/artifacts/${encodeURIComponent(artifact.slug)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ spec: data.spec }),
        },
      );
      const savedData = (await saved.json()) as {
        artifact?: DiagramArtifact;
        error?: string;
      };
      if (!saved.ok) {
        throw new Error(savedData.error || "Could not save the new diagram.");
      }

      setSpec(savedData.artifact?.spec ?? data.spec);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const quizHref = `/chat?q=${encodeURIComponent(`Quiz me on ${spec.title.toLowerCase()}`)}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto pt-11 pb-16">
      <div className="flex w-[1180px] flex-col gap-[22px]">
        {/* breadcrumb */}
        <div className="flex items-center gap-2">
          <BreadcrumbBack
            href="/artifacts"
            className="text-sm leading-[18px] text-[#7A7A7A]"
          >
            Artifacts
          </BreadcrumbBack>
          <span className="text-sm leading-[18px] text-[#C4C4C0]">/</span>
          <span className="text-sm leading-[18px] text-[#0A0A0A]">{artifact.title}</span>
        </div>

        {/* title block */}
        <div className="flex flex-col gap-[9px]">
          <div className="flex w-full items-start justify-between gap-6">
            <h1 className="font-display text-[32px] leading-[40px] tracking-[-0.015em] text-[#0A0A0A]">
              {artifact.title}
            </h1>
            <div className="flex shrink-0 items-center gap-2.5">
              <button
                type="button"
                className="flex h-[34px] items-center justify-center rounded-full border border-[#E6E6E6] px-4 text-sm leading-[18px] font-medium text-[#0A0A0A] hover:bg-[#FAFAFA]"
              >
                Share
              </button>
              <button
                type="button"
                aria-label="More options"
                className="flex size-[34px] shrink-0 items-center justify-center rounded-full hover:bg-[#F5F5F3]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" className="shrink-0">
                  <circle cx="12" cy="5" r="1.7" fill="#5E5E5E" />
                  <circle cx="12" cy="12" r="1.7" fill="#5E5E5E" />
                  <circle cx="12" cy="19" r="1.7" fill="#5E5E5E" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="rounded-md px-1.5 py-0.5 text-[11px] leading-3 font-semibold tracking-[0.04em]"
              style={{ background: "#F1EFF7", color: ACCENT }}
            >
              {ARTIFACT_KIND_LABEL[artifact.kind].toUpperCase()}
            </span>
            <span className="text-[13px] leading-4 text-[#C4C4C0]">·</span>
            <span className="text-[13px] leading-4 text-[#9A9A98]">
              Created by {artifact.createdBy}
            </span>
            <span className="text-[13px] leading-4 text-[#C4C4C0]">·</span>
            <span className="text-[13px] leading-4 text-[#9A9A98]">{artifact.updated}</span>
            <span className="text-[13px] leading-4 text-[#C4C4C0]">·</span>
            <LockIcon />
            <span className="text-[13px] leading-4 text-[#9A9A98]">{artifact.visibility}</span>
          </div>
        </div>

        {/* surface */}
        <div className="flex w-full flex-col gap-[18px] rounded-[14px] border border-[#E4E2EC] bg-white px-[30px] pt-[18px] pb-[26px]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-[3px] rounded-full bg-[#F1F1EF] p-[3px]">
              {(["diagram", "source"] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`flex h-7 shrink-0 items-center justify-center rounded-full px-[15px] text-[13px] leading-4 font-medium capitalize transition-colors ${
                    tab === id ? "bg-white text-[#0A0A0A]" : "text-[#7A7A7A]"
                  }`}
                >
                  {id}
                </button>
              ))}
            </div>

            <div className="flex shrink-0 items-center gap-[9px]">
              <button
                type="button"
                onClick={copyOutline}
                className="flex h-8 shrink-0 items-center gap-[7px] rounded-lg border border-[#EAEAE8] px-[13px] text-[12px] leading-4 font-medium text-[#3D3D3D] transition-colors hover:bg-[#FAFAFA]"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" className="shrink-0">
                  <rect x="9" y="3.5" width="11.5" height="11.5" rx="2.2" fill="none" stroke="#5E5E5E" strokeWidth="1.7" />
                  <path
                    d="M15 18.5v1.2a1.8 1.8 0 01-1.8 1.8H5.3a1.8 1.8 0 01-1.8-1.8v-8a1.8 1.8 0 011.8-1.8h1.2"
                    fill="none"
                    stroke="#5E5E5E"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
                {copied ? "Copied" : "Copy outline"}
              </button>

              {artifact.source?.threadId ? (
                <Link
                  href={`/chat?id=${encodeURIComponent(artifact.source.threadId)}`}
                  className="flex h-8 shrink-0 items-center gap-[7px] rounded-lg border border-[#EAEAE8] px-[13px] text-[12px] leading-4 font-medium text-[#3D3D3D] transition-colors hover:bg-[#FAFAFA]"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" className="shrink-0">
                    <path
                      d="M4 11.2C4 7.2 7.6 4 12 4s8 3.2 8 7.2-3.6 7.2-8 7.2c-.9 0-1.8-.1-2.6-.4L5 19.6l1.1-3.1A6.9 6.9 0 014 11.2z"
                      fill="none"
                      stroke="#5E5E5E"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Open the chat
                </Link>
              ) : null}
            </div>
          </div>

          {tab === "diagram" ? (
            <div className={busy ? "opacity-50 transition-opacity" : "transition-opacity"}>
              <DiagramView spec={spec} scale="focus" />
            </div>
          ) : (
            <pre className="overflow-x-auto rounded-[11px] border border-[#F0EFF4] bg-[#FAFAF8] px-5 py-4 font-mono text-[12px] leading-[19px] text-[#3D3D3D]">
              {JSON.stringify(spec, null, 2)}
            </pre>
          )}
        </div>

        {/* provenance + live controls */}
        <div className="flex w-full items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-[9px]">
            <svg width="14" height="14" viewBox="0 0 24 24" className="shrink-0">
              <path
                d="M10 13a5 5 0 007.5.5l2.5-2.5a5 5 0 00-7-7L11.5 5.5M14 11a5 5 0 00-7.5-.5L4 13a5 5 0 007 7l1.5-1.5"
                fill="none"
                stroke="#9A9A98"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
            <span className="shrink-0 text-[13px] leading-[18px] text-[#7A7A7A]">
              {artifact.source?.threadTitle ? "Made in" : describeDiagram(spec)}
            </span>
            {artifact.source?.threadTitle ? (
              <span className="truncate text-[13px] leading-[18px] font-medium text-[#0A0A0A]">
                {artifact.source.threadTitle}
              </span>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => changeDetail(expandable ? 2 : 1)}
              disabled={busy}
              className="flex h-[30px] shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[12px] leading-4 font-medium disabled:opacity-60"
              style={{ background: ACCENT_SOFT, color: ACCENT }}
            >
              {busy ? (
                <span style={{ color: ACCENT }}>
                  <Spinner />
                </span>
              ) : null}
              {busy ? "Redrawing…" : expandable ? "Add a level of detail" : "Make it simpler"}
            </button>
            <Link
              href={quizHref}
              className="flex h-[30px] shrink-0 items-center rounded-full px-3.5 text-[12px] leading-4 font-medium"
              style={{ background: ACCENT_SOFT, color: ACCENT }}
            >
              Quiz me on this
            </Link>
          </div>
        </div>

        {error ? <p className="text-[13px] leading-[18px] text-[#B42318]">{error}</p> : null}

        <LinkedObjectsPanel object={{ kind: "artifact", id: artifact.id }} />
      </div>
    </div>
  );
}
