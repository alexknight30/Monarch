"use client";
import { DesignCopy } from "@/components/design/runtime";


import { useEffect, useMemo, useRef, useState } from "react";
import { BlankEmptyPlus } from "@/components/ui/blank-empty";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon } from "@/components/ui/chevron-down";
import { NewIssueDialog } from "@/components/ui/new-issue-dialog";
import { TextTabs } from "@/components/ui/text-tabs";
import { ToolbarSearch } from "@/components/ui/toolbar-search";
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
      <div data-design-id="m-93b36b70a983" className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto pt-13 pb-16">
        <div data-design-id="m-c9021dc37e8e" className="flex w-240 min-h-0 flex-1 flex-col">
          <h1 data-design-id="m-23b7efe60ea1" className="font-display text-[34px] leading-[42px] tracking-[-0.015em] text-[#0A0A0A]"><DesignCopy id="m-23b7efe60ea1">
            Planner
          </DesignCopy></h1>
          <p data-design-id="m-83624d54ec6a" className="pt-2.5 text-[15px] leading-[22px] text-[#9A9A98] italic"><DesignCopy id="m-83624d54ec6a">
            Nothing to see here yet
          </DesignCopy></p>
          <BlankEmptyPlus addLabel="New task" createKind="issue" />
        </div>
      </div>
    );
  }

  return (
    <div data-design-id="m-7ef044940738" className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto pt-13 pb-16">
      <div data-design-id="m-f3b1e64d3e87" className="flex w-240 min-h-0 flex-1 flex-col">
        <div data-design-id="m-3085c208f298" className="flex items-center justify-between gap-4">
          <h1 data-design-id="m-7ef03afee30e" className="font-display text-[34px] leading-[42px] tracking-[-0.015em] text-[#0A0A0A]"><DesignCopy id="m-7ef03afee30e">
            Planner
          </DesignCopy></h1>

          <div data-design-id="m-9f239254f56c" className="flex items-center gap-3">
            <ToolbarSearch
              open={searchOpen}
              query={query}
              placeholder="Search tasks…"
              inputRef={searchRef}
              onOpen={() => setSearchOpen(true)}
              onClose={() => {
                setSearchOpen(false);
                setQuery("");
              }}
              onQueryChange={setQuery}
            />

            <div data-design-id="m-aaa2b41ed4c5" ref={groupRef} className="relative">
              <Button data-design-id="m-201123fc1bb9" data-design-key="m-201123fc1bb9"
                variant="secondary"
                aria-haspopup="listbox"
                aria-expanded={groupOpen}
                onClick={() => setGroupOpen((v) => !v)}
              >
                <span data-design-id="m-94f3e60e6060" className="text-[#6B6B6B]"><DesignCopy id="m-94f3e60e6060">Group by</DesignCopy></span>
                {groupLabel}
                <ChevronDownIcon size={13} />
              </Button>

              {groupOpen ? (
                <div data-design-id="m-d1b5188eea21"
                  role="listbox"
                  className="absolute top-[calc(100%+6px)] right-0 z-40 w-[180px] overflow-hidden rounded-lg border border-[#E6E6E6] bg-white p-1.5"
                >
                  {GROUP_BY_OPTIONS.map((option) => {
                    const active = option.id === groupBy;
                    return (
                      <button data-design-id="m-36fb1501c962" data-design-key={option.id}
                        key={option.id}
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => {
                          setGroupBy(option.id);
                          setGroupOpen(false);
                        }}
                        className={`flex h-8 w-full items-center justify-between px-2.5 text-left text-[13px] leading-4 transition-colors ${
                          active
                            ? "bg-[#F1F1EF] text-[#0A0A0A]"
                            : "text-[#0A0A0A] hover:bg-[#F7F7F5]"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <Button data-design-id="m-5486aeb452cd" data-design-key="m-5486aeb452cd" onClick={() => setNewOpen(true)}><DesignCopy id="m-5486aeb452cd">New task</DesignCopy></Button>
          </div>
        </div>

        <div data-design-id="m-9c79a5b6fab2" className="pt-[30px]">
          <TextTabs items={PLANNER_TABS} value={tab} onChange={setTab} />
        </div>

        <div data-design-id="m-a3d45c654158" className="mt-6">
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
