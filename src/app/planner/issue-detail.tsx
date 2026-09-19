"use client";
import { DesignCopy } from "@/components/design/runtime";


import {
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useViewId } from "@/components/view-provider";
import { TaskTagEditor } from "@/components/ui/object-tag-picker";
import { LinkedObjectsPanel } from "@/components/linked-objects-panel";
import { useHydrated } from "@/lib/use-hydrated";
import {
  STATUS_LABEL,
  subtreeProgress,
  type PlannerIssue,
  type PlannerStatus,
} from "@/lib/planner";

const STATUSES: PlannerStatus[] = ["todo", "in-progress", "backlog", "done"];

import type { TaskMeta } from "@/lib/task-meta";

type IssueDetailProps = {
  issue: PlannerIssue;
  onClose: () => void;
  onOpenIssue: (key: string) => void;
};

function StatusIcon({ status, size = 14 }: { status: PlannerStatus; size?: number }) {
  if (status === "done") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" className="shrink-0">
        <circle cx="8" cy="8" r="6.5" fill="#0A0A0A" />
        <path
          d="M5.2 8.2l2 2 3.6-4"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (status === "in-progress") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" className="shrink-0">
        <circle cx="8" cy="8" r="6.5" fill="none" stroke="#0A0A0A" strokeWidth="1.5" />
        <path d="M8 8V1.5A6.5 6.5 0 0 1 8 14.5z" fill="#0A0A0A" />
      </svg>
    );
  }
  if (status === "backlog") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" className="shrink-0">
        <circle
          cx="8"
          cy="8"
          r="6.5"
          fill="none"
          stroke="#B4B4B0"
          strokeWidth="1.5"
          strokeDasharray="2.2 2.2"
        />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className="shrink-0">
      <circle cx="8" cy="8" r="6.5" fill="none" stroke="#9A9A98" strokeWidth="1.5" />
    </svg>
  );
}

function ProgressRing({ done, total }: { done: number; total: number }) {
  const r = 5.5;
  const c = 2 * Math.PI * r;
  const pct = total === 0 ? 0 : done / total;
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" className="shrink-0">
      <circle cx="8" cy="8" r={r} fill="none" stroke="#E8E8E6" strokeWidth="1.6" />
      <circle
        cx="8"
        cy="8"
        r={r}
        fill="none"
        stroke="#0A0A0A"
        strokeWidth="1.6"
        strokeDasharray={`${c * pct} ${c}`}
        strokeLinecap="round"
        transform="rotate(-90 8 8)"
      />
    </svg>
  );
}

function PropButton({
  children,
  onClick,
  active = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button data-design-id="m-a6d775cdf9b5"
      type="button"
      onClick={onClick}
      className={`flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] leading-4 transition-colors ${
        active
          ? "bg-[#F1F1EF] text-[#0A0A0A]"
          : "text-[#0A0A0A] hover:bg-[#F7F7F5]"
      }`}
    >
      {children}
    </button>
  );
}

function Menu({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <>
      <button data-design-id="m-93a8eb65e23a"
        type="button"
        aria-label="Close menu"
        className="fixed inset-0 z-10 cursor-default"
        onClick={onClose}
      />
      <div data-design-id="m-756cf0b13b4a" className="absolute top-full left-0 z-20 mt-1 min-w-[180px] overflow-hidden rounded-lg border border-[#E8E8E6] bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
        {children}
      </div>
    </>
  );
}

