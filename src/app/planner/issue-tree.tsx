"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useViewId } from "@/components/view-provider";
import IssueDetail from "./issue-detail";
import StatusMenu, { StatusIcon } from "./status-menu";
import {
  STATUS_LABEL,
  findIssue,
  flatten,
  subtreeProgress,
  type IssueGroup,
  type PlannerIssue,
  type PlannerStatus,
} from "@/lib/planner";

/** Indent per nesting level. */
const STEP = 22;

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      className={`shrink-0 transition-transform duration-150 ${open ? "" : "-rotate-90"}`}
    >
      <path
        d="M6 9.5l6 6 6-6"
        fill="none"
        stroke="#8A8A8A"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* -------------------------------------------------------------------- row --- */

function Row({
  issue,
  depth,
  open,
  statusMenuOpen,
  onToggle,
  onSelect,
  onOpenStatusMenu,
  onCloseStatusMenu,
  onChangeStatus,
}: {
  issue: PlannerIssue;
  depth: number;
  open: boolean;
  statusMenuOpen: boolean;
  onToggle: (key: string) => void;
  onSelect: (key: string) => void;
  onOpenStatusMenu: (key: string, rect: DOMRect) => void;
  onCloseStatusMenu: () => void;
  onChangeStatus: (key: string, status: PlannerStatus) => void;
}) {
  const hasChildren = Boolean(issue.children?.length);
  const progress = subtreeProgress(issue);
  const statusBtnRef = useRef<HTMLButtonElement>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!statusMenuOpen) return;
    const update = () => {
      if (statusBtnRef.current) setAnchorRect(statusBtnRef.current.getBoundingClientRect());
    };
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [statusMenuOpen]);

  return (
    <div data-design-id="m-9b2ac16071dc" className="group relative flex h-11 items-center gap-2.5 border-b border-[#F2F2F0] pr-3.5 transition-colors hover:bg-[#FBFBFA]">
      {/* Indent guides — one hairline per ancestor level. */}
      {Array.from({ length: depth }, (_, i) => (
        <span data-design-id="m-e973eff769c2"
          key={i}
          aria-hidden="true"
          className="pointer-events-none absolute top-0 bottom-0 z-10 w-px bg-[#EDEDEA]"
          style={{ left: 14 + i * STEP + 6 }}
        />
      ))}

      {hasChildren ? (
        <button data-design-id="m-41f1051690d3"
          type="button"
          onClick={() => onToggle(issue.key)}
          aria-expanded={open}
          aria-label={open ? `Collapse ${issue.title}` : `Expand ${issue.title}`}
          className="absolute z-20 flex h-5 w-5 items-center justify-center rounded transition-colors hover:bg-[#EFEFED]"
          style={{ left: 14 + depth * STEP, top: "50%", transform: "translateY(-50%)" }}
        >
          <Chevron open={open} />
        </button>
      ) : null}

      <span data-design-id="m-3b2e1b322c48"
        className="flex shrink-0 items-center"
        style={{ paddingLeft: 14 + depth * STEP }}
      >
        <span data-design-id="m-de2300775149" className="h-5 w-5 shrink-0" />
      </span>

      <div data-design-id="m-f160bea9851b" className="relative shrink-0">
        <button data-design-id="m-bbb3d3adb4cc"
          ref={statusBtnRef}
          type="button"
          aria-label={`Change status, currently ${STATUS_LABEL[issue.status]}`}
          aria-haspopup="listbox"
          aria-expanded={statusMenuOpen}
          onClick={() => {
            if (statusMenuOpen) {
              onCloseStatusMenu();
              return;
            }
            const rect = statusBtnRef.current?.getBoundingClientRect();
            if (rect) {setAnchorRect(rect);onOpenStatusMenu(issue.key, rect);}
          }}
          className="flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-[#EFEFED]"
        >
          <span data-design-id="m-7281acea3354" className="flex h-4 w-4 items-center justify-center">
            <StatusIcon status={issue.status} />
          </span>
        </button>

        {statusMenuOpen && anchorRect ? (
          <StatusMenu
            current={issue.status}
            anchorRect={anchorRect}
            onClose={onCloseStatusMenu}
            onSelect={(status) => onChangeStatus(issue.key, status)}
          />
        ) : null}
      </div>

      <button data-design-id="m-d87c8246b154"
        type="button"
        onClick={() => onSelect(issue.key)}
        className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left"
      >
        <span data-design-id="m-ce940d32e042"
          className={`min-w-0 flex-1 truncate text-sm leading-[18px] ${
            issue.status === "done" ? "text-[#9A9A98] line-through" : "text-[#0A0A0A]"
          }`}
        >
          {issue.title}
        </span>

        {hasChildren && (
          <span data-design-id="m-13e911bb29ce" className="shrink-0 text-[11.5px] leading-4 text-[#A0A09C] tabular-nums">
            {progress.done}/{progress.total}
          </span>
        )}

        {issue.assignment ? (
          <span data-design-id="m-86801f627556" className="flex h-[22px] max-w-[140px] shrink-0 items-center truncate rounded-md border border-[#E8E8E6] px-2 text-[11.5px] leading-4 text-[#5E5E5E]">
            {issue.assignment}
          </span>
        ) : null}

        {issue.artifact ? (
          <span data-design-id="m-5bf64033bfdc" className="max-w-[120px] shrink-0 truncate text-[11.5px] leading-4 text-[#9A9A98]">
            {issue.artifact}
          </span>
        ) : null}

        <span data-design-id="m-384b19970c09" className="w-[74px] shrink-0 truncate text-right text-[11.5px] leading-4 text-[#9A9A98]">
          {issue.course ?? ""}
        </span>

        <span data-design-id="m-f487e84598e2" className="w-[46px] shrink-0 text-right text-[11.5px] leading-4 text-[#9A9A98]">
          {issue.due ?? ""}
        </span>
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------- tree --- */

function Branch({
  issues,
  depth,
  openKeys,
  statusMenuKey,
  onToggle,
  onSelect,
  onOpenStatusMenu,
  onCloseStatusMenu,
  onChangeStatus,
}: {
  issues: PlannerIssue[];
  depth: number;
  openKeys: Set<string>;
  statusMenuKey: string | null;
  onToggle: (key: string) => void;
  onSelect: (key: string) => void;
  onOpenStatusMenu: (key: string, rect: DOMRect) => void;
  onCloseStatusMenu: () => void;
  onChangeStatus: (key: string, status: PlannerStatus) => void;
}) {
  return (
    <>
      {issues.map((issue) => {
        const open = openKeys.has(issue.key);
        return (
          <div data-design-id="m-a6e3491f6c18" data-design-key={issue.key} key={issue.key}>
            <Row
              issue={issue}
              depth={depth}
              open={open}
              statusMenuOpen={statusMenuKey === issue.key}
              onToggle={onToggle}
              onSelect={onSelect}
              onOpenStatusMenu={onOpenStatusMenu}
              onCloseStatusMenu={onCloseStatusMenu}
              onChangeStatus={onChangeStatus}
            />
            {open && issue.children?.length ? (
              <Branch
                issues={issue.children}
                depth={depth + 1}
                openKeys={openKeys}
                statusMenuKey={statusMenuKey}
                onToggle={onToggle}
                onSelect={onSelect}
                onOpenStatusMenu={onOpenStatusMenu}
                onCloseStatusMenu={onCloseStatusMenu}
                onChangeStatus={onChangeStatus}
              />
            ) : null}
          </div>
        );
      })}
    </>
  );
}

export default function IssueTree({
  issues,
  groups,
  emptyMessage = "No tasks yet",
}: {
  /** Full forest — used for detail lookups after filters change. */
  issues: PlannerIssue[];
  groups: IssueGroup[];
  emptyMessage?: string;
}) {
  const router = useRouter();
  const viewId = useViewId();

  // Everything with children starts expanded, so the hierarchy is visible.
  const [openKeys, setOpenKeys] = useState<Set<string>>(
    () =>
      new Set(
        issues
          .flatMap(flatten)
          .filter((i) => i.children?.length)
          .map((i) => i.key),
      ),
  );
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [statusMenuKey, setStatusMenuKey] = useState<string | null>(null);

  const toggle = (key: string) =>
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  const changeStatus = async (key: string, status: PlannerStatus) => {
    setStatusMenuKey(null);
    const issue = findIssue(issues, key);
    if (!issue || issue.status === status) return;

    try {
      const res = await fetch(`/api/${viewId}/planner/${encodeURIComponent(key)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) return;
      router.refresh();
    } catch {
      // keep current UI; refresh would reconcile
    }
  };

  const selected = selectedKey ? findIssue(issues, selectedKey) : null;

  // A selected parent also shows any newly created children immediately.
  const expandedKeys=new Set(openKeys);
  if(selected?.children?.length)expandedKeys.add(selected.key);

  if (groups.length === 0 || groups.every((g) => g.issues.length === 0)) {
    return (
      <div data-design-id="m-f4fcfe569ed3" className="flex flex-col items-center gap-2 pt-16 text-center">
        <p data-design-id="m-bf3bf80421a4" className="text-sm leading-5 text-[#6B6B6B]">{emptyMessage}</p>
      </div>
    );
  }

  const hideHeaders = groups.length === 1 && groups[0].id === "all";

  return (
    <>
      <div data-design-id="m-4c897f62af1d" className="flex flex-col pt-1.5">
        {groups.map((group) => (
          <section data-design-id="m-6009ec7bafc4" data-design-key={group.id} key={group.id} className="pt-5 first:pt-0">
            {!hideHeaders ? (
              <div data-design-id="m-2bfa79fbf088" className="flex h-9 items-center gap-2 border-b border-[#EAEAE7] px-3.5">
                {group.status ? <StatusIcon status={group.status} /> : null}
                <h2 data-design-id="m-2b251d0fb92e" className="text-[13px] leading-4 font-medium text-[#0A0A0A]">
                  {group.label}
                </h2>
                <span data-design-id="m-65b27d272b0b" className="text-[12.5px] leading-4 text-[#A0A09C] tabular-nums">
                  {group.issues.length}
                </span>
              </div>
            ) : null}
            <Branch
              issues={group.issues}
              depth={0}
              openKeys={expandedKeys}
              statusMenuKey={statusMenuKey}
              onToggle={toggle}
              onSelect={(key) => {
                setStatusMenuKey(null);
                setSelectedKey(key);
              }}
              onOpenStatusMenu={(key) => setStatusMenuKey(key)}
              onCloseStatusMenu={() => setStatusMenuKey(null)}
              onChangeStatus={changeStatus}
            />
          </section>
        ))}
      </div>

      {selected ? (
        <IssueDetail
          issue={selected}
          onClose={() => {if(selected.children?.length)setOpenKeys(current=>new Set([...current,selected.key]));setSelectedKey(null);}}
          onOpenIssue={setSelectedKey}
        />
      ) : null}
    </>
  );
}
