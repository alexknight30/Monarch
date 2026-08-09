"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BlankEmptyPlus } from "@/components/ui/blank-empty";
import { NewIssueDialog } from "@/components/ui/new-issue-dialog";
import IssueTree from "./issue-tree";
import {
  GROUP_BY_OPTIONS,
  PLANNER_TABS,
  filterByQuery,
  filterByTab,
  groupIssues,
  type PlannerGroupBy,
  type PlannerIssue,
  type PlannerTab,
} from "@/lib/planner";

export default function PlannerClient({ issues }: { issues: PlannerIssue[] }) {
  const [tab, setTab] = useState<PlannerTab>("all");
  const [groupBy, setGroupBy] = useState<PlannerGroupBy>("status");
  const [groupOpen, setGroupOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(
    () => filterByQuery(filterByTab(issues, tab), query),
    [issues, tab, query],
  );
  const groups = useMemo(() => groupIssues(visible, groupBy), [visible, groupBy]);
  const groupLabel =
    GROUP_BY_OPTIONS.find((o) => o.id === groupBy)?.label ?? "Status";

  useEffect(() => {
    if (!searchOpen) return;
    const t = window.setTimeout(() => searchRef.current?.focus(), 20);
    return () => window.clearTimeout(t);
  }, [searchOpen]);

  useEffect(() => {
    if (!groupOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (!groupRef.current?.contains(e.target as Node)) setGroupOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setGroupOpen(false);
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [groupOpen]);

  if (issues.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto pt-13 pb-16">
        <div className="flex w-240 min-h-0 flex-1 flex-col">
          <h1 className="font-display text-[34px] leading-[42px] tracking-[-0.015em] text-[#0A0A0A]">
            Planner
          </h1>
          <p className="pt-2.5 text-[15px] leading-[22px] text-[#9A9A98] italic">
            Nothing to see here yet
          </p>
          <BlankEmptyPlus addLabel="New task" createKind="issue" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto pt-13 pb-16">
      <div className="flex w-240 min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-display text-[34px] leading-[42px] tracking-[-0.015em] text-[#0A0A0A]">
            Planner
          </h1>

          <div className="flex items-center gap-3">
            {searchOpen ? (
              <div className="flex h-10 w-[220px] items-center gap-2 rounded-full border border-[#E6E6E6] bg-white px-3.5">
                <svg width="15" height="15" viewBox="0 0 24 24" className="shrink-0">
                  <circle
                    cx="10.5"
                    cy="10.5"
                    r="6.5"
                    fill="none"
                    stroke="#1A1A1A"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                  />
                  <path
                    d="M15.5 15.5L21 21"
                    fill="none"
                    stroke="#1A1A1A"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                  />
                </svg>
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      if (query) setQuery("");
                      else {
                        setSearchOpen(false);
                        setQuery("");
                      }
                    }
                  }}
                  placeholder="Search tasks…"
                  className="min-w-0 flex-1 bg-transparent text-sm leading-[18px] text-[#0A0A0A] outline-none placeholder:text-[#9A9A98]"
                />
                <button
                  type="button"
                  aria-label="Close search"
                  onClick={() => {
                    setSearchOpen(false);
                    setQuery("");
                  }}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[#8A8A8A] hover:text-[#0A0A0A]"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24">
                    <path
                      d="M6 6l12 12M18 6L6 18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                type="button"
                aria-label="Search"
                onClick={() => setSearchOpen(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E6E6E6] hover:bg-[#FAFAFA]"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" className="shrink-0">
                  <circle
                    cx="10.5"
                    cy="10.5"
                    r="6.5"
                    fill="none"
                    stroke="#1A1A1A"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                  />
                  <path
                    d="M15.5 15.5L21 21"
                    fill="none"
                    stroke="#1A1A1A"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}

            <div ref={groupRef} className="relative">
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={groupOpen}
                onClick={() => setGroupOpen((v) => !v)}
                className="flex h-10 items-center gap-[7px] rounded-full border border-[#E6E6E6] px-3.5 hover:bg-[#FAFAFA]"
              >
                <span className="text-sm leading-[18px] text-[#7A7A7A]">Group by</span>
                <span className="text-sm leading-[18px] text-[#0A0A0A]">{groupLabel}</span>
                <svg width="13" height="13" viewBox="0 0 24 24" className="shrink-0">
                  <path
                    d="M6 9.5l6 6 6-6"
                    fill="none"
                    stroke="#5E5E5E"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {groupOpen ? (
                <div
                  role="listbox"
                  className="absolute top-[calc(100%+6px)] right-0 z-40 w-[180px] overflow-hidden rounded-xl border border-[#E8E8E6] bg-white p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.12)]"
                >
                  {GROUP_BY_OPTIONS.map((option) => {
                    const active = option.id === groupBy;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => {
                          setGroupBy(option.id);
                          setGroupOpen(false);
                        }}
                        className={`flex h-8 w-full items-center justify-between rounded-md px-2.5 text-left text-[13px] leading-4 transition-colors ${
                          active
                            ? "bg-[#F1F1EF] text-[#0A0A0A]"
                            : "text-[#0A0A0A] hover:bg-[#F7F7F5]"
                        }`}
                      >
                        {option.label}
                        {active ? (
                          <svg width="14" height="14" viewBox="0 0 16 16" className="shrink-0">
                            <path
                              d="M3.5 8.2l3 3 6-6.5"
                              fill="none"
                              stroke="#0A0A0A"
                              strokeWidth="1.7"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setNewOpen(true)}
              className="flex h-10 items-center justify-center rounded-lg bg-[#141414] px-5 text-sm leading-[18px] font-medium text-white hover:bg-[#000000]"
            >
              New task
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 pt-[30px]">
          {PLANNER_TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex h-[34px] items-center rounded-lg px-3.5 text-sm leading-[18px] ${
                tab === item.id
                  ? "bg-[#F1F1EF] text-[#0A0A0A]"
                  : "text-[#5E5E5E] hover:bg-[#F7F7F5]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          <IssueTree
            issues={issues}
            groups={groups}
            emptyMessage={
              query.trim()
                ? "No tasks match your search."
                : tab === "active"
                  ? "No active tasks."
                  : tab === "backlog"
                    ? "No backlog tasks."
                    : "No tasks yet"
            }
          />
        </div>
      </div>

      <NewIssueDialog open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  );
}
