import { emptyDocumentContent, htmlToPlainText, resolveBodyHtml } from "@/lib/documents";
import type { StoredCalendarEvent } from "@/lib/calendar-events";
import {
  isArtifactKind,
  type Artifact,
  type Course,
  type DiagramArtifact,
  type DocumentArtifact,
  type FlashcardsArtifact,
  type LessonArtifact,
  type NotesArtifact,
  type PracticeTestArtifact,
  type ReadingArtifact,
  type SlidesArtifact,
} from "@/lib/mock-data";
import {
  UNASSIGNED_COURSE,
  UNASSIGNED_COURSE_ID,
} from "@/lib/objects/unassigned";
import {
  sanitizeTagIds,
  tagsFromCalendarKind,
  tagsFromPlannerLabels,
} from "@/lib/objects/tags";
import type { ObjectLink, ObjectRef } from "@/lib/objects/types";
import { canonLinkPair, isLinkableKind, refsEqual } from "@/lib/objects/types";
import { emptyMemory, type MemoryState } from "@/lib/objects/memory";
import { flatten, type PlannerIssue } from "@/lib/planner";
import { normalizeDiagramSpec } from "@/lib/diagram";

export function ensureCourses(courses: Course[]): Course[] {
  const next = courses.map((course) => ({
    ...course,
    id: course.id || course.slug,
  }));
  if (!next.some((course) => course.id === UNASSIGNED_COURSE_ID)) {
    next.push(UNASSIGNED_COURSE);
  }
  return next;
}

