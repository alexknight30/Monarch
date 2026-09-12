"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BlankEmptyPlus } from "@/components/ui/blank-empty";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon } from "@/components/ui/chevron-down";
import { TextTabs } from "@/components/ui/text-tabs";
import { ToolbarSearch } from "@/components/ui/toolbar-search";
import { CourseSetupCard } from "./course-setup-card";
import type { Course } from "@/lib/mock-data";

const TABS = [
  { id: "term", label: "This term" },
  { id: "past", label: "Past courses" },
  { id: "all", label: "All" },
] as const;

type CourseTab = (typeof TABS)[number]["id"];

const SORT_OPTIONS = [
  { id: "code", label: "Course code" },
  { id: "title", label: "Title" },
  { id: "instructor", label: "Instructor" },
] as const;

type CourseSort = (typeof SORT_OPTIONS)[number]["id"];

const CURRENT_TERMS = new Set(["fall 2026", "this term", "spring 2026", "summer 2026"]);

function isCurrentTerm(term: string) {
  return CURRENT_TERMS.has(term.trim().toLowerCase());
}

function filterByTab(courses: Course[], tab: CourseTab): Course[] {
  if (tab === "all") return courses;
  if (tab === "term") return courses.filter((c) => isCurrentTerm(c.term));
  return courses.filter((c) => !isCurrentTerm(c.term));
}

function filterByQuery(courses: Course[], query: string): Course[] {
  const q = query.trim().toLowerCase();
  if (!q) return courses;
  return courses.filter(
    (c) =>
      c.code.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      c.instructor.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q),
  );
}

function sortCourses(courses: Course[], sort: CourseSort): Course[] {
  const next = [...courses];
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

export default function CoursesClient({ courses }: { courses: Course[] }) {
  const [setupOpen, setSetupOpen] = useState(false);
  const [tab, setTab] = useState<CourseTab>("term");
  const [sort, setSort] = useState<CourseSort>("code");
  const [sortOpen, setSortOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(
    () => sortCourses(filterByQuery(filterByTab(courses, tab), query), sort),
    [courses, tab, query, sort],
  );
  const sortLabel = SORT_OPTIONS.find((o) => o.id === sort)?.label ?? "Course code";
  const isEmpty = courses.length === 0;

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
            Courses
          </h1>
          {!isEmpty && !setupOpen ? (
            <div className="flex items-center gap-3">
              <ToolbarSearch
                open={searchOpen}
                query={query}
                placeholder="Search courses…"
                inputRef={searchRef}
                onOpen={() => setSearchOpen(true)}
                onClose={() => {
                  setSearchOpen(false);
                  setQuery("");
                }}
                onQueryChange={setQuery}
              />

              <div ref={sortRef} className="relative">
                <Button
                  variant="secondary"
                  aria-haspopup="listbox"
                  aria-expanded={sortOpen}
                  onClick={() => setSortOpen((v) => !v)}
                >
                  <span className="text-[#6B6B6B]">Sort by</span>
                  {sortLabel}
                  <ChevronDownIcon size={13} />
                </Button>

                {sortOpen ? (
                  <div
                    role="listbox"
                    className="absolute top-[calc(100%+6px)] right-0 z-40 w-[180px] overflow-hidden rounded-lg border border-[#E6E6E6] bg-white p-1.5"
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

              <Button onClick={() => setSetupOpen(true)}>Join course</Button>
            </div>
          ) : null}
        </div>

        {setupOpen ? (
          <CourseSetupCard onCancel={() => setSetupOpen(false)} />
        ) : isEmpty ? (
          <>
            <p className="pt-2.5 text-[15px] leading-[22px] text-[#9A9A98] italic">
              Nothing to see here yet
            </p>
            <BlankEmptyPlus
              addLabel="Join course"
              onCreate={() => setSetupOpen(true)}
            />
          </>
        ) : (
          <>
            <div className="pt-[30px]">
              <TextTabs items={TABS} value={tab} onChange={setTab} />
            </div>

            {visible.length === 0 ? (
              <div className="flex flex-col items-center gap-2 pt-16 text-center">
                <p className="text-sm leading-5 text-[#6B6B6B]">
                  {query.trim()
                    ? "No courses match your search."
                    : tab === "past"
                      ? "No past courses."
                      : tab === "term"
                        ? "No courses this term."
                        : "No courses yet."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-5 pt-6.5">
                {visible.map((course) => (
                  <Link
                    key={course.slug}
                    href={`/courses/${course.slug}`}
                    className="flex h-41 cursor-pointer flex-col justify-between rounded-xl border border-[#E8E8E6] bg-white p-[22px] transition-colors hover:border-[#D6D6D2] hover:bg-[#FCFCFB]"
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
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
