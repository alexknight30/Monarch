"use client";
import { DesignCopy } from "@/components/design/runtime";


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
      <div data-design-id="m-492e7bf324ab" className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto pt-13 pb-16">
        <div data-design-id="m-4958d490bfd4" className="flex w-full max-w-[960px] min-h-0 flex-1 flex-col px-5">
          <h1 data-design-id="m-b8b8e2d0e827" className="font-display text-[34px] leading-[42px] tracking-[-0.015em] text-[#0A0A0A]"><DesignCopy id="m-b8b8e2d0e827">
            Artifacts
          </DesignCopy></h1>
          <p data-design-id="m-21e78a7ab979" className="pt-2.5 text-[15px] leading-[22px] text-[#9A9A98] italic"><DesignCopy id="m-21e78a7ab979">
            Nothing to see here yet
          </DesignCopy></p>
          <BlankEmptyPlus addLabel="New artifact" createKind="artifact" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div data-design-id="m-8c0b173a11f1" className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto pt-13 pb-16">
        <div data-design-id="m-88690dfb3050" className="flex w-full max-w-[1000px] min-h-0 flex-1 flex-col px-5">
          <div data-design-id="m-9e6cea73814b" className="flex flex-wrap items-center justify-between gap-4">
            <h1 data-design-id="m-afdbb0547c15" className="font-display text-[34px] leading-[42px] tracking-[-0.015em] text-[#0A0A0A]"><DesignCopy id="m-afdbb0547c15">
              Artifacts
            </DesignCopy></h1>

            <div data-design-id="m-58b9a45dad7f" className="flex items-center gap-3">
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

              <div data-design-id="m-0de9201d788a" ref={sortRef} className="relative">
                <Button data-design-id="m-ba5e06f6499f" data-design-key="m-ba5e06f6499f"
                  variant="secondary"
                  aria-haspopup="listbox"
                  aria-expanded={sortOpen}
                  onClick={() => setSortOpen((v) => !v)}
                >
                  <span data-design-id="m-3c0358cf1b13" className="text-[#6B6B6B]"><DesignCopy id="m-3c0358cf1b13">Sort by</DesignCopy></span>
                  {sortLabel}
                  <ChevronDownIcon size={13} />
                </Button>

                {sortOpen ? (
                  <div data-design-id="m-c82ce3128c73"
                    role="listbox"
                    className="absolute top-[calc(100%+6px)] right-0 z-40 w-[180px] overflow-hidden rounded-lg border border-[#E6E6E6] bg-white p-1.5"
                  >
                    {SORT_OPTIONS.map((option) => {
                      const active = option.id === sort;
                      return (
                        <button data-design-id="m-20e436f75184" data-design-key={option.id}
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

              <Button data-design-id="m-d8bcb4085c66" data-design-key="m-d8bcb4085c66" onClick={onNew}><DesignCopy id="m-d8bcb4085c66">New artifact</DesignCopy></Button>
            </div>
          </div>

          <div data-design-id="m-4e3009e5914a" className="pt-[30px]">
            <TextTabs items={TABS} value={tab} onChange={setTab} />
          </div>
          {tab!=="trash"&&<label data-design-id="m-30555c8cb16f" className="mt-4 flex items-center gap-2 text-xs text-stone-500">Course<select data-design-id="m-0fafc509ae05" aria-label="Filter artifacts by course" value={courseFilter} onChange={event=>setCourseFilter(event.target.value)} className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"><option value="all">All courses</option>{courses.map(course=><option key={course.id} value={course.id}>{course.code} · {course.title}</option>)}</select></label>}
          {restoreError&&<p data-design-id="m-daf39c0f27c0" role="alert" className="mt-4 text-sm text-red-700">{restoreError}</p>}

          {tab==="trash" ? <div data-design-id="m-d35518fded38" className="mt-6 space-y-3"><p data-design-id="m-090fa1161749" className="text-sm text-stone-500"><DesignCopy id="m-090fa1161749">Trashed artifacts stay here until restored. Their original files are kept.</DesignCopy></p>{trashed.filter(item=>item.title.toLowerCase().includes(query.toLowerCase())).map(item=><div data-design-id="m-ce395306a167" data-design-key={item.id} key={item.id} className="flex items-center justify-between gap-4 rounded-xl border border-stone-200 p-4"><div data-design-id="m-33e3b143b02d"><p data-design-id="m-7fded8adc571" className="text-sm font-medium">{item.title}</p><p data-design-id="m-6c0a3787ca70" className="mt-1 text-xs text-stone-500">{kindBadge(item.kind)} · Removed {new Date(item.deletedAt).toLocaleDateString()}</p></div><button data-design-id="m-e0ed62d71a48" disabled={!!restoring} className="rounded-lg border border-stone-200 px-3 py-2 text-xs disabled:opacity-50" onClick={()=>void restore(item.id)}>{restoring===item.id?"Restoring…":"Restore"}</button></div>)}{!trashed.length&&<p data-design-id="m-8946a61cda2f" className="py-10 text-center text-sm text-stone-400"><DesignCopy id="m-8946a61cda2f">Trash is empty.</DesignCopy></p>}</div> : visible.length === 0 ? (
            <div data-design-id="m-a1d703db3f28" className="flex flex-col items-center gap-2 pt-16 text-center">
              <p data-design-id="m-4258997443e2" className="text-sm leading-5 text-[#6B6B6B]">
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
            <div data-design-id="m-804e63cd72a6" className="grid grid-cols-1 gap-5 pt-6.5 sm:grid-cols-2">
              {visible.map((artifact) => {
                const cardClass =
                  "flex min-h-41 flex-col justify-between gap-4 rounded-xl border border-[#E8E8E6] bg-white p-[22px] pr-10 text-left transition-colors hover:border-[#D6D6D2] hover:bg-[#FCFCFB]";
                const body = (
                  <>
                    <div data-design-id="m-115746f58af6" className="flex flex-col gap-[9px]">
                      <div data-design-id="m-fdcf7ca60668" className="flex items-center gap-2">
                        <h2 data-design-id="m-c91e9821312d" className="text-base font-semibold leading-5 tracking-[-0.005em] text-[#0A0A0A]">
                          {artifact.title}
                        </h2>
                        <span data-design-id="m-983352806980" className="rounded-md bg-[#F1F1EF] px-1.5 py-0.5 text-[11px] leading-3 text-[#5E5E5E]">
                          {kindBadge(artifact.kind)}
                        </span>
                        <TagChips tagIds={artifact.tagIds} />
                      </div>
                      <p data-design-id="m-1602b5613bee" className="line-clamp-3 text-sm leading-[21px] text-[#4E4E4C]">
                        {artifact.description}
                      </p>
                    </div>
                    <div data-design-id="m-c8300df99696" className="flex w-full items-center justify-between">
                      <span data-design-id="m-94b297b7ac8d" className="text-[13px] leading-4 text-[#9A9A98]">
                        Created by {artifact.createdBy}
                      </span>
                      <span data-design-id="m-7ec906d46ec1" className="text-[13px] leading-4 text-[#9A9A98]">
                        {artifact.updated}
                      </span>
                    </div>
                  </>
                );

                return (
                  <div data-design-id="m-140bb343d44e" data-design-key={artifact.slug} key={artifact.slug} className="relative"><Link data-design-id="m-a6ca7e709b62"
                    href={`/artifacts/${artifact.slug}`}
                    className={cardClass}
                  >
                    {body}
                  </Link><button data-design-id="m-e80b9ba12837" aria-label={`Manage ${artifact.title}`} title="Artifact details, copy or trash" className="absolute top-3 right-3 rounded-md px-2 py-1 text-stone-500 hover:bg-stone-100" onClick={()=>setManaging(artifact)}><DesignCopy id="m-e80b9ba12837">⋯</DesignCopy></button></div>
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