function courseIdFrom(
  courses: Course[],
  courseSlug?: string,
  courseCode?: string,
): string {
  if (courseSlug) {
    const hit = courses.find(
      (course) => course.slug === courseSlug || course.id === courseSlug,
    );
    if (hit) return hit.id;
  }
  if (courseCode?.trim()) {
    const hit = courses.find((course) => course.code === courseCode.trim());
    if (hit) return hit.id;
  }
  return UNASSIGNED_COURSE_ID;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function migrateKind(raw: Record<string, unknown>): Artifact["kind"] {
  const kind = typeof raw.kind === "string" ? raw.kind : "document";
  if (kind === "paper") return "reading";
  if (isArtifactKind(kind)) return kind;
  return "document";
}

function textFields(raw: Record<string, unknown>, title: string) {
  const empty = emptyDocumentContent(title);
  return {
    shortTitle:
      typeof raw.shortTitle === "string" && raw.shortTitle.trim()
        ? raw.shortTitle
        : empty.shortTitle,
    course: typeof raw.course === "string" ? raw.course : empty.course,
    due: typeof raw.due === "string" ? raw.due : empty.due,
    status:
      raw.status === "Submitted" || raw.status === "Returned"
        ? raw.status
        : empty.status,
    savedAt: typeof raw.savedAt === "string" ? raw.savedAt : empty.savedAt,
    bodyHtml: typeof raw.bodyHtml === "string" ? raw.bodyHtml : empty.bodyHtml,
    blocks: Array.isArray(raw.blocks) ? raw.blocks : empty.blocks,
    thread: Array.isArray(raw.thread) ? raw.thread : empty.thread,
    comments: Array.isArray(raw.comments) ? raw.comments : [],
  };
}

export function normalizeArtifact(
  rawInput: unknown,
  courses: Course[],
): Artifact {
  const raw = asRecord(rawInput);
  const title =
    typeof raw.title === "string" && raw.title.trim()
      ? raw.title
      : "Untitled";
  const slug =
    typeof raw.slug === "string" && raw.slug.trim()
      ? raw.slug
      : "untitled";
  const courseId = courseIdFrom(
    courses,
    typeof raw.courseId === "string" ? raw.courseId : typeof raw.courseSlug === "string" ? raw.courseSlug : undefined,
    typeof raw.course === "string" ? raw.course : undefined,
  );
  const course = courses.find((item) => item.id === courseId);
  const base = {
    revision: typeof raw.revision === "number" ? raw.revision : 0,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : undefined,
    id: typeof raw.id === "string" && raw.id.trim() ? raw.id : slug,
    slug,
    title,
    description:
      typeof raw.description === "string"
        ? raw.description
        : "No description yet.",
    createdBy: typeof raw.createdBy === "string" ? raw.createdBy : "You",
    updated: typeof raw.updated === "string" ? raw.updated : "Just now",
    visibility: raw.visibility === "Shared" ? ("Shared" as const) : ("Private" as const),
    instructions:
      typeof raw.instructions === "string" ? raw.instructions : null,
    context: Array.isArray(raw.context) ? raw.context : [],
    scheduled: Array.isArray(raw.scheduled) ? raw.scheduled : [],
    chats: Array.isArray(raw.chats) ? raw.chats : [],
    courseId,
    ...(course && course.id !== UNASSIGNED_COURSE_ID
      ? { courseSlug: course.slug }
      : {}),
    ...(typeof raw.assignmentId === "string"
      ? { assignmentId: raw.assignmentId }
      : {}),
    tagIds: sanitizeTagIds(raw.tagIds, "artifact"),
  };

  const kind = migrateKind(raw);
  if (kind === "diagram") {
    const spec = normalizeDiagramSpec(raw.spec);
    const artifact: DiagramArtifact = {
      kind: "diagram",
      ...base,
      ...(raw.snapshot && typeof raw.snapshot === "object" ? { snapshot: raw.snapshot as DiagramArtifact["snapshot"] } : {}),
      ...(raw.whiteboard && typeof raw.whiteboard === "object" ? { whiteboard: raw.whiteboard as DiagramArtifact["whiteboard"] } : {}),
      spec: spec ?? {
        title,
        layout: "tree",
        detail: 1,
        nodes: [{ id: "root", label: title }],
      },
      ...(raw.source && typeof raw.source === "object"
        ? { source: raw.source as DiagramArtifact["source"] }
        : {}),
    };
    return artifact;
  }
  if (kind === "reading") {
    const artifact: ReadingArtifact = {
      kind: "reading",
      ...base,
      bodyText:
        typeof raw.bodyText === "string"
          ? raw.bodyText
          : typeof raw.bodyHtml === "string"
            ? htmlToPlainText(raw.bodyHtml)
            : base.description,
      ...(typeof raw.bodyHtml === "string" ? { bodyHtml: raw.bodyHtml } : {}),
      ...(typeof raw.sourceDocumentId === "string"
        ? { sourceDocumentId: raw.sourceDocumentId }
        : {}),
      annotations: Array.isArray(raw.annotations)
        ? (raw.annotations as ReadingArtifact["annotations"])
        : [],
    };
    return artifact;
  }
  if (kind === "flashcards") {
    const artifact: FlashcardsArtifact = {
      kind: "flashcards",
      ...base,
      study: raw.study && typeof raw.study === "object" ? raw.study as FlashcardsArtifact["study"] : undefined,
      cards: Array.isArray(raw.cards)
        ? (raw.cards as FlashcardsArtifact["cards"])
        : [],
    };
    return artifact;
  }
  if (kind === "practice-test") {
    const artifact: PracticeTestArtifact = {
      kind: "practice-test",
      ...base,
      attempts: Array.isArray(raw.attempts) ? raw.attempts as PracticeTestArtifact["attempts"] : [],
      items: Array.isArray(raw.items)
        ? (raw.items as PracticeTestArtifact["items"])
        : [],
    };
    return artifact;
  }
  if (kind === "lesson") {
    const artifact: LessonArtifact = {
      kind: "lesson",
      ...base,
      progress: raw.progress && typeof raw.progress === "object" ? raw.progress as LessonArtifact["progress"] : {},
      blocks: Array.isArray(raw.blocks)
        ? (raw.blocks as LessonArtifact["blocks"])
        : [],
    };
    return artifact;
  }
  if (kind === "slides") {
    const artifact: SlidesArtifact = {
      kind: "slides",
      ...base,
      slides: Array.isArray(raw.slides)
        ? (raw.slides as SlidesArtifact["slides"])
        : [],
    };
    return artifact;
  }
  if (kind === "notes") {
    const artifact: NotesArtifact = {
      kind: "notes",
      ...base,
      ...textFields(raw, title),
    };
    return artifact;
  }
  const artifact: DocumentArtifact = {
    kind: "document",
    ...base,
    ...textFields(raw, title),
  };
  return artifact;
}

export function normalizeArtifacts(
  items: unknown,
  courses: Course[],
): Artifact[] {
  if (!Array.isArray(items)) return [];
  return items.map((item) => normalizeArtifact(item, courses));
}

function stampIssue(
  issue: PlannerIssue,
  courses: Course[],
  artifacts: Artifact[],
): PlannerIssue {
  const courseId = courseIdFrom(courses, issue.courseId ?? issue.courseSlug, issue.course);
  const course = courses.find((item) => item.id === courseId);
  const tagIds =
    Array.isArray(issue.tagIds)
      ? sanitizeTagIds(issue.tagIds, "task")
      : tagsFromPlannerLabels(issue.labels);
  let artifactId = issue.artifactId;
  if (!artifactId && issue.artifact) {
    const matches = artifacts.filter(
      (artifact) =>
        artifact.title === issue.artifact || artifact.slug === issue.artifact,
    );
    const inCourse=matches.filter(item=>item.courseId===courseId);
    const hit=inCourse.length===1?inCourse[0]:matches.length===1?matches[0]:undefined;
    if (hit) artifactId = hit.id;
  }
  const children = issue.children?.map((child) =>
    stampIssue(child, courses, artifacts),
  );
  return {
    ...issue,
    id: issue.id || issue.key,
    courseId,
    ...(course && course.id !== UNASSIGNED_COURSE_ID
      ? { courseSlug: course.slug, course: course.code }
      : { courseSlug: UNASSIGNED_COURSE_ID, course: "Unassigned" }),
    tagIds,
    ...(artifactId ? { artifactId,artifact:artifacts.find(item=>item.id===artifactId)?.title||issue.artifact } : {}),
    ...(children?.length ? { children } : {}),
  };
}

export function normalizePlanner(
  items: PlannerIssue[],
  courses: Course[],
  artifacts: Artifact[],
): PlannerIssue[] {
  return items.map((issue) => stampIssue(issue, courses, artifacts));
}

export function normalizeCalendar(
  items: StoredCalendarEvent[],
  courses: Course[],
): StoredCalendarEvent[] {
  return items.map((event) => {
    const courseId = courseIdFrom(courses, event.courseSlug ?? event.courseId);
    const course = courses.find((item) => item.id === courseId);
    const kind = event.kind;
    return {
      ...event,
      courseId,
      courseSlug: course?.slug ?? UNASSIGNED_COURSE_ID,
      timing:
        event.timing ??
        (kind === "deadline" || kind === "exam" ? "deadline" : "meeting"),
      tagIds:
        Array.isArray(event.tagIds)
          ? sanitizeTagIds(event.tagIds, "event")
          : tagsFromCalendarKind(kind),
    };
  });
}

function parseRef(value: unknown): ObjectRef | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  if (typeof rec.kind !== "string" || !isLinkableKind(rec.kind)) return null;
  if (typeof rec.id !== "string" || !rec.id.trim()) return null;
  return { kind: rec.kind, id: rec.id.trim() };
}

