import type { Artifact, Course } from "@/lib/mock-data";
import { htmlToPlainText, resolveBodyHtml } from "@/lib/documents";
import type { StoredCalendarEvent } from "@/lib/calendar-events";
import { artifactBodyText } from "@/lib/objects/normalize";
import type { ObjectLink, ObjectRef, ObjectSummary } from "@/lib/objects/types";
import { refsEqual } from "@/lib/objects/types";
import { flatten, type PlannerIssue } from "@/lib/planner";

export function courseLabel(courses: Course[], courseId: string) {
  const course = courses.find((item) => item.id === courseId);
  if (!course) return courseId;
  if (course.id === "unassigned") return "Unassigned";
  return course.code || course.title;
}

export function summarizeArtifact(
  artifact: Artifact,
  courses: Course[],
): ObjectSummary {
  const body = artifactBodyText(artifact);
  return {
    kind: "artifact",
    id: artifact.id,
    slug: artifact.slug,
    title: artifact.title,
    tagIds: artifact.tagIds,
    courseId: artifact.courseId,
    courseLabel: courseLabel(courses, artifact.courseId),
    updatedAt: artifact.updated,
    bodyChars: body.length,
    artifactKind: artifact.kind,
  };
}

export function summarizeEvent(
  event: StoredCalendarEvent,
  courses: Course[],
): ObjectSummary {
  return {
    kind: "event",
    id: event.id,
    title: event.title,
    tagIds: event.tagIds,
    courseId: event.courseId,
    courseLabel: courseLabel(courses, event.courseId),
    updatedAt: event.startsAt,
    bodyChars: (event.location ?? "").length,
  };
}

export function summarizeTask(
  issue: PlannerIssue,
  courses: Course[],
): ObjectSummary {
  const courseId = issue.courseId || "unassigned";
  return {
    kind: "task",
    id: issue.id,
    slug: issue.key,
    title: issue.title,
    tagIds: issue.tagIds ?? [],
    courseId,
    courseLabel: courseLabel(courses, courseId),
    updatedAt: issue.dueAt || issue.due || "",
    bodyChars: (issue.description ?? "").length,
  };
}

export function findTask(
  planner: PlannerIssue[],
  idOrKey: string,
): PlannerIssue | null {
  for (const issue of planner) {
    const hit = flatten(issue).find(
      (node) => node.id === idOrKey || node.key === idOrKey,
    );
    if (hit) return hit;
  }
  return null;
}

export function otherEnd(link: ObjectLink, ref: ObjectRef): ObjectRef {
  return refsEqual(link.a, ref) ? link.b : link.a;
}

export function linksFor(links: ObjectLink[], ref: ObjectRef): ObjectLink[] {
  return links.filter((link) => refsEqual(link.a, ref) || refsEqual(link.b, ref));
}

export function excerptText(text: string, max = 500) {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trim()}…`;
}

export function artifactExcerpt(artifact: Artifact, selection?: string) {
  if (selection?.trim()) return excerptText(selection, 500);
  if (artifact.kind === "document" || artifact.kind === "notes") {
    return excerptText(htmlToPlainText(resolveBodyHtml(artifact)), 500);
  }
  return excerptText(artifactBodyText(artifact), 500);
}
