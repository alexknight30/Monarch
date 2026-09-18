"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useViewId } from "@/components/view-provider";
import { ArtifactManager } from "@/components/artifact-manager";
import { BlankEmptyPlus } from "@/components/ui/blank-empty";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon } from "@/components/ui/chevron-down";
import { TextTabs } from "@/components/ui/text-tabs";
import { ToolbarSearch } from "@/components/ui/toolbar-search";
import { TagChips } from "@/components/ui/tag-chips";
import {
  ARTIFACT_KIND_LABEL,
  type Artifact,
  type ArtifactKind,
  type Course,
} from "@/lib/mock-data";

const TABS = [
  { id: "yours", label: "Yours" },
  { id: "papers", label: "Papers" },
  { id: "shared", label: "Shared with you" },
  { id: "trash", label: "Trash" },
] as const;

type ArtifactTab = (typeof TABS)[number]["id"];

const SORT_OPTIONS = [
  { id: "updated", label: "Last updated" },
  { id: "title", label: "Title" },
  { id: "creator", label: "Created by" },
] as const;

type ArtifactSort = (typeof SORT_OPTIONS)[number]["id"];

function filterByTab(artifacts: Artifact[], tab: ArtifactTab): Artifact[] {
  if (tab === "yours") return artifacts.filter((a) => a.visibility === "Private");
  if (tab === "papers") {
    return artifacts.filter(
      (a) => a.kind === "reading" || a.tagIds?.includes("paper"),
    );
  }
  if (tab === "shared") return artifacts.filter((a) => a.visibility === "Shared");
  return artifacts;
}

function filterByQuery(artifacts: Artifact[], query: string): Artifact[] {
  const q = query.trim().toLowerCase();
  if (!q) return artifacts;
  return artifacts.filter(
    (a) =>
      a.title.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.createdBy.toLowerCase().includes(q) ||
      a.kind.toLowerCase().includes(q),
  );
}

function updatedRank(value: string): number {
  if (value === "Just now") return 0;
  const days = /^(\d+)\s+days?\s+ago$/i.exec(value);
  if (days) return Number(days[1]);
  const hours = /^(\d+)\s+hours?\s+ago$/i.exec(value);
  if (hours) return Number(hours[1]) / 24;
  return 500;
}

function sortArtifacts(artifacts: Artifact[], sort: ArtifactSort): Artifact[] {
  const next = [...artifacts];
  if (sort === "title") {
    next.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sort === "creator") {
    next.sort(
      (a, b) =>
        a.createdBy.localeCompare(b.createdBy) || a.title.localeCompare(b.title),
    );
  } else {
    next.sort(
      (a, b) =>
        (a.updatedAt && b.updatedAt ? Date.parse(b.updatedAt) - Date.parse(a.updatedAt) : updatedRank(a.updated) - updatedRank(b.updated)) ||
        a.title.localeCompare(b.title),
    );
  }
  return next;
}

function kindBadge(kind: ArtifactKind) {
  return ARTIFACT_KIND_LABEL[kind];
}

