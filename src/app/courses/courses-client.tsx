"use client";
import { DesignCopy } from "@/components/design/runtime";


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
  { id: "term", label: "Active courses" },
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

function filterByTab(courses: Course[], tab: CourseTab, today: string): Course[] {
  if (tab === "all") return courses;
  const isPast=(course:Course)=>!!course.termEndsAt&&course.termEndsAt.slice(0,10)<today;
  if (tab === "term") return courses.filter((course) => !isPast(course));
  return courses.filter(isPast);
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

export default function CoursesClient({ courses, today }: { courses: Course[]; today:string }) {
  const [setupOpen, setSetupOpen] = useState(false);
  const [tab, setTab] = useState<CourseTab>("term");
  const [sort, setSort] = useState<CourseSort>("code");
  const [sortOpen, setSortOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(
    () => sortCourses(filterByQuery(filterByTab(courses, tab, today), query), sort),
    [courses, tab, query, sort, today],
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
    <div data-design-id="m-d43e829831e0" className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto pt-13 pb-16">
      <div data-design-id="m-c63f2e15b9b1" className="flex w-240 min-h-0 flex-1 flex-col">
        <div data-design-id="m-321c0497f9b6" className="flex items-center justify-between gap-4">
          <h1 data-design-id="m-e3fe526d6579" className="font-display text-[34px] leading-[42px] tracking-[-0.015em] text-[#0A0A0A]"><DesignCopy id="m-e3fe526d6579">
            Courses
          </DesignCopy></h1>
          {!isEmpty && !setupOpen ? (
            <div data-design-id="m-8219cbd52460" className="flex items-center gap-3">
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

              <div data-design-id="m-1bc5831c7445" ref={sortRef} className="relative">
                <Button data-design-id="m-da47286dd43b" data-design-key="m-da47286dd43b"
                  variant="secondary"
                  aria-haspopup="listbox"
                  aria-expanded={sortOpen}
                  onClick={() => setSortOpen((v) => !v)}
                >
                  <span data-design-id="m-3677aa3489ad" className="text-[#6B6B6B]"><DesignCopy id="m-3677aa3489ad">Sort by</DesignCopy></span>
                  {sortLabel}
                  <ChevronDownIcon size={13} />
                </Button>

                {sortOpen ? (
                  <div data-design-id="m-f99cba3764d7"
                    role="listbox"
                    className="absolute top-[calc(100%+6px)] right-0 z-40 w-[180px] overflow-hidden rounded-lg border border-[#E6E6E6] bg-white p-1.5"
                  >
                    {SORT_OPTIONS.map((option) => {
                      const active = option.id === sort;
                      return (
                        <button data-design-id="m-17573c09e157" data-design-key={option.id}
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

              <Button data-design-id="m-438aa6ac94d2" data-design-key="m-438aa6ac94d2" onClick={() => setSetupOpen(true)}><DesignCopy id="m-438aa6ac94d2">Add course</DesignCopy></Button>
            </div>
          ) : null}
        </div>

        {setupOpen ? (
          <CourseSetupCard onCancel={() => setSetupOpen(false)} />
        ) : isEmpty ? (
          <>
            <p data-design-id="m-80d0de687994" className="pt-2.5 text-[15px] leading-[22px] text-[#9A9A98] italic"><DesignCopy id="m-80d0de687994">
              Nothing to see here yet
            </DesignCopy></p>
            <BlankEmptyPlus
              addLabel="Add course"
              onCreate={() => setSetupOpen(true)}
            />
          </>
        ) : (
          <>
            <div data-design-id="m-c2972737facd" className="pt-[30px]">
              <TextTabs items={TABS} value={tab} onChange={setTab} />
            </div>
            <p data-design-id="m-9961083a29be" className="mt-3 text-xs text-stone-400"><DesignCopy id="m-9961083a29be">Courses move to Past after their term end date. Set dates in Edit course.</DesignCopy></p>

            {visible.length === 0 ? (
              <div data-design-id="m-61598a69f8a1" className="flex flex-col items-center gap-2 pt-16 text-center">
                <p data-design-id="m-3e9233a78f78" className="text-sm leading-5 text-[#6B6B6B]">
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
              <div data-design-id="m-0ffccd14207d" className="grid grid-cols-2 gap-5 pt-6.5">
                {visible.map((course) => (
                  <Link data-design-id="m-88f081393668" data-design-key={course.slug}
                    key={course.slug}
                    href={`/courses/${course.slug}`}
                    className="flex h-41 cursor-pointer flex-col justify-between rounded-xl border border-[#E8E8E6] bg-white p-[22px] transition-colors hover:border-[#D6D6D2] hover:bg-[#FCFCFB]"
                  >
                    <div data-design-id="m-c675985476cc" className="flex flex-col gap-[9px]">
                      <div data-design-id="m-7bf3074280cc" className="flex flex-col gap-1">
                        <span data-design-id="m-e17d94bdc6e7" className="text-[13px] leading-4 font-medium tracking-[0.02em] text-[#7A7A7A]">
                          {course.code}
                        </span>
                        <h2 data-design-id="m-2419a159d447" className="text-base font-semibold leading-5 tracking-[-0.005em] text-[#0A0A0A]">
                          {course.title}
                        </h2>
                      </div>
                      <p data-design-id="m-4dd93ff57710" className="line-clamp-2 text-sm leading-[21px] text-[#4E4E4C]">
                        {course.description}
                      </p>
                    </div>
                    <div data-design-id="m-33a32e3de3b3" className="flex w-full items-center justify-between gap-3">
                      <span data-design-id="m-cc97ef680233" className="truncate text-[13px] leading-4 text-[#9A9A98]">
                        {course.instructor}
                      </span>
                      <span data-design-id="m-0fa7e555615a" className="shrink-0 text-[13px] leading-4 text-[#9A9A98]">
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