function MenuItem({
  children,
  active,
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button data-design-id="m-bf318dda5338"
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] leading-4 transition-colors ${
        active ? "bg-[#F5F5F3] text-[#0A0A0A]" : "text-[#0A0A0A] hover:bg-[#F7F7F5]"
      }`}
    >
      {children}
    </button>
  );
}

export default function IssueDetail(props:IssueDetailProps) {
  return <IssueDetailContent key={props.issue.key} {...props}/>;
}
function IssueDetailContent({ issue, onClose, onOpenIssue }: IssueDetailProps) {
  const titleId = useId();
  const router = useRouter();
  const viewId = useViewId();
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const subtaskRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const mounted=useHydrated();
  const [title, setTitle] = useState(issue.title);
  const [description, setDescription] = useState(issue.description ?? "");
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [subtaskDescription, setSubtaskDescription] = useState("");
  const [savingSubtask, setSavingSubtask] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [menu, setMenu] = useState<
    null | "status" | "course" | "artifact" | "assignment" | "due"
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<TaskMeta>({
    courses: [],
    artifacts: [],
    assignments: [],
  });

  // Same view-scoped options as the new-task dialog (no seed catalogs).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/${viewId}/task-meta`);
        const data = (await res.json()) as Partial<TaskMeta>;
        if (!res.ok || cancelled) return;
        setMeta({
          courses: Array.isArray(data.courses) ? data.courses : [],
          artifacts: Array.isArray(data.artifacts) ? data.artifacts : [],
          assignments: Array.isArray(data.assignments) ? data.assignments : [],
        });
      } catch {
        if (!cancelled) {
          setMeta({ courses: [], artifacts: [], assignments: [] });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [viewId]);

  // Refresh clean fields without erasing a local draft during another task update.
  const [received,setReceived]=useState({title:issue.title,description:issue.description??""});
  if(received.title!==issue.title||received.description!==(issue.description??"")){
    if(title===received.title)setTitle(issue.title);
    if(description===received.description)setDescription(issue.description??"");
    setReceived({title:issue.title,description:issue.description??""});
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (addingSubtask) {
        setAddingSubtask(false);
        setSubtaskTitle("");
        setSubtaskDescription("");
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, addingSubtask]);

  useEffect(() => {
    if (!addingSubtask) return;
    const t = window.setTimeout(() => subtaskRef.current?.focus(), 20);
    return () => window.clearTimeout(t);
  }, [addingSubtask]);

  const patch = async (body: Record<string, unknown>) => {
    setError(null);
    const res = await fetch(`/api/${viewId}/planner/${encodeURIComponent(issue.key)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not save.");
      return false;
    }
    router.refresh();
    return true;
  };

  const saveTitle = async () => {
    const next = title.trim();
    if (!next || next === issue.title) {
      setTitle(issue.title);
      return;
    }
    await patch({ title: next });
  };

  const saveDescription = async () => {
    const next = description.trim();
    const prev = issue.description ?? "";
    if (next === prev) return;
    await patch({ description: next || null });
  };

  const addSubtask = async (opts?: { keepOpen?: boolean }) => {
    const next = subtaskTitle.trim();
    if (!next || savingSubtask) return false;
    const keepOpen = opts?.keepOpen ?? true;
    setSavingSubtask(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/${viewId}/planner/${encodeURIComponent(issue.key)}/subtasks`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: next,
            description: subtaskDescription.trim() || undefined,
          }),
        },
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not add subtask.");
        return false;
      }
      setSubtaskTitle("");
      setSubtaskDescription("");
      setAddingSubtask(keepOpen);
      router.refresh();
      if (keepOpen) {
        window.setTimeout(() => subtaskRef.current?.focus(), 30);
      }
      return true;
    } catch {
      setError("Could not reach the local backend.");
      return false;
    } finally {
      setSavingSubtask(false);
    }
  };

  const openSubtaskComposer = () => {
    if (addingSubtask) {
      if (subtaskTitle.trim()) {
        void addSubtask({ keepOpen: true });
        return;
      }
      subtaskRef.current?.focus();
      return;
    }
    setAddingSubtask(true);
  };

  const onDragHandlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: dragOffset.x,
      originY: dragOffset.y,
    };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onDragHandlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    setDragOffset({
      x: drag.originX + (e.clientX - drag.startX),
      y: drag.originY + (e.clientY - drag.startY),
    });
  };

  const onDragHandlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // already released
    }
  };

  const children = issue.children ?? [];
  const progress = subtreeProgress(issue);

  if (!mounted) return null;

  return createPortal(
    <div data-design-id="m-d28df6c0e2cc" className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[8vh] pb-10">
      <button data-design-id="m-9eccb4a312d9"
        type="button"
        aria-label="Dismiss"
        className="absolute inset-0 bg-[#0A0A0A]/35 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <div data-design-id="m-085da175e251"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)` }}
        className={`relative z-10 flex max-h-[min(820px,84vh)] w-full max-w-[920px] flex-col overflow-hidden rounded-xl border border-[#E8E8E6] bg-white shadow-[0_16px_48px_rgba(0,0,0,0.14)] ${
          dragging ? "select-none" : ""
        }`}
      >
        {/* Drag handle — top white strip across the card */}
        <div data-design-id="m-90ff7d7f2fe9"
          role="separator"
          aria-label="Drag to move"
          onPointerDown={onDragHandlePointerDown}
          onPointerMove={onDragHandlePointerMove}
          onPointerUp={onDragHandlePointerUp}
          onPointerCancel={onDragHandlePointerUp}
          className={`h-7 shrink-0 touch-none ${
            dragging ? "cursor-grabbing" : "cursor-grab"
          }`}
        />

        <div data-design-id="m-9f6f8f9a39f1" className="flex min-h-0 flex-1 overflow-hidden">
        {/* Main */}
        <div data-design-id="m-e4522b1cfe4d" className="flex min-w-0 flex-1 flex-col overflow-y-auto px-8 pt-1 pb-8">
          <div data-design-id="m-dfd6002e51f6" className="flex items-start justify-between gap-3">
            <textarea data-design-id="m-49e19983a1da"
              id={titleId}
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
              }}
              rows={1}
              className="min-w-0 flex-1 resize-none bg-transparent text-[26px] leading-[34px] font-semibold tracking-[-0.02em] text-[#0A0A0A] outline-none placeholder:text-[#C4C4C0]"
              placeholder="Task title"
            />
            <button data-design-id="m-5e9a1425c85c"
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#8A8A8A] transition-colors hover:bg-[#F5F5F3] hover:text-[#0A0A0A]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <textarea data-design-id="m-f41dc0d6ae90"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={saveDescription}
            rows={2}
            className="mt-3 w-full resize-none bg-transparent text-[15px] leading-[22px] text-[#4E4E4C] outline-none placeholder:text-[#B0B0AC]"
            placeholder="Add description…"
          />

          <div data-design-id="m-a809bf4ee8f2" className="mt-3 flex items-center gap-1.5 text-[#B0B0AC]">
            <span data-design-id="m-22c0732f033f" className="flex h-7 w-7 items-center justify-center rounded-md">
              <svg width="15" height="15" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <circle cx="9" cy="10" r="1" fill="currentColor" />
                <circle cx="15" cy="10" r="1" fill="currentColor" />
                <path
                  d="M8.5 14.5c1 1.2 2.2 1.8 3.5 1.8s2.5-.6 3.5-1.8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span data-design-id="m-f69d9837550d" className="flex h-7 w-7 items-center justify-center rounded-md">
              <svg width="15" height="15" viewBox="0 0 24 24">
                <path
                  d="M8.5 12.5l6.2-6.2a3 3 0 1 1 4.2 4.2l-7.8 7.8a4.5 4.5 0 0 1-6.4-6.4l7.5-7.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>

          {/* Sub-tasks */}
          <section data-design-id="m-9b79c183d156" className="mt-8">
            <div data-design-id="m-4f29dbadb5f4" className="flex h-9 items-center gap-2 border-b border-[#EFEFED]">
              <svg width="12" height="12" viewBox="0 0 24 24" className="shrink-0">
                <path
                  d="M6 9.5l6 6 6-6"
                  fill="none"
                  stroke="#8A8A8A"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <h2 data-design-id="m-32e2cd45c722" className="text-[13px] leading-4 font-medium text-[#0A0A0A]"><DesignCopy id="m-32e2cd45c722">
                Sub-tasks
              </DesignCopy></h2>
              {children.length > 0 ? (
                <span data-design-id="m-82592ed183ea" className="flex items-center gap-1.5 text-[12.5px] leading-4 text-[#9A9A98] tabular-nums">
                  <ProgressRing done={progress.done} total={progress.total} />
                  {progress.done}/{progress.total}
                </span>
              ) : null}
              <div data-design-id="m-aba2f4d10436" className="flex-1" />
              <button data-design-id="m-8632f91a471b"
                type="button"
                aria-label="Add sub-task"
                // Prevent stealing focus / blur-saving the open composer.
                onMouseDown={(e) => e.preventDefault()}
                onClick={openSubtaskComposer}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-[#E6E6E6] text-[#5E5E5E] transition-colors hover:bg-[#FAFAFA]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24">
                  <path
                    d="M12 5v14M5 12h14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <ul data-design-id="m-578846b34319" className="flex flex-col pt-1">
              {children.map((child) => (
                <li data-design-id="m-8183d59e765e" data-design-key={child.key} key={child.key}>
                  <button data-design-id="m-ac499823701f"
                    type="button"
                    onClick={() => onOpenIssue(child.key)}
                    className="flex w-full items-start gap-2.5 rounded-md px-1 py-2.5 text-left transition-colors hover:bg-[#FBFBFA]"
                  >
                    <span data-design-id="m-dbe3c3109aba" className="mt-0.5 shrink-0">
                      <StatusIcon status={child.status} />
                    </span>
                    <span data-design-id="m-601e212004d3" className="min-w-0 flex-1">
                      <span data-design-id="m-bc80bf4f7808"
                        className={`block truncate text-sm leading-[18px] ${
                          child.status === "done"
                            ? "text-[#9A9A98] line-through"
                            : "text-[#0A0A0A]"
                        }`}
                      >
                        {child.title}
                      </span>
                      {child.description ? (
                        <span data-design-id="m-46ee50c92146" className="mt-0.5 block truncate text-[13px] leading-[18px] text-[#9A9A98]">
                          {child.description}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}

              {addingSubtask ? (
                <li data-design-id="m-8b8636637895" className="flex items-start gap-2.5 px-1 py-2">
                  <span data-design-id="m-035e78f0c5c8" className="mt-0.5 shrink-0">
                    <StatusIcon status="todo" />
                  </span>
                  <div data-design-id="m-9bdb98eabc85" className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <input data-design-id="m-b4532d490274"
                      ref={subtaskRef}
                      value={subtaskTitle}
                      onChange={(e) => setSubtaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void addSubtask({ keepOpen: true });
                        }
                        if (e.key === "Escape") {
                          e.stopPropagation();
                          setAddingSubtask(false);
                          setSubtaskTitle("");
                          setSubtaskDescription("");
                        }
                      }}
                      onBlur={(e) => {
                        const next = e.relatedTarget as Node | null;
                        if (next && e.currentTarget.parentElement?.contains(next)) {
                          return;
                        }
                        if (!subtaskTitle.trim() && !subtaskDescription.trim()) {
                          setAddingSubtask(false);
                          return;
                        }
                        if (subtaskTitle.trim()) {
                          void addSubtask({ keepOpen: true });
                        }
                      }}
                      placeholder="Task title"
                      disabled={savingSubtask}
                      className="w-full bg-transparent text-sm leading-[18px] text-[#0A0A0A] outline-none placeholder:text-[#B0B0AC]"
                    />
                    <textarea data-design-id="m-d55dbc60d257"
                      value={subtaskDescription}
                      onChange={(e) => setSubtaskDescription(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void addSubtask({ keepOpen: true });
                        }
                        if (e.key === "Escape") {
                          e.stopPropagation();
                          setAddingSubtask(false);
                          setSubtaskTitle("");
                          setSubtaskDescription("");
                        }
                      }}
                      onBlur={(e) => {
                        const next = e.relatedTarget as Node | null;
                        if (next && e.currentTarget.parentElement?.contains(next)) {
                          return;
                        }
                        if (!subtaskTitle.trim() && !subtaskDescription.trim()) {
                          setAddingSubtask(false);
                        }
                      }}
                      rows={1}
                      placeholder="Add description..."
                      disabled={savingSubtask}
                      className="w-full resize-none bg-transparent text-[13px] leading-[18px] text-[#5E5E5E] outline-none placeholder:text-[#B0B0AC]"
                    />
                  </div>
                </li>
              ) : null}

              {!addingSubtask && children.length === 0 ? (
                <li data-design-id="m-97b62e283ec6" className="px-1 py-3 text-[13px] leading-[18px] text-[#9A9A98]"><DesignCopy id="m-97b62e283ec6">
                  Break this into smaller pieces.
                </DesignCopy></li>
              ) : null}
            </ul>
          </section>

          {error ? (
            <p data-design-id="m-f7f051d360cb" className="mt-4 text-[13px] leading-4 text-[#B42318]">{error}</p>
          ) : null}
        </div>

        {/* Properties — flat list, no section dividers */}
        <aside data-design-id="m-66bd379eb368" className="flex w-[240px] shrink-0 flex-col overflow-y-auto border-l border-[#EFEFED] bg-[#FCFCFB] px-4 pt-1 pb-8">
          <div data-design-id="m-0d31ee592c5b" className="flex flex-col gap-0.5">
            <div data-design-id="m-8787a42ad59c" className="relative">
              <PropButton
                active={menu === "status"}
                onClick={() => setMenu(menu === "status" ? null : "status")}
              >
                <StatusIcon status={issue.status} />
                {STATUS_LABEL[issue.status]}
              </PropButton>
              <Menu open={menu === "status"} onClose={() => setMenu(null)}>
                {STATUSES.map((s) => (
                  <MenuItem
                    key={s}
                    active={issue.status === s}
                    onClick={() => {
                      setMenu(null);
                      void patch({ status: s });
                    }}
                  >
                    <StatusIcon status={s} />
                    {STATUS_LABEL[s]}
                  </MenuItem>
                ))}
              </Menu>
            </div>

            <div data-design-id="m-0cc80db03301" className="relative">
              <PropButton
                active={menu === "course"}
                onClick={() => setMenu(menu === "course" ? null : "course")}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" className="shrink-0">
                  <path
                    d="M4 7.5l8-3.5 8 3.5-8 3.5-8-3.5z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M7 10.5v4.2c0 1.5 2.2 2.8 5 2.8s5-1.3 5-2.8v-4.2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
                {issue.course ?? <span data-design-id="m-90799037b4c9" className="text-[#9A9A98]"><DesignCopy id="m-90799037b4c9">Course</DesignCopy></span>}
              </PropButton>
              <Menu open={menu === "course"} onClose={() => setMenu(null)}>
                <MenuItem
                  active={!issue.course}
                  onClick={() => {
                    setMenu(null);
                    void patch({ course: null });
                  }}
                >
                  No course
                </MenuItem>
                {meta.courses.length === 0 ? (
                  <div data-design-id="m-5f79208b1861" className="px-3 py-2 text-[13px] leading-4 text-[#9A9A98]"><DesignCopy id="m-5f79208b1861">
                    No courses yet
                  </DesignCopy></div>
                ) : (
                  meta.courses.map((c) => (
                    <MenuItem
                      key={c}
                      active={issue.course === c}
                      onClick={() => {
                        setMenu(null);
                        void patch({ course: c });
                      }}
                    >
                      {c}
                    </MenuItem>
                  ))
                )}
              </Menu>
            </div>

            <div data-design-id="m-66fb901db0db" className="relative">
              <PropButton
                active={menu === "artifact"}
                onClick={() => setMenu(menu === "artifact" ? null : "artifact")}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" className="shrink-0">
                  <rect
                    x="3"
                    y="4.5"
                    width="18"
                    height="4.5"
                    rx="1.4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />
                  <path
                    d="M5.2 9v9.4a1.8 1.8 0 0 0 1.8 1.8h10a1.8 1.8 0 0 0 1.8-1.8V9"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />
                </svg>
                {issue.artifact ?? <span data-design-id="m-2736b4e813b6" className="text-[#9A9A98]"><DesignCopy id="m-2736b4e813b6">Artifact</DesignCopy></span>}
              </PropButton>
              <Menu open={menu === "artifact"} onClose={() => setMenu(null)}>
                <MenuItem
                  active={!issue.artifact}
                  onClick={() => {
                    setMenu(null);
                    void patch({ artifactId: null });
                  }}
                >
                  No artifact
                </MenuItem>
                {meta.artifacts.length === 0 ? (
                  <div data-design-id="m-167e26f2e8b4" className="px-3 py-2 text-[13px] leading-4 text-[#9A9A98]"><DesignCopy id="m-167e26f2e8b4">
                    No artifacts yet
                  </DesignCopy></div>
                ) : (
                  meta.artifacts.map((p) => (
                    <MenuItem
                      key={p.id}
                      active={issue.artifactId === p.id}
                      onClick={() => {
                        setMenu(null);
                        void patch({ artifactId: p.id });
                      }}
                    >
                      {p.title} · {p.course}
                    </MenuItem>
                  ))
                )}
              </Menu>
            </div>

            <div data-design-id="m-c5d1209dc0d6" className="relative">
              <PropButton
                active={menu === "assignment"}
                onClick={() => setMenu(menu === "assignment" ? null : "assignment")}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" className="shrink-0">
                  <path
                    d="M5.5 3h9L19 7.5V21H5.5z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M14 3v5h5M9 13h6M9 16.5h4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
                {issue.assignment ?? (
                  <span data-design-id="m-f7bb6d3913b3" className="text-[#9A9A98]"><DesignCopy id="m-f7bb6d3913b3">Assignment</DesignCopy></span>
                )}
              </PropButton>
              <Menu open={menu === "assignment"} onClose={() => setMenu(null)}>
                <MenuItem
                  active={!issue.assignment}
                  onClick={() => {
                    setMenu(null);
                    void patch({ assignmentId: null });
                  }}
                >
                  No assignment
                </MenuItem>
                {meta.assignments.length === 0 ? (
                  <div data-design-id="m-2cbda73018c3" className="px-3 py-2 text-[13px] leading-4 text-[#9A9A98]"><DesignCopy id="m-2cbda73018c3">
                    No assignments yet
                  </DesignCopy></div>
                ) : (
                  meta.assignments.map((a) => (
                    <MenuItem
                      key={a.id}
                      active={issue.assignmentId === a.id}
                      onClick={() => {
                        setMenu(null);
                        void patch({ assignmentId:a.id,courseId:a.courseId,dueAt:a.dueAt||null });
                      }}
                    >
                      {a.title} · {a.course}
                    </MenuItem>
                  ))
                )}
              </Menu>
            </div>

            <div data-design-id="m-27d8a8b185a9" className="relative">
              <PropButton
                active={menu === "due"}
                onClick={() => setMenu(menu === "due" ? null : "due")}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" className="shrink-0">
                  <rect
                    x="4"
                    y="5"
                    width="16"
                    height="15"
                    rx="2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />
                  <path
                    d="M8 3v4M16 3v4M4 10h16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
                {issue.due ?? <span data-design-id="m-7e583dcff0e7" className="text-[#9A9A98]"><DesignCopy id="m-7e583dcff0e7">Due date</DesignCopy></span>}
              </PropButton>
              <Menu open={menu === "due"} onClose={() => setMenu(null)}>
                <MenuItem
                  active={!issue.due}
                  onClick={() => {
                    setMenu(null);
                    void patch({ dueAt: null });
                  }}
                >
                  No due date
                </MenuItem>
                <form data-design-id="m-7faa2b083b60" className="grid gap-2 p-2" onSubmit={(event) => {
                  event.preventDefault();
                  const values = new FormData(event.currentTarget);
                  const day = String(values.get("day") || "");
                  const time = String(values.get("time") || "");
                  setMenu(null);
                  void patch({ dueAt: day ? day + (time ? `T${time}` : "") : null });
                }}>
                  <label data-design-id="m-2407fe802f00" className="grid gap-1 text-xs">Date<input data-design-id="m-811e6b4a14c5" name="day" aria-label="Task due date" type="date" required defaultValue={issue.dueAt?.slice(0,10) || ""} className="rounded border p-2" /></label>
                  <label data-design-id="m-60597ed1a648" className="grid gap-1 text-xs">Time (optional)<input data-design-id="m-e9055e56b032" name="time" aria-label="Task due time" type="time" defaultValue={issue.dueAt?.includes("T") ? issue.dueAt.slice(11,16) : ""} className="rounded border p-2" /></label>
                  <button data-design-id="m-340cebc73047" type="submit" className="rounded bg-[#1F1E1C] p-2 text-xs text-white"><DesignCopy id="m-340cebc73047">Set due date</DesignCopy></button>
                </form>
              </Menu>
            </div>
          </div>
          <TaskTagEditor key={issue.key+JSON.stringify(issue.tagIds)} value={issue.tagIds||[]} onSave={tagIds=>patch({tagIds})}/>
          <div data-design-id="m-8fe73bf27923" className="mt-5 border-t border-stone-200 pt-4"><LinkedObjectsPanel object={{kind:"task",id:issue.id||issue.key}}/></div>
        </aside>
        </div>
      </div>
    </div>,
    document.body,
  );
}
