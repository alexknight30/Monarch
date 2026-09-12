"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useViewId } from "@/components/view-provider";
import { TagChips } from "@/components/ui/tag-chips";
import { ARTIFACT_KIND_LABEL } from "@/lib/mock-data";
import type { LinkableKind, ObjectRef, ObjectSummary } from "@/lib/objects/types";

type Neighbor = {
  linkId: string;
  summary: ObjectSummary;
};

function hrefFor(summary: ObjectSummary) {
  if (summary.kind === "artifact") return `/artifacts/${summary.slug || summary.id}`;
  if (summary.kind === "task") return `/planner`;
  return `/calendar`;
}

function kindLabel(summary: ObjectSummary) {
  if (summary.kind === "artifact") {
    const kind = summary.artifactKind;
    if (kind && kind in ARTIFACT_KIND_LABEL) {
      return ARTIFACT_KIND_LABEL[kind as keyof typeof ARTIFACT_KIND_LABEL];
    }
    return "Artifact";
  }
  if (summary.kind === "task") return "Task";
  return "Event";
}

export function LinkedObjectsPanel({
  object,
}: {
  object: ObjectRef;
}) {
  const viewId = useViewId();
  const [neighbors, setNeighbors] = useState<Neighbor[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ObjectSummary[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/${viewId}/links?kind=${object.kind}&id=${encodeURIComponent(object.id)}`,
    );
    const data = (await res.json()) as { neighbors?: Neighbor[]; error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not load links.");
      return;
    }
    setNeighbors(data.neighbors ?? []);
    setError(null);
  }, [viewId, object.kind, object.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    const timer = window.setTimeout(async () => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      const res = await fetch(`/api/${viewId}/objects?${params.toString()}`);
      const data = (await res.json()) as { objects?: ObjectSummary[] };
      const exclude = new Set([
        `${object.kind}:${object.id}`,
        ...neighbors.map((item) => `${item.summary.kind}:${item.summary.id}`),
      ]);
      setResults(
        (data.objects ?? []).filter(
          (item) => !exclude.has(`${item.kind}:${item.id}`),
        ),
      );
    }, 180);
    return () => window.clearTimeout(timer);
  }, [open, query, viewId, object.kind, object.id, neighbors]);

  const add = async (target: ObjectRef) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/${viewId}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ a: object, b: target }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Could not link.");
      }
      setQuery("");
      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not link.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (linkId: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/${viewId}/links`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: linkId }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Could not unlink.");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not unlink.");
    } finally {
      setBusy(false);
    }
  };

  const empty = useMemo(() => neighbors.length === 0, [neighbors.length]);

  return (
    <section className="rounded-[14px] border border-[#E6E6E6] bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium leading-[18px] text-[#0A0A0A]">
          Linked
        </h2>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="h-7 rounded-full border border-[#E6E6E6] px-3 text-[12px] font-medium text-[#0A0A0A] hover:bg-[#FAFAFA]"
        >
          {open ? "Close" : "Add"}
        </button>
      </div>
      {error ? (
        <p className="pt-2 text-[12px] leading-4 text-[#B42318]">{error}</p>
      ) : null}
      {open ? (
        <div className="pt-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search artifacts, tasks, events"
            className="h-9 w-full rounded-md border border-[#E6E6E6] px-3 text-[13px] text-[#0A0A0A] outline-none focus:border-[#C8C8C4]"
          />
          <div className="mt-2 max-h-44 overflow-y-auto">
            {results.length === 0 ? (
              <p className="px-1 py-2 text-[12px] text-[#9A9A98]">No matches.</p>
            ) : (
              results.slice(0, 12).map((item) => (
                <button
                  key={`${item.kind}:${item.id}`}
                  type="button"
                  disabled={busy}
                  onClick={() => add({ kind: item.kind as LinkableKind, id: item.id })}
                  className="flex w-full items-start justify-between gap-2 rounded-md px-2 py-1.5 text-left hover:bg-[#F7F7F5]"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] text-[#0A0A0A]">
                      {item.title}
                    </span>
                    <span className="block text-[11px] text-[#9A9A98]">
                      {kindLabel(item)}
                      {item.courseLabel ? ` · ${item.courseLabel}` : ""}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
      <div className="pt-3">
        {empty ? (
          <p className="text-[13px] leading-[18px] text-[#9A9A98]">
            Nothing linked yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {neighbors.map((item) => (
              <li
                key={item.linkId}
                className="flex items-start justify-between gap-2"
              >
                <Link href={hrefFor(item.summary)} className="min-w-0">
                  <span className="block truncate text-[13px] leading-[18px] text-[#0A0A0A]">
                    {item.summary.title}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#9A9A98]">
                    {kindLabel(item.summary)}
                    {item.summary.courseLabel
                      ? ` · ${item.summary.courseLabel}`
                      : ""}
                    <TagChips tagIds={item.summary.tagIds} />
                  </span>
                </Link>
                <button
                  type="button"
                  aria-label="Remove link"
                  disabled={busy}
                  onClick={() => remove(item.linkId)}
                  className="mt-0.5 shrink-0 text-[12px] text-[#9A9A98] hover:text-[#0A0A0A]"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
