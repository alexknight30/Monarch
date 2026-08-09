"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BlankEmptyPlus } from "@/components/ui/blank-empty";
import { ClassSetupCard } from "./class-setup-card";
import type { CourseClass } from "@/lib/mock-data";

const TABS = [
  { id: "term", label: "This term" },
  { id: "past", label: "Past courses" },
  { id: "all", label: "All" },
] as const;

type ClassTab = (typeof TABS)[number]["id"];

const SORT_OPTIONS = [
  { id: "code", label: "Course code" },
  { id: "title", label: "Title" },
  { id: "instructor", label: "Instructor" },
] as const;

type ClassSort = (typeof SORT_OPTIONS)[number]["id"];

const CURRENT_TERMS = new Set(["fall 2026", "this term", "spring 2026", "summer 2026"]);

function isCurrentTerm(term: string) {
  return CURRENT_TERMS.has(term.trim().toLowerCase());
}

function filterByTab(classes: CourseClass[], tab: ClassTab): CourseClass[] {
  if (tab === "all") return classes;
  if (tab === "term") return classes.filter((c) => isCurrentTerm(c.term));
  return classes.filter((c) => !isCurrentTerm(c.term));
}

function filterByQuery(classes: CourseClass[], query: string): CourseClass[] {
  const q = query.trim().toLowerCase();
  if (!q) return classes;
  return classes.filter(
    (c) =>
      c.code.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      c.instructor.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q),
  );
}

function sortClasses(classes: CourseClass[], sort: ClassSort): CourseClass[] {
  const next = [...classes];
  if (sort === "title") {
    next.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sort === "instructor") {
    next.sort(
      (a, b) =>
        a.instructor.localeCompare(b.instructor) || a.code.localeCompare(b.code),
    );
  } else {
    next.sort((a, b) => a.code.localeCompare(b.code));
  }
  return next;
}

export default function ClassesClient({ classes }: { classes: CourseClass[] }) {
  const [setupOpen, setSetupOpen] = useState(false);
  const [tab, setTab] = useState<ClassTab>("term");
  const [sort, setSort] = useState<ClassSort>("code");
  const [sortOpen, setSortOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(
    () => sortClasses(filterByQuery(filterByTab(classes, tab), query), sort),
    [classes, tab, query, sort],
  );
  const sortLabel = SORT_OPTIONS.find((o) => o.id === sort)?.label ?? "Course code";
  const isEmpty = classes.length === 0;

  useEffect(() => {
    if (!searchOpen) return;
    const t = window.setTimeout(() => searchRef.current?.focus(), 20);
    return () => window.clearTimeout(t);
  }, [searchOpen]);

  useEffect(() => {
    if (!sortOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (!sortRef.current?.contains(e.target as Node)) setSortOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSortOpen(false);
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [sortOpen]);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto pt-13 pb-16">
      <div className="flex w-240 min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-display text-[34px] leading-[42px] tracking-[-0.015em] text-[#0A0A0A]">
            Classes
          </h1>
          {!isEmpty && !setupOpen ? (
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
                    placeholder="Search classes…"
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

              <div ref={sortRef} className="relative">
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={sortOpen}
                  onClick={() => setSortOpen((v) => !v)}
                  className="flex h-10 items-center gap-[7px] rounded-full border border-[#E6E6E6] px-3.5 hover:bg-[#FAFAFA]"
                >
                  <span className="text-sm leading-[18px] text-[#7A7A7A]">Sort by</span>
                  <span className="text-sm leading-[18px] text-[#0A0A0A]">{sortLabel}</span>
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

                {sortOpen ? (
                  <div
                    role="listbox"
                    className="absolute top-[calc(100%+6px)] right-0 z-40 w-[180px] overflow-hidden rounded-xl border border-[#E8E8E6] bg-white p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.12)]"
                  >
                    {SORT_OPTIONS.map((option) => {
                      const active = option.id === sort;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          role="option"
                          aria-selected={active}
                          onClick={() => {
                            setSort(option.id);
                            setSortOpen(false);
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
                onClick={() => setSetupOpen(true)}
                className="flex h-10 items-center justify-center rounded-lg bg-[#141414] px-5 text-sm font-medium leading-[18px] text-white hover:bg-[#000000]"
              >
                Join class
              </button>
            </div>
          ) : null}
        </div>

        {setupOpen ? (
          <ClassSetupCard onCancel={() => setSetupOpen(false)} />
        ) : isEmpty ? (
          <>
            <p className="pt-2.5 text-[15px] leading-[22px] text-[#9A9A98] italic">
              Nothing to see here yet
            </p>
            <BlankEmptyPlus
              addLabel="Join class"
              onCreate={() => setSetupOpen(true)}
            />
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5 pt-[30px]">
              {TABS.map((item) => (
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

            {visible.length === 0 ? (
              <div className="flex flex-col items-center gap-2 pt-16 text-center">
                <p className="text-sm leading-5 text-[#6B6B6B]">
                  {query.trim()
                    ? "No classes match your search."
                    : tab === "past"
                      ? "No past courses."
                      : tab === "term"
                        ? "No classes this term."
                        : "No classes yet."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-5 pt-6.5">
                {visible.map((course) => (
                  <div
                    key={course.slug}
                    className="flex h-41 flex-col justify-between rounded-xl border border-[#E8E8E6] bg-white p-[22px] transition-colors hover:border-[#D6D6D2] hover:bg-[#FCFCFB]"
                  >
                    <div className="flex flex-col gap-[9px]">
                      <div className="flex flex-col gap-1">
                        <span className="text-[13px] leading-4 font-medium tracking-[0.02em] text-[#7A7A7A]">
                          {course.code}
                        </span>
                        <h2 className="text-base font-semibold leading-5 tracking-[-0.005em] text-[#0A0A0A]">
                          {course.title}
                        </h2>
                      </div>
                      <p className="line-clamp-2 text-sm leading-[21px] text-[#4E4E4C]">
                        {course.description}
                      </p>
                    </div>
                    <div className="flex w-full items-center justify-between gap-3">
                      <span className="truncate text-[13px] leading-4 text-[#9A9A98]">
                        {course.instructor}
                      </span>
                      <span className="shrink-0 text-[13px] leading-4 text-[#9A9A98]">
                        {course.schedule}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
