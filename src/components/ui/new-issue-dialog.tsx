"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useViewId } from "@/components/view-provider";
import { STATUS_LABEL, type PlannerStatus } from "@/lib/planner";

type NewIssueDialogProps = {
  open: boolean;
  onClose: () => void;
};

const STATUSES: PlannerStatus[] = ["todo", "in-progress", "backlog", "done"];
const DUE_DATES = ["Aug 9", "Aug 11", "Aug 12", "Aug 21", "Aug 28", "Sep 4"];

type TaskMeta = {
  courses: string[];
  artifacts: string[];
  assignments: string[];
};

const MetaChip = ({
  children,
  onClick,
  active = false,
  ref,
}: {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
}) => {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className={`flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[13px] leading-4 transition-colors ${
        active
          ? "border-[#0A0A0A] bg-[#F5F5F5] text-[#0A0A0A]"
          : "border-[#E6E6E6] bg-white text-[#5E5E5E] hover:bg-[#FAFAFA]"
      }`}
    >
      {children}
    </button>
  );
};

function StatusDot({ status }: { status: PlannerStatus }) {
  if (status === "done") {
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" className="shrink-0">
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
      <svg width="14" height="14" viewBox="0 0 16 16" className="shrink-0">
        <circle cx="8" cy="8" r="6.5" fill="none" stroke="#0A0A0A" strokeWidth="1.5" />
        <path d="M8 8V1.5A6.5 6.5 0 0 1 8 14.5z" fill="#0A0A0A" />
      </svg>
    );
  }
  if (status === "backlog") {
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" className="shrink-0">
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
    <svg width="14" height="14" viewBox="0 0 16 16" className="shrink-0">
      <circle cx="8" cy="8" r="6.5" fill="none" stroke="#9A9A98" strokeWidth="1.5" />
    </svg>
  );
}

function Menu({
  open,
  anchorRef,
  onClose,
  children,
}: {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) {
      setPos(null);
      return;
    }

    const place = () => {
      const anchor = anchorRef.current;
      const menu = menuRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const menuHeight = menu?.offsetHeight ?? 200;
      const gap = 6;
      const spaceBelow = window.innerHeight - rect.bottom - gap;
      const openUp = spaceBelow < menuHeight && rect.top > spaceBelow;
      const top = openUp
        ? Math.max(8, rect.top - gap - menuHeight)
        : rect.bottom + gap;
      const left = Math.min(
        Math.max(8, rect.left),
        window.innerWidth - 196,
      );
      setPos({ top, left });
    };

    place();
    // Re-measure after paint once we know the real menu height.
    const raf = window.requestAnimationFrame(place);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchorRef]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Close menu"
        className="fixed inset-0 z-[60] cursor-default"
        onClick={onClose}
      />
      <div
        ref={menuRef}
        className="fixed z-[70] min-w-[180px] overflow-hidden rounded-lg border border-[#E6E6E6] bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
        style={{
          top: pos?.top ?? -9999,
          left: pos?.left ?? -9999,
          visibility: pos ? "visible" : "hidden",
        }}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}

