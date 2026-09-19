"use client";
import { DesignCopy } from "@/components/design/runtime";

import { useEffect, useState, type ReactNode } from "react";
import { BreadcrumbBack } from "@/components/ui/breadcrumb-back";
import { ArtifactLinkedSidebar } from "@/components/artifact-linked-sidebar";
import { TagChips } from "@/components/ui/tag-chips";
import { useViewId } from "@/components/view-provider";
import { readArtifactDraft, useArtifactSave } from "@/lib/use-artifact-save";
import { tagsForKind, type TagId } from "@/lib/objects/tags";
import { ARTIFACT_KIND_LABEL, type Artifact, type Course } from "@/lib/mock-data";

export function ArtifactShell({ artifact, children }: { artifact: Artifact; children: ReactNode }) {
  const viewId = useViewId();
  const { save, retry, status, error } = useArtifactSave(artifact.id, "metadata", artifact);
  const [title, setTitle] = useState(artifact.title);
  const [description, setDescription] = useState(artifact.description);
  const [courseId, setCourseId] = useState(artifact.courseId);
  const [tags, setTags] = useState<TagId[]>(artifact.tagIds);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseError, setCourseError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/" + viewId + "/courses", { signal: controller.signal }).then(async res => {
      const data = await res.json(); if (!res.ok) throw new Error(data.error || "Courses could not be loaded."); setCourses(data.courses);
    }).catch(cause => { if (!controller.signal.aborted) setCourseError(cause.message); });
    return () => controller.abort();
  }, [viewId]);
  useEffect(() => {
    const draft = readArtifactDraft(viewId, artifact.id + ".metadata");
    if (!draft) return;
    // Browser-only metadata drafts are restored after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (typeof draft.title === "string") setTitle(draft.title);
    if (typeof draft.description === "string") setDescription(draft.description);
    if (typeof draft.courseId === "string") setCourseId(draft.courseId);
    if (Array.isArray(draft.tagIds)) setTags(draft.tagIds as TagId[]);
    save(draft);
  }, [artifact.id, save, viewId]);
  return <div data-design-id="m-44d5a931707e" className="flex min-h-0 flex-1 justify-center overflow-y-auto px-5 pt-9 pb-16">
    <div data-design-id="m-1020c11c597f" className="flex w-full max-w-[1180px] flex-col items-start gap-8 xl:flex-row">
      <div data-design-id="m-d85801e833bc" className="flex min-w-0 w-full flex-1 flex-col gap-6">
        <div data-design-id="m-66f9b42fba4e">
          <div data-design-id="m-96d877042076" className="flex items-center gap-2 text-sm"><BreadcrumbBack href="/artifacts" className="text-stone-500">Artifacts</BreadcrumbBack><span data-design-id="m-d66d1e163113" className="text-stone-300"><DesignCopy id="m-d66d1e163113">/</DesignCopy></span><span data-design-id="m-3e0ea022fcc6" className="truncate">{title}</span></div>
          <input data-design-id="m-e208edd95779" aria-label="Artifact title" className="font-display mt-5 w-full bg-transparent text-[32px] leading-10 tracking-tight outline-none" value={title} onChange={e => { setTitle(e.target.value); if (e.target.value.trim()) save({ title: e.target.value }); }} onBlur={() => { if (!title.trim()) setTitle(artifact.title); }} />
          <div data-design-id="m-ebe93f373d50" className="mt-2 flex flex-wrap items-center gap-2 text-xs text-stone-400"><span data-design-id="m-54228a3cd9c8">{ARTIFACT_KIND_LABEL[artifact.kind]}</span><span data-design-id="m-9b4735203db7"><DesignCopy id="m-9b4735203db7">·</DesignCopy></span><span data-design-id="m-c70f33eb3f58">{status}</span><TagChips tagIds={tags} />{error && <button data-design-id="m-73c1af72d7a2" className="text-red-700" onClick={() => void retry()}>{error} · Retry</button>}</div>
          <details data-design-id="m-fdbc08500dc6" className="mt-3 rounded-lg border border-stone-200 bg-white p-3">
            <summary data-design-id="m-1d199d54316a" className="cursor-pointer text-xs text-stone-500"><DesignCopy id="m-1d199d54316a">Course, tags & description</DesignCopy></summary>
            <div data-design-id="m-93b7970a8ca9" className="mt-4 space-y-4">
              <label data-design-id="m-ea9bf0148f64" className="block text-xs text-stone-500">Course<select data-design-id="m-e051d6662c94" aria-label="Artifact course" className="mt-1 block w-full rounded-lg border border-stone-200 p-2 text-sm" value={courseId} onChange={e => { setCourseId(e.target.value); save({ courseId: e.target.value }); }}>{!courses.length && <option value={courseId}>Loading course…</option>}{courses.map(c => <option key={c.id} value={c.id}>{c.code} · {c.title}</option>)}</select></label>
              {courseError && <p data-design-id="m-9658c1681010" className="text-xs text-red-700">{courseError}</p>}
              <div data-design-id="m-a47432a2c87e" className="flex flex-wrap gap-2">{tagsForKind("artifact").map(tag => <button data-design-id="m-db928c72e72d" data-design-key={tag.id} key={tag.id} className={"rounded-full border px-3 py-1 text-xs " + (tags.includes(tag.id) ? "border-orange-300 bg-orange-50 text-orange-800" : "border-stone-200 text-stone-500")} aria-pressed={tags.includes(tag.id)} onClick={() => { const next = tags.includes(tag.id) ? tags.filter(id => id !== tag.id) : [...tags,tag.id]; setTags(next); save({ tagIds: next }); }}>{tag.label}</button>)}</div>
              <label data-design-id="m-cb55818803b4" className="block text-xs text-stone-500">Description<textarea data-design-id="m-16783d38220d" className="mt-1 w-full rounded-lg border border-stone-200 p-2 text-sm" rows={2} value={description} onChange={e => { setDescription(e.target.value); save({ description: e.target.value }); }} /></label>
            </div>
          </details>
        </div>
        {children}
      </div>
      <ArtifactLinkedSidebar artifactId={artifact.id} compact />
    </div>
  </div>;
}
