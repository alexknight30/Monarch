"use client";
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
  return <div className="flex min-h-0 flex-1 justify-center overflow-y-auto px-5 pt-9 pb-16">
    <div className="flex w-full max-w-[1180px] flex-col items-start gap-8 xl:flex-row">
      <div className="flex min-w-0 w-full flex-1 flex-col gap-6">
        <div>
          <div className="flex items-center gap-2 text-sm"><BreadcrumbBack href="/artifacts" className="text-stone-500">Artifacts</BreadcrumbBack><span className="text-stone-300">/</span><span className="truncate">{title}</span></div>
          <input aria-label="Artifact title" className="font-display mt-5 w-full bg-transparent text-[32px] leading-10 tracking-tight outline-none" value={title} onChange={e => { setTitle(e.target.value); if (e.target.value.trim()) save({ title: e.target.value }); }} onBlur={() => { if (!title.trim()) setTitle(artifact.title); }} />
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-stone-400"><span>{ARTIFACT_KIND_LABEL[artifact.kind]}</span><span>·</span><span>{status}</span><TagChips tagIds={tags} />{error && <button className="text-red-700" onClick={() => void retry()}>{error} · Retry</button>}</div>
          <details className="mt-3 rounded-lg border border-stone-200 bg-white p-3">
            <summary className="cursor-pointer text-xs text-stone-500">Course, tags & description</summary>
            <div className="mt-4 space-y-4">
              <label className="block text-xs text-stone-500">Course<select aria-label="Artifact course" className="mt-1 block w-full rounded-lg border border-stone-200 p-2 text-sm" value={courseId} onChange={e => { setCourseId(e.target.value); save({ courseId: e.target.value }); }}>{!courses.length && <option value={courseId}>Loading course…</option>}{courses.map(c => <option key={c.id} value={c.id}>{c.code} · {c.title}</option>)}</select></label>
              {courseError && <p className="text-xs text-red-700">{courseError}</p>}
              <div className="flex flex-wrap gap-2">{tagsForKind("artifact").map(tag => <button key={tag.id} className={"rounded-full border px-3 py-1 text-xs " + (tags.includes(tag.id) ? "border-orange-300 bg-orange-50 text-orange-800" : "border-stone-200 text-stone-500")} aria-pressed={tags.includes(tag.id)} onClick={() => { const next = tags.includes(tag.id) ? tags.filter(id => id !== tag.id) : [...tags,tag.id]; setTags(next); save({ tagIds: next }); }}>{tag.label}</button>)}</div>
              <label className="block text-xs text-stone-500">Description<textarea className="mt-1 w-full rounded-lg border border-stone-200 p-2 text-sm" rows={2} value={description} onChange={e => { setDescription(e.target.value); save({ description: e.target.value }); }} /></label>
            </div>
          </details>
        </div>
        {children}
      </div>
      <ArtifactLinkedSidebar artifactId={artifact.id} compact />
    </div>
  </div>;
}