function ChipMenu({
  open,
  onToggle,
  onClose,
  active,
  label,
  icon,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  active?: boolean;
  label: ReactNode;
  icon: ReactNode;
  children: ReactNode;
}) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  return (
    <div className="relative">
      <MetaChip
        ref={anchorRef}
        active={active}
        onClick={onToggle}
      >
        {icon}
        {label}
      </MetaChip>
      <Menu open={open} anchorRef={anchorRef} onClose={onClose}>
        {children}
      </Menu>
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  active,
}: {
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] leading-4 transition-colors ${
        active
          ? "bg-[#F5F5F5] text-[#0A0A0A]"
          : "text-[#3D3D3D] hover:bg-[#FAFAFA]"
      }`}
    >
      {children}
    </button>
  );
}

export function NewIssueDialog({ open, onClose }: NewIssueDialogProps) {
  const titleId = useId();
  const titleRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const viewId = useViewId();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<PlannerStatus>("todo");
  const [course, setCourse] = useState<string | null>(null);
  const [artifact, setArtifact] = useState<string | null>(null);
  const [assignment, setAssignment] = useState<string | null>(null);
  const [due, setDue] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState<
    null | "status" | "course" | "artifact" | "assignment" | "due"
  >(null);
  const [meta, setMeta] = useState<TaskMeta>({
    courses: [],
    artifacts: [],
    assignments: [],
  });

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => titleRef.current?.focus(), 20);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, saving]);

  // Load course / artifact / assignment options for the active user/view only.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(`/api/${viewId}/task-meta`);
        const data = (await res.json()) as Partial<TaskMeta>;
        if (!res.ok || cancelled) return;

        const next: TaskMeta = {
          courses: Array.isArray(data.courses) ? data.courses : [],
          artifacts: Array.isArray(data.artifacts) ? data.artifacts : [],
          assignments: Array.isArray(data.assignments) ? data.assignments : [],
        };
        setMeta(next);

        // Drop selections that don't belong to this user.
        setCourse((current) =>
          current && next.courses.includes(current) ? current : null,
        );
        setArtifact((current) =>
          current && next.artifacts.includes(current) ? current : null,
        );
        setAssignment((current) =>
          current && next.assignments.includes(current) ? current : null,
        );
      } catch {
        if (!cancelled) {
          setMeta({ courses: [], artifacts: [], assignments: [] });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, viewId]);

  if (!open) return null;

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStatus("todo");
    setCourse(null);
    setArtifact(null);
    setAssignment(null);
    setDue(null);
    setMenu(null);
    setError(null);
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      titleRef.current?.focus();
      return;
    }
    if (saving) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/${viewId}/planner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          status,
          course,
          artifact,
          assignment,
          due,
          description: description.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not create task.");
        return;
      }
      resetForm();
      onClose();
      router.refresh();
    } catch {
      setError("Could not reach the local backend.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
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
        className="relative z-10 flex w-full max-w-[640px] flex-col overflow-hidden rounded-xl border border-[#E8E8E6] bg-white shadow-[0_16px_48px_rgba(0,0,0,0.14)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
          <div className="flex items-center gap-1.5 text-[13px] leading-4">
            <span className="flex h-6 items-center gap-1.5 rounded-md border border-[#E6E6E6] bg-[#FAFAFA] px-2 font-medium text-[#1A1A1A]">
              <svg width="12" height="12" viewBox="0 0 24 24" className="shrink-0">
                <path
                  d="M4 6h16M4 12h10M4 18h13"
                  fill="none"
                  stroke="#5E5E5E"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              Planner
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" className="shrink-0">
              <path
                d="M9 6l6 6-6 6"
                fill="none"
                stroke="#B4B4B0"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span id={titleId} className="text-[#5E5E5E]">
              New task
            </span>
          </div>

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-md text-[#6B6B6B] transition-colors hover:bg-[#F5F5F5]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-1 px-4 pt-1 pb-3">
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            className="w-full border-0 bg-transparent text-[17px] leading-6 font-medium tracking-[-0.01em] text-[#0A0A0A] outline-none placeholder:text-[#B4B4B0]"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add description…"
            rows={3}
            className="w-full resize-none border-0 bg-transparent text-sm leading-[22px] text-[#3D3D3D] outline-none placeholder:text-[#B4B4B0]"
          />
        </div>

        {/* Meta chips */}
        <div className="flex flex-wrap items-center gap-1.5 px-4 pb-4">
          <ChipMenu
            open={menu === "status"}
            onToggle={() => setMenu(menu === "status" ? null : "status")}
            onClose={() => setMenu(null)}
            active={status !== "todo"}
            icon={<StatusDot status={status} />}
            label={STATUS_LABEL[status]}
          >
            {STATUSES.map((s) => (
              <MenuItem
                key={s}
                active={s === status}
                onClick={() => {
                  setStatus(s);
                  setMenu(null);
                }}
              >
                <StatusDot status={s} />
                {STATUS_LABEL[s]}
              </MenuItem>
            ))}
          </ChipMenu>

          <ChipMenu
            open={menu === "course"}
            onToggle={() => setMenu(menu === "course" ? null : "course")}
            onClose={() => setMenu(null)}
            active={Boolean(course)}
            label={course ?? "Course"}
            icon={
              <svg width="13" height="13" viewBox="0 0 24 24" className="shrink-0">
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
            }
          >
            <MenuItem
              active={!course}
              onClick={() => {
                setCourse(null);
                setMenu(null);
              }}
            >
              No course
            </MenuItem>
            {meta.courses.length === 0 ? (
              <div className="px-3 py-2 text-[13px] leading-4 text-[#9A9A98]">
                No courses yet
              </div>
            ) : (
              meta.courses.map((c) => (
                <MenuItem
                  key={c}
                  active={course === c}
                  onClick={() => {
                    setCourse(c);
                    setMenu(null);
                  }}
                >
                  {c}
                </MenuItem>
              ))
            )}
          </ChipMenu>

          <ChipMenu
            open={menu === "artifact"}
            onToggle={() => setMenu(menu === "artifact" ? null : "artifact")}
            onClose={() => setMenu(null)}
            active={Boolean(artifact)}
            label={artifact ?? "Artifact"}
            icon={
              <svg width="13" height="13" viewBox="0 0 24 24" className="shrink-0">
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
            }
          >
            <MenuItem
              active={!artifact}
              onClick={() => {
                setArtifact(null);
                setMenu(null);
              }}
            >
              No artifact
            </MenuItem>
            {meta.artifacts.length === 0 ? (
              <div className="px-3 py-2 text-[13px] leading-4 text-[#9A9A98]">
                No artifacts yet
              </div>
            ) : (
              meta.artifacts.map((p) => (
                <MenuItem
                  key={p}
                  active={artifact === p}
                  onClick={() => {
                    setArtifact(p);
                    setMenu(null);
                  }}
                >
                  {p}
                </MenuItem>
              ))
            )}
          </ChipMenu>

          <ChipMenu
            open={menu === "assignment"}
            onToggle={() =>
              setMenu(menu === "assignment" ? null : "assignment")
            }
            onClose={() => setMenu(null)}
            active={Boolean(assignment)}
            label={assignment ?? "Assignment"}
            icon={
              <svg width="13" height="13" viewBox="0 0 24 24" className="shrink-0">
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
            }
          >
            <MenuItem
              active={!assignment}
              onClick={() => {
                setAssignment(null);
                setMenu(null);
              }}
            >
              No assignment
            </MenuItem>
            {meta.assignments.length === 0 ? (
              <div className="px-3 py-2 text-[13px] leading-4 text-[#9A9A98]">
                No assignments yet
              </div>
            ) : (
              meta.assignments.map((item) => (
                <MenuItem
                  key={item}
                  active={assignment === item}
                  onClick={() => {
                    setAssignment(item);
                    setMenu(null);
                  }}
                >
                  {item}
                </MenuItem>
              ))
            )}
          </ChipMenu>

          <ChipMenu
            open={menu === "due"}
            onToggle={() => setMenu(menu === "due" ? null : "due")}
            onClose={() => setMenu(null)}
            active={Boolean(due)}
            label={due ?? "Due date"}
            icon={
              <svg width="13" height="13" viewBox="0 0 24 24" className="shrink-0">
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
            }
          >
            <MenuItem
              active={!due}
              onClick={() => {
                setDue(null);
                setMenu(null);
              }}
            >
              No due date
            </MenuItem>
            {DUE_DATES.map((d) => (
              <MenuItem
                key={d}
                active={due === d}
                onClick={() => {
                  setDue(d);
                  setMenu(null);
                }}
              >
                {d}
              </MenuItem>
            ))}
          </ChipMenu>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#F0F0F0] px-4 py-3">
          <button
            type="button"
            aria-label="Attach file"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E6E6E6] text-[#5E5E5E] transition-colors hover:bg-[#FAFAFA]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24">
              <path
                d="M8.5 12.5l6.2-6.2a3 3 0 1 1 4.2 4.2l-7.8 7.8a4.5 4.5 0 0 1-6.4-6.4l7.5-7.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div className="flex items-center gap-3">
            {error ? (
              <span className="text-[13px] leading-4 text-[#B42318]">{error}</span>
            ) : null}
            <button
              type="button"
              onClick={handleCreate}
              className="flex h-8 items-center rounded-lg bg-[#141414] px-3.5 text-[13px] leading-4 font-medium text-white transition-colors hover:bg-[#000000] disabled:opacity-40"
              disabled={!title.trim() || saving}
            >
              {saving ? "Creating…" : "Create task"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