export function normalizeLinks(items: unknown): ObjectLink[] {
  if (!Array.isArray(items)) return [];
  const out: ObjectLink[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const rec = asRecord(item);
    const a = parseRef(rec.a);
    const b = parseRef(rec.b);
    if (!a || !b || refsEqual(a, b)) continue;
    const [left, right] = canonLinkPair(a, b);
    const key = `${left.kind}:${left.id}::${right.kind}:${right.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id:
        typeof rec.id === "string" && rec.id.trim()
          ? rec.id
          : `lnk_${out.length + 1}`,
      a: left,
      b: right,
    });
  }
  return out;
}

export function normalizeMemory(value: unknown): MemoryState {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptyMemory();
  }
  const rec = value as Record<string, unknown>;
  return {
    summary: typeof rec.summary === "string" ? rec.summary : "",
    events: Array.isArray(rec.events)
      ? (rec.events as MemoryState["events"])
      : [],
    copyFlags: Array.isArray(rec.copyFlags)
      ? (rec.copyFlags as MemoryState["copyFlags"])
      : [],
  };
}

export function artifactBodyText(artifact: Artifact): string {
  if (artifact.kind === "document" || artifact.kind === "notes") {
    return htmlToPlainText(resolveBodyHtml(artifact));
  }
  if (artifact.kind === "reading") {
    return artifact.bodyText || htmlToPlainText(artifact.bodyHtml ?? "");
  }
  if (artifact.kind === "diagram") {
    if (artifact.whiteboard) return artifact.whiteboard.pages.map(page => page.name + "\n" + page.elements.filter(element => !element.isDeleted && element.type === "text").map(element => "text" in element ? element.text : "").join("\n")).join("\n\n");
    if (artifact.snapshot) {
      const richText = (value: unknown): string => {
        if (!value || typeof value !== "object") return "";
        const record = value as Record<string, unknown>;
        return typeof record.text === "string" ? record.text : Array.isArray(record.content) ? record.content.map(richText).join(" ") : "";
      };
      return Object.values(artifact.snapshot.store).filter(record => record.typeName === "shape").map(record => {
        const props = (record as unknown as { props: Record<string, unknown> }).props;
        return richText(props.richText) || (typeof props.text === "string" ? props.text : "");
      }).filter(Boolean).join("\n");
    }
    return artifact.spec.nodes.map((node) => node.label).join("\n");
  }
  if (artifact.kind === "flashcards") {
    return artifact.cards
      .map((card) => `${card.front}\n${card.back}`)
      .join("\n\n");
  }
  if (artifact.kind === "practice-test") {
    return artifact.items.map((item) => item.prompt).join("\n");
  }
  if (artifact.kind === "lesson") {
    return artifact.blocks
      .map((block) => block.text || htmlToPlainText(block.html || "") || block.prompt || "")
      .join("\n");
  }
  return artifact.slides.map((slide) => `${slide.title}\n${slide.elements ? slide.elements.map(e => e.text || "").join("\n") : htmlToPlainText(slide.bodyHtml)}\n${slide.notes || ""}`).join("\n");
}

export function allIssueKeys(planner: PlannerIssue[]) {
  return planner.flatMap((issue) => flatten(issue).map((node) => node.key));
}
