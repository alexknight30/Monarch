"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useViewId } from "@/components/view-provider";
import {
  STATUS_LABEL,
  subtreeProgress,
  type PlannerIssue,
  type PlannerStatus,
} from "@/lib/planner";

const STATUSES: PlannerStatus[] = ["todo", "in-progress", "backlog", "done"];
const DUE_DATES = ["Aug 9", "Aug 11", "Aug 12", "Aug 21", "Aug 28", "Sep 4"];

type TaskMeta = {
  classes: string[];
  projects: string[];
  assignments: string[];
};

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
    <button
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
      <button
        type="button"
        aria-label="Close menu"
        className="fixed inset-0 z-10 cursor-default"
        onClick={onClose}
      />
      <div className="absolute top-full left-0 z-20 mt-1 min-w-[180px] overflow-hidden rounded-lg border border-[#E8E8E6] bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
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
    <button
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

export default function IssueDetail({ issue, onClose, onOpenIssue }: IssueDetailProps) {
  const titleId = useId();
  const router = useRouter();
  const viewId = useViewId();
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const subtaskRef = useRef<HTMLInputElement>(null);

  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState(issue.title);
  const [description, setDescription] = useState(issue.description ?? "");
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [savingSubtask, setSavingSubtask] = useState(false);
  const [menu, setMenu] = useState<
    null | "status" | "class" | "project" | "assignment" | "due"
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<TaskMeta>({
    classes: [],
    projects: [],
    assignments: [],
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Same view-scoped options as the new-task dialog (no seed catalogs).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/${viewId}/task-meta`);
        const data = (await res.json()) as Partial<TaskMeta>;
        if (!res.ok || cancelled) return;
        setMeta({
          classes: Array.isArray(data.classes) ? data.classes : [],
          projects: Array.isArray(data.projects) ? data.projects : [],
          assignments: Array.isArray(data.assignments) ? data.assignments : [],
        });
      } catch {
        if (!cancelled) {
          setMeta({ classes: [], projects: [], assignments: [] });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [viewId]);

  // Sync when the opened issue changes (e.g. click a subtask).
  useEffect(() => {
    setTitle(issue.title);
    setDescription(issue.description ?? "");
    setAddingSubtask(false);
    setSubtaskTitle("");
    setMenu(null);
    setError(null);
  }, [issue.key, issue.title, issue.description]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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

  const addSubtask = async () => {
    const next = subtaskTitle.trim();
    if (!next || savingSubtask) return;
    setSavingSubtask(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/${viewId}/planner/${encodeURIComponent(issue.key)}/subtasks`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: next }),
        },
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not add subtask.");
        return;
      }
      setSubtaskTitle("");
      setAddingSubtask(false);
      router.refresh();
    } catch {
      setError("Could not reach the local backend.");
    } finally {
      setSavingSubtask(false);
    }
  };

  const children = issue.children ?? [];
  const progress = subtreeProgress(issue);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[8vh] pb-10">
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute inset-0 bg-[#0A0A0A]/35 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[min(820px,84vh)] w-full max-w-[920px] overflow-hidden rounded-xl border border-[#E8E8E6] bg-white shadow-[0_16px_48px_rgba(0,0,0,0.14)]"
      >
        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto px-8 pt-7 pb-8">
          <div className="flex items-start justify-between gap-3">
            <textarea
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
              placeholder="Issue title"
            />
            <button
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

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={saveDescription}
            rows={2}
            className="mt-3 w-full resize-none bg-transparent text-[15px] leading-[22px] text-[#4E4E4C] outline-none placeholder:text-[#B0B0AC]"
            placeholder="Add description…"
          />

          <div className="mt-3 flex items-center gap-1.5 text-[#B0B0AC]">
            <span className="flex h-7 w-7 items-center justify-center rounded-md">
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
            <span className="flex h-7 w-7 items-center justify-center rounded-md">
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

          {/* Sub-issues */}
          <section className="mt-8">
            <div className="flex h-9 items-center gap-2 border-b border-[#EFEFED]">
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
              <h2 className="text-[13px] leading-4 font-medium text-[#0A0A0A]">
                Sub-issues
              </h2>
              {children.length > 0 ? (
                <span className="flex items-center gap-1.5 text-[12.5px] leading-4 text-[#9A9A98] tabular-nums">
                  <ProgressRing done={progress.done} total={progress.total} />
                  {progress.done}/{progress.total}
                </span>
              ) : null}
              <div className="flex-1" />
              <button
                type="button"
                aria-label="Add sub-issue"
                onClick={() => setAddingSubtask(true)}
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

            <ul className="flex flex-col pt-1">
              {children.map((child) => (
                <li key={child.key}>
                  <button
                    type="button"
                    onClick={() => onOpenIssue(child.key)}
                    className="flex w-full items-center gap-2.5 rounded-md px-1 py-2.5 text-left transition-colors hover:bg-[#FBFBFA]"
                  >
                    <StatusIcon status={child.status} />
                    <span
                      className={`min-w-0 flex-1 truncate text-sm leading-[18px] ${
                        child.status === "done"
                          ? "text-[#9A9A98] line-through"
                          : "text-[#0A0A0A]"
                      }`}
                    >
                      {child.title}
                    </span>
                  </button>
                </li>
              ))}

              {addingSubtask ? (
                <li className="flex items-center gap-2.5 px-1 py-2">
                  <StatusIcon status="todo" />
                  <input
                    ref={subtaskRef}
                    value={subtaskTitle}
                    onChange={(e) => setSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void addSubtask();
                      }
                      if (e.key === "Escape") {
                        setAddingSubtask(false);
                        setSubtaskTitle("");
                      }
                    }}
                    onBlur={() => {
                      if (!subtaskTitle.trim()) {
                        setAddingSubtask(false);
                        return;
                      }
                      void addSubtask();
                    }}
                    placeholder="Sub-issue title"
                    disabled={savingSubtask}
                    className="min-w-0 flex-1 bg-transparent text-sm leading-[18px] text-[#0A0A0A] outline-none placeholder:text-[#B0B0AC]"
                  />
                </li>
              ) : null}

              {!addingSubtask && children.length === 0 ? (
                <li className="px-1 py-3 text-[13px] leading-[18px] text-[#9A9A98]">
                  Break this into smaller pieces.
                </li>
              ) : null}
            </ul>
          </section>

          {error ? (
            <p className="mt-4 text-[13px] leading-4 text-[#B42318]">{error}</p>
          ) : null}
        </div>

        {/* Properties — flat list, no section dividers */}
        <aside className="flex w-[240px] shrink-0 flex-col overflow-y-auto border-l border-[#EFEFED] bg-[#FCFCFB] px-4 pt-7 pb-8">
          <div className="flex flex-col gap-0.5">
            <div className="relative">
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

            <div className="relative">
              <PropButton
                active={menu === "class"}
                onClick={() => setMenu(menu === "class" ? null : "class")}
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
                {issue.course ?? <span className="text-[#9A9A98]">Class</span>}
              </PropButton>
              <Menu open={menu === "class"} onClose={() => setMenu(null)}>
                <MenuItem
                  active={!issue.course}
                  onClick={() => {
                    setMenu(null);
                    void patch({ course: null });
                  }}
                >
                  No class
                </MenuItem>
                {meta.classes.length === 0 ? (
                  <div className="px-3 py-2 text-[13px] leading-4 text-[#9A9A98]">
                    No classes yet
                  </div>
                ) : (
                  meta.classes.map((c) => (
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

            <div className="relative">
              <PropButton
                active={menu === "project"}
                onClick={() => setMenu(menu === "project" ? null : "project")}
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
                {issue.project ?? <span className="text-[#9A9A98]">Project</span>}
              </PropButton>
              <Menu open={menu === "project"} onClose={() => setMenu(null)}>
                <MenuItem
                  active={!issue.project}
                  onClick={() => {
                    setMenu(null);
                    void patch({ project: null });
                  }}
                >
                  No project
                </MenuItem>
                {meta.projects.length === 0 ? (
                  <div className="px-3 py-2 text-[13px] leading-4 text-[#9A9A98]">
                    No projects yet
                  </div>
                ) : (
                  meta.projects.map((p) => (
                    <MenuItem
                      key={p}
                      active={issue.project === p}
                      onClick={() => {
                        setMenu(null);
                        void patch({ project: p });
                      }}
                    >
                      {p}
                    </MenuItem>
                  ))
                )}
              </Menu>
            </div>

            <div className="relative">
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
                  <span className="text-[#9A9A98]">Assignment</span>
                )}
              </PropButton>
              <Menu open={menu === "assignment"} onClose={() => setMenu(null)}>
                <MenuItem
                  active={!issue.assignment}
                  onClick={() => {
                    setMenu(null);
                    void patch({ assignment: null });
                  }}
                >
                  No assignment
                </MenuItem>
                {meta.assignments.length === 0 ? (
                  <div className="px-3 py-2 text-[13px] leading-4 text-[#9A9A98]">
                    No assignments yet
                  </div>
                ) : (
                  meta.assignments.map((a) => (
                    <MenuItem
                      key={a}
                      active={issue.assignment === a}
                      onClick={() => {
                        setMenu(null);
                        void patch({ assignment: a });
                      }}
                    >
                      {a}
                    </MenuItem>
                  ))
                )}
              </Menu>
            </div>

            <div className="relative">
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
                {issue.due ?? <span className="text-[#9A9A98]">Due date</span>}
              </PropButton>
              <Menu open={menu === "due"} onClose={() => setMenu(null)}>
                <MenuItem
                  active={!issue.due}
                  onClick={() => {
                    setMenu(null);
                    void patch({ due: null });
                  }}
                >
                  No due date
                </MenuItem>
                {DUE_DATES.map((d) => (
                  <MenuItem
                    key={d}
                    active={issue.due === d}
                    onClick={() => {
                      setMenu(null);
                      void patch({ due: d });
                    }}
                  >
                    {d}
                  </MenuItem>
                ))}
              </Menu>
            </div>
          </div>
        </aside>
      </div>
    </div>,
    document.body,
  );
}