export default function ArtifactsClient({
  artifacts,
  courses,
  trashed,
}: {
  artifacts: Artifact[];
  courses: Course[];
  trashed: {id:string;title:string;kind:ArtifactKind;deletedAt:string}[];
}) {
  const router = useRouter();
  const viewId = useViewId();
  const [managing,setManaging]=useState<Artifact|null>(null);
  const [courseFilter,setCourseFilter]=useState("all");
  const [restoring,setRestoring]=useState<string|null>(null);
  const [restoreError,setRestoreError]=useState("");
  const [tab, setTab] = useState<ArtifactTab>("yours");
  const [sort, setSort] = useState<ArtifactSort>("updated");
  const [sortOpen, setSortOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(
    () =>
      sortArtifacts(filterByQuery(filterByTab(artifacts, tab), query).filter(a=>courseFilter==="all"||a.courseId===courseFilter), sort),
    [artifacts, tab, query, sort, courseFilter],
  );
  const sortLabel =
    SORT_OPTIONS.find((o) => o.id === sort)?.label ?? "Last updated";

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

  const onNew = async () => {
    router.push("/artifacts/new");
  };

  async function restore(id:string) {
    setRestoring(id);setRestoreError("");
    try {const response=await fetch(`/api/${viewId}/artifacts/${encodeURIComponent(id)}/lifecycle`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"restore"})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Could not restore artifact.");router.refresh();}
    catch(error){setRestoreError(error instanceof Error?error.message:"Could not restore artifact.");}finally{setRestoring(null);}
  }

  if (artifacts.length === 0 && trashed.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto pt-13 pb-16">
        <div className="flex w-full max-w-[960px] min-h-0 flex-1 flex-col px-5">
          <h1 className="font-display text-[34px] leading-[42px] tracking-[-0.015em] text-[#0A0A0A]">
            Artifacts
          </h1>
          <p className="pt-2.5 text-[15px] leading-[22px] text-[#9A9A98] italic">
            Nothing to see here yet
          </p>
          <BlankEmptyPlus addLabel="New artifact" createKind="artifact" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto pt-13 pb-16">
        <div className="flex w-full max-w-[1000px] min-h-0 flex-1 flex-col px-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="font-display text-[34px] leading-[42px] tracking-[-0.015em] text-[#0A0A0A]">
              Artifacts
            </h1>

            <div className="flex items-center gap-3">
              <ToolbarSearch
                open={searchOpen}
                query={query}
                placeholder="Search artifacts…"
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

              <Button onClick={onNew}>New artifact</Button>
            </div>
          </div>

          <div className="pt-[30px]">
            <TextTabs items={TABS} value={tab} onChange={setTab} />
          </div>
          {tab!=="trash"&&<label className="mt-4 flex items-center gap-2 text-xs text-stone-500">Course<select aria-label="Filter artifacts by course" value={courseFilter} onChange={event=>setCourseFilter(event.target.value)} className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"><option value="all">All courses</option>{courses.map(course=><option key={course.id} value={course.id}>{course.code} · {course.title}</option>)}</select></label>}
          {restoreError&&<p role="alert" className="mt-4 text-sm text-red-700">{restoreError}</p>}

          {tab==="trash" ? <div className="mt-6 space-y-3"><p className="text-sm text-stone-500">Trashed artifacts stay here until restored. Their original files are kept.</p>{trashed.filter(item=>item.title.toLowerCase().includes(query.toLowerCase())).map(item=><div key={item.id} className="flex items-center justify-between gap-4 rounded-xl border border-stone-200 p-4"><div><p className="text-sm font-medium">{item.title}</p><p className="mt-1 text-xs text-stone-500">{kindBadge(item.kind)} · Removed {new Date(item.deletedAt).toLocaleDateString()}</p></div><button disabled={!!restoring} className="rounded-lg border border-stone-200 px-3 py-2 text-xs disabled:opacity-50" onClick={()=>void restore(item.id)}>{restoring===item.id?"Restoring…":"Restore"}</button></div>)}{!trashed.length&&<p className="py-10 text-center text-sm text-stone-400">Trash is empty.</p>}</div> : visible.length === 0 ? (
            <div className="flex flex-col items-center gap-2 pt-16 text-center">
              <p className="text-sm leading-5 text-[#6B6B6B]">
                {query.trim()
                  ? "No artifacts match your search."
                  : tab === "shared"
                    ? "No shared artifacts."
                    : tab === "papers"
                      ? "No papers yet."
                      : "No artifacts here."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 pt-6.5 sm:grid-cols-2">
              {visible.map((artifact) => {
                const cardClass =
                  "flex min-h-41 flex-col justify-between gap-4 rounded-xl border border-[#E8E8E6] bg-white p-[22px] pr-10 text-left transition-colors hover:border-[#D6D6D2] hover:bg-[#FCFCFB]";
                const body = (
                  <>
                    <div className="flex flex-col gap-[9px]">
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-semibold leading-5 tracking-[-0.005em] text-[#0A0A0A]">
                          {artifact.title}
                        </h2>
                        <span className="rounded-md bg-[#F1F1EF] px-1.5 py-0.5 text-[11px] leading-3 text-[#5E5E5E]">
                          {kindBadge(artifact.kind)}
                        </span>
                        <TagChips tagIds={artifact.tagIds} />
                      </div>
                      <p className="line-clamp-3 text-sm leading-[21px] text-[#4E4E4C]">
                        {artifact.description}
                      </p>
                    </div>
                    <div className="flex w-full items-center justify-between">
                      <span className="text-[13px] leading-4 text-[#9A9A98]">
                        Created by {artifact.createdBy}
                      </span>
                      <span className="text-[13px] leading-4 text-[#9A9A98]">
                        {artifact.updated}
                      </span>
                    </div>
                  </>
                );

                return (
                  <div key={artifact.slug} className="relative"><Link
                    href={`/artifacts/${artifact.slug}`}
                    className={cardClass}
                  >
                    {body}
                  </Link><button aria-label={`Manage ${artifact.title}`} title="Artifact details, copy or trash" className="absolute top-3 right-3 rounded-md px-2 py-1 text-stone-500 hover:bg-stone-100" onClick={()=>setManaging(artifact)}>⋯</button></div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {managing&&<ArtifactManager key={managing.id} artifact={managing} onClose={()=>setManaging(null)}/>}
    </>
  );
}
