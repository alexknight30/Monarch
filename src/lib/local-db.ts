/**
 * Local file-backed store, one folder per admin view.
 *
 *   data/mock-one/{planner,artifacts,courses,assignments,calendar,documents,ingestRuns}.json
 *   data/alex-knight/...
 *   data/alex-seager/...
 *   data/test-one/...
 *
 * Reads legacy collections until the first mutation atomically writes workspace.json.
 * Original collection files are preserved; subsequent reads use the workspace snapshot.
 * Missing legacy collections fall back to mocks (mock-one) or empty arrays.
 */

import { promises as fs } from "fs";
import path from "path";
import type { Assignment } from "@/lib/assignments";
import type { StoredCalendarEvent } from "@/lib/calendar-events";
import { formatDisplayDate } from "@/lib/calendar-events";
import { validateStoredDate } from "./stored-date";
import { normalizeDiagramSpec } from "@/lib/diagram";
import { emptyDocumentContent } from "@/lib/documents";
import {
  ADMIN_USERS,
  ADMIN_USER_FIELDS,
  ARTIFACTS,
  COURSES,
  deriveSchedule,
  isArtifactKind,
  isTextArtifact,
  type AdminUser,
  type AdminUserField,
  type Artifact,
  type ArtifactKind,
  type Course,
  type CourseMeeting,
  type CourseOfficeHour,
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
  emptyMemory,
  type MemoryState,
  type ObjectLink,
  type ObjectRef,
  type TagId,
} from "@/lib/objects";
import {
  appendCopyFlag,
  appendMemoryEvent,
} from "@/lib/objects/memory";
import {
  ensureCourses,
  normalizeArtifacts,
  normalizeCalendar,
  normalizeLinks,
  normalizeMemory,
  normalizePlanner,
} from "@/lib/objects/normalize";
import { canonLinkPair, newObjectId, refsEqual } from "@/lib/objects/types";
import { UNASSIGNED_COURSE_ID } from "@/lib/objects/unassigned";
import { sanitizeTagIds, tagsFromPlannerLabels } from "@/lib/objects/tags";
import { linksFor } from "@/lib/objects/summaries";
import {
  PLANNER_ISSUES,
  findIssue,
  flatten,
  mapIssue,
  removeIssue,
  type PlannerIssue,
  type PlannerLabel,
  type PlannerPriority,
  type PlannerStatus,
} from "@/lib/planner";
import type {
  IngestRun,
  Proposal,
  SourceDocument,
} from "@/lib/source-documents";
import { expandRecurrence, resolveRecurrence } from "@/lib/syllabus/materialize";
import { syncReviewedAssignments, validateReviewedProposal } from "@/lib/syllabus/review";
import { VIEWS, type ViewId } from "@/lib/views";
import { readWorkspace, withWorkspaceTransaction, writeWorkspaceCollections } from "@/lib/workspace-store";
import { emptyProfile, type StudentProfile } from "./profile";
import type { ChatThread } from "./chat-history";
import type { TrashedArtifact } from "./artifact-lifecycle";
import { checkArtifactBase } from "./artifact-conflict";

export type ViewStore = {
  planner: PlannerIssue[];
  artifacts: Artifact[];
  courses: Course[];
  assignments: Assignment[];
  calendar: StoredCalendarEvent[];
  documents: SourceDocument[];
  ingestRuns: IngestRun[];
  links: ObjectLink[];
  memory: MemoryState;
  profile: StudentProfile;
  chats: ChatThread[];
  trash: TrashedArtifact[];
};

const DATA_ROOT = process.env.MONARCH_DATA_ROOT || path.join(process.cwd(), "data");

const VIEW_IDS = new Set<string>(VIEWS.map((v) => v.id));

export function isViewId(value: string): value is ViewId {
  return VIEW_IDS.has(value);
}

function viewDir(viewId: ViewId) {
  return path.join(/*turbopackIgnore: true*/ DATA_ROOT, viewId);
}

function filePath(viewId: ViewId, name: keyof ViewStore) {
  return path.join(viewDir(viewId), `${name}.json`);
}

function emptyExtras(): Pick<
  ViewStore,
  "assignments" | "calendar" | "documents" | "ingestRuns" | "links" | "memory" | "profile" | "chats" | "trash"
> {
  return {
    assignments: [],
    calendar: [],
    documents: [],
    ingestRuns: [],
    links: [],
    memory: emptyMemory(),
    profile: emptyProfile(),
    chats: [],
    trash: [],
  };
}

function seedFor(viewId: ViewId): ViewStore {
  if (viewId === "mock-one") {
    return {
      planner: structuredClone(PLANNER_ISSUES),
      artifacts: structuredClone(ARTIFACTS),
      courses: structuredClone(COURSES),
      ...emptyExtras(),
    };
  }
  return { planner: [], artifacts: [], courses: [], ...emptyExtras() };
}

async function ensureFile(viewId: ViewId, name: keyof ViewStore) {
  const dir = viewDir(viewId);
  await fs.mkdir(dir, { recursive: true });
  const target = filePath(viewId, name);
  try {
    await fs.access(target);
  } catch {
    const seed = seedFor(viewId)[name];
    await fs.writeFile(target, `${JSON.stringify(seed, null, 2)}\n`, "utf8");
  }
}

export async function ensureViewStore(viewId: ViewId) {
  await ensureFile(viewId, "planner");
  await ensureFile(viewId, "artifacts");
  await ensureFile(viewId, "courses");
  await ensureFile(viewId, "assignments");
  await ensureFile(viewId, "calendar");
  await ensureFile(viewId, "documents");
  await ensureFile(viewId, "ingestRuns");
  await ensureFile(viewId, "links");
  await ensureFile(viewId, "memory");
}

async function readCollection<K extends keyof ViewStore>(
  viewId: ViewId,
  name: K,
): Promise<ViewStore[K]> {
  return (await readWorkspace(viewId, seedFor(viewId)))[name];
}

async function writeCollection<K extends keyof ViewStore>(
  viewId: ViewId,
  name: K,
  data: ViewStore[K],
) {
  await writeWorkspaceCollections(viewId, seedFor(viewId), { [name]: data });
}

export async function readViewStore(viewId: ViewId): Promise<ViewStore> {
  const { planner: plannerRaw, artifacts: artifactsRaw, courses: coursesRaw,
    assignments, calendar: calendarRaw, documents, ingestRuns, links: linksRaw, memory: memoryRaw, profile, chats, trash,
  } = await readWorkspace(viewId, seedFor(viewId));
  const courses = ensureCourses(coursesRaw);
  const artifacts = normalizeArtifacts(artifactsRaw, courses);
  const planner = normalizePlanner(plannerRaw, courses, artifacts);
  const calendar = normalizeCalendar(calendarRaw, courses);
  const links = normalizeLinks(linksRaw);
  const memory = normalizeMemory(memoryRaw);
  return {
    planner,
    profile: { ...emptyProfile(), ...profile },
    chats: chats ?? [],
    trash: trash ?? [],
    artifacts,
    courses,
    assignments,
    calendar,
    documents,
    ingestRuns,
    links,
    memory,
  };
}

/* ---------------------------------------------------------------- planner --- */

function nextIssueKey(issues: PlannerIssue[]): string {
  let max = 0;
  for (const root of issues) {
    for (const issue of flatten(root)) {
      const match = /^LMS-(\d+)$/.exec(issue.key);
      if (match) max = Math.max(max, Number(match[1]));
    }
  }
  return `LMS-${max + 1}`;
}

export type CreatePlannerIssueInput = {
  title: string;
  status?: PlannerStatus;
  label?: PlannerLabel | null;
  tagIds?: TagId[];
  course?: string | null;
  courseId?: string | null;
  artifact?: string | null;
  artifactId?: string | null;
  /** Assignment name, e.g. "Problem Set 7". */
  assignment?: string | null;
  assignmentId?: string | null;
  due?: string | null;
  dueAt?: string | null;
  description?: string;
};

async function createPlannerIssueImpl(
  viewId: ViewId,
  input: CreatePlannerIssueInput,
): Promise<PlannerIssue> {
  const title = input.title.trim();
  if (!title) throw new Error("Title is required.");

  const store = await readViewStore(viewId);
  const description = input.description?.trim();
  const course = input.course?.trim() || undefined;
  const artifact = input.artifact?.trim() || undefined;
  const assignment = input.assignment?.trim() || undefined;
  const due = input.due?.trim() || undefined;
  const dueAt = validateStoredDate(input.dueAt);
  const courseId =
    input.courseId?.trim() ||
    store.courses.find((item) => item.code === course || item.slug === course)?.id ||
    UNASSIGNED_COURSE_ID;
  const selectedCourse = store.courses.find(item => item.id === courseId);
  if (!selectedCourse) throw new Error("Choose an existing course.");
  const selectedArtifact=input.artifactId?store.artifacts.find(item=>item.id===input.artifactId):undefined;
  const selectedAssignment=input.assignmentId?store.assignments.find(item=>item.id===input.assignmentId):undefined;
  if(input.artifactId&&!selectedArtifact)throw new Error("Choose an existing artifact.");
  if(input.assignmentId&&!selectedAssignment)throw new Error("Choose an existing assignment.");
  const key = nextIssueKey(store.planner);
  const issue: PlannerIssue = {
    id: key,
    key,
    title,
    status: input.status ?? "todo",
    courseId,
    tagIds: Array.isArray(input.tagIds)
      ? sanitizeTagIds(input.tagIds, "task")
      : tagsFromPlannerLabels(input.label ? [input.label] : []),
    ...(description ? { description } : {}),
    ...(input.label ? { labels: [input.label] } : {}),
    course: selectedCourse.code,
    courseSlug: selectedCourse.slug,
    ...(artifact ? { artifact } : {}),
    ...(selectedArtifact ? { artifactId:selectedArtifact.id,artifact:selectedArtifact.title } : {}),
    ...(assignment ? { assignment } : {}),
    ...(selectedAssignment ? { assignmentId:selectedAssignment.id,assignment:selectedAssignment.title } : {}),
    ...(due ? { due } : {}),
    ...(dueAt ? { dueAt, due: formatDisplayDate(dueAt) } : {}),
  };

  store.planner.unshift(issue);
  await writeCollection(viewId, "planner", store.planner);
  return issue;
}

export async function listPlanner(viewId: ViewId) {
  return (await readViewStore(viewId)).planner;
}

export async function getPlannerIssue(viewId: ViewId, key: string) {
  const planner = (await readViewStore(viewId)).planner;
  return findIssue(planner, key);
}

export type UpdatePlannerIssueInput = {
  title?: string;
  description?: string | null;
  status?: PlannerStatus;
  priority?: PlannerPriority;
  labels?: PlannerLabel[];
  tagIds?: TagId[];
  course?: string | null;
  courseId?: string | null;
  artifact?: string | null;
  artifactId?: string | null;
  assignment?: string | null;
  assignmentId?: string | null;
  due?: string | null;
  dueAt?: string | null;
};

function applyOptionalString(
  updated: PlannerIssue,
  key: "course" | "artifact" | "assignment" | "due" | "description",
  value: string | null | undefined,
) {
  if (value === undefined) return;
  const trimmed = value?.trim();
  if (trimmed) updated[key] = trimmed;
  else delete updated[key];
}

async function updatePlannerIssueImpl(
  viewId: ViewId,
  key: string,
  input: UpdatePlannerIssueInput,
): Promise<PlannerIssue> {
  const store = await readViewStore(viewId);
  const planner = store.planner;
  const existing = findIssue(planner, key);
  if (!existing) throw new Error("Task not found.");

  if (input.title !== undefined && !input.title.trim()) {
    throw new Error("Title is required.");
  }

  const next = mapIssue(planner, key, (issue) => {
    const updated: PlannerIssue = { ...issue };
    if (input.title !== undefined) updated.title = input.title.trim();
    applyOptionalString(updated, "description", input.description);
    if (input.status !== undefined) updated.status = input.status;
    if (input.priority !== undefined) {
      if (input.priority === "none") delete updated.priority;
      else updated.priority = input.priority;
    }
    if (input.labels !== undefined) {
      if (input.labels.length) updated.labels = input.labels;
      else delete updated.labels;
    }
    applyOptionalString(updated, "course", input.course);
    applyOptionalString(updated, "artifact", input.artifact);
    applyOptionalString(updated, "assignment", input.assignment);
    applyOptionalString(updated, "due", input.due);
    if (input.dueAt !== undefined) {
      const dueAt = validateStoredDate(input.dueAt);
      if (dueAt) { updated.dueAt = dueAt; updated.due = formatDisplayDate(dueAt); }
      else { delete updated.dueAt; delete updated.due; }
    } else if (input.due !== undefined) {
      // Legacy callers can still set a display label, but never retain a conflicting date.
      delete updated.dueAt;
    }
    if (input.tagIds !== undefined) {
      updated.tagIds = sanitizeTagIds(input.tagIds, "task");
    }
    if (input.courseId !== undefined || input.course !== undefined) {
      const requested = input.courseId !== undefined ? input.courseId : input.course;
      const course = store.courses.find(c => c.id === (requested || UNASSIGNED_COURSE_ID) || c.slug === requested || c.code === requested);
      if (!course) throw new Error("Choose an existing course.");
      updated.courseId = course.id; updated.courseSlug = course.slug; updated.course = course.code;
    }
    if (input.artifactId !== undefined) {
      const artifact=input.artifactId?store.artifacts.find(item=>item.id===input.artifactId):undefined;
      if(input.artifactId&&!artifact)throw new Error("Choose an existing artifact.");
      if(artifact){updated.artifactId=artifact.id;updated.artifact=artifact.title;}
      else {delete updated.artifactId;delete updated.artifact;}
    }else if(input.artifact!==undefined){
      delete updated.artifactId;
      const matches=store.artifacts.filter(item=>item.title===input.artifact);
      if(matches.length===1)updated.artifactId=matches[0].id;
    }
    if(input.assignmentId!==undefined){
      const assignment=input.assignmentId?store.assignments.find(item=>item.id===input.assignmentId):undefined;
      if(input.assignmentId&&!assignment)throw new Error("Choose an existing assignment.");
      if(assignment){updated.assignmentId=assignment.id;updated.assignment=assignment.title;}
      else {delete updated.assignmentId;delete updated.assignment;}
    }else if(input.assignment!==undefined){
      delete updated.assignmentId;
      const matches=store.assignments.filter(item=>item.title===input.assignment&&item.courseSlug===updated.courseSlug);
      if(matches.length===1)updated.assignmentId=matches[0].id;
    }
    return updated;
  });

  await writeCollection(viewId, "planner", next);
  const saved = findIssue(next, key);
  if (!saved) throw new Error("Task not found after update.");
  return saved;
}

export type CreateSubtaskInput = {
  title: string;
  status?: PlannerStatus;
  description?: string;
};

async function deletePlannerIssueImpl(
  viewId: ViewId,
  key: string,
): Promise<PlannerIssue> {
  const planner = await readCollection(viewId, "planner");
  const existing = findIssue(planner, key);
  if (!existing) throw new Error("Task not found.");

  await writeCollection(viewId, "planner", removeIssue(planner, key));
  for (const removed of flatten(existing)) {
    await dropLinksFor(viewId, { kind: "task", id: removed.id || removed.key });
  }
  return existing;
}

async function createSubtaskImpl(
  viewId: ViewId,
  parentKey: string,
  input: CreateSubtaskInput,
): Promise<PlannerIssue> {
  const title = input.title.trim();
  if (!title) throw new Error("Title is required.");

  const planner = await readCollection(viewId, "planner");
  const parent = findIssue(planner, parentKey);
  if (!parent) throw new Error("Parent task not found.");

  const description = input.description?.trim();
  const key = nextIssueKey(planner);
  const child: PlannerIssue = {
    id: key,
    key,
    title,
    status: input.status ?? "todo",
    courseId: parent.courseId ?? UNASSIGNED_COURSE_ID,
    tagIds: parent.tagIds ?? [],
    ...(description ? { description } : {}),
    ...(parent.course ? { course: parent.course } : {}),
    ...(parent.courseSlug ? { courseSlug: parent.courseSlug } : {}),
  };

  const next = mapIssue(planner, parentKey, (issue) => ({
    ...issue,
    children: [...(issue.children ?? []), child],
  }));

  await writeCollection(viewId, "planner", next);
  return child;
}

/* -------------------------------------------------------------- artifacts --- */

function slugify(title: string) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return base || "untitled";
}

function uniqueSlug(existing: Artifact[], title: string) {
  const base = slugify(title);
  if (!existing.some((a) => a.slug === base)) return base;
  let n = 2;
  while (existing.some((a) => a.slug === `${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

function parseArtifactKind(value: unknown): ArtifactKind {
  if (typeof value === "string" && isArtifactKind(value)) return value;
  if (value === "paper") return "reading";
  return "document";
}

export type CreateArtifactInput = {
  title: string;
  kind?: ArtifactKind;
  description?: string;
  createdBy?: string;
  courseId?: string;
  tagIds?: TagId[];
  /** Required when kind is "diagram". */
  spec?: unknown;
  source?: { threadId?: string; threadTitle?: string };
  bodyText?: string;
  bodyHtml?: string;
};

function artifactShell(
  existing: Artifact[],
  input: CreateArtifactInput,
): Omit<Artifact, "kind"> & { kind?: never } {
  const title = input.title.trim();
  const slug = uniqueSlug(existing, title);
  return {
    id: slug,
    slug,
    title,
    description: input.description?.trim() || "No description yet.",
    createdBy: input.createdBy?.trim() || "You",
    updated: "Just now",
    visibility: "Private",
    instructions: null,
    context: [],
    scheduled: [],
    chats: [],
    courseId: input.courseId?.trim() || UNASSIGNED_COURSE_ID,
    tagIds: sanitizeTagIds(input.tagIds, "artifact"),
  };
}

async function createArtifactImpl(
  viewId: ViewId,
  input: CreateArtifactInput,
): Promise<Artifact> {
  const title = input.title.trim();
  if (!title) throw new Error("Title is required.");

  const store = await readViewStore(viewId);
  const artifacts = store.artifacts;
  const base = artifactShell([...artifacts, ...store.trash.map(item=>item.artifact)], input);
  const kind = parseArtifactKind(input.kind);

  let artifact: Artifact;
  if (kind === "diagram") {
    const spec = input.spec ? normalizeDiagramSpec(input.spec) : { title, layout: "tree" as const, detail: 1 as const, nodes: [{ id: "root", label: title }] };
    if (!spec) throw new Error("A diagram artifact needs a valid spec.");
    artifact = {
      ...base,
      kind: "diagram",
      description: input.description?.trim() || spec.caption || base.description,
      spec,
      ...(input.source?.threadId || input.source?.threadTitle
        ? { source: input.source }
        : {}),
    } satisfies DiagramArtifact;
  } else if (kind === "notes") {
    artifact = {
      ...base,
      kind: "notes",
      ...emptyDocumentContent(title),
    } satisfies NotesArtifact;
  } else if (kind === "reading") {
    artifact = {
      ...base,
      kind: "reading",
      bodyText: input.bodyText?.trim() || "",
      ...(input.bodyHtml ? { bodyHtml: input.bodyHtml } : {}),
      annotations: [],
    } satisfies ReadingArtifact;
  } else if (kind === "flashcards") {
    artifact = {
      ...base,
      kind: "flashcards",
      cards: [],
    } satisfies FlashcardsArtifact;
  } else if (kind === "practice-test") {
    artifact = {
      ...base,
      kind: "practice-test",
      items: [],
    } satisfies PracticeTestArtifact;
  } else if (kind === "lesson") {
    artifact = {
      ...base,
      kind: "lesson",
      blocks: [],
    } satisfies LessonArtifact;
  } else if (kind === "slides") {
    artifact = {
      ...base,
      kind: "slides",
      slides: [{ id: "s1", title, bodyHtml: "<p></p>" }],
    } satisfies SlidesArtifact;
  } else {
    artifact = {
      ...base,
      kind: "document",
      ...emptyDocumentContent(title),
    } satisfies DocumentArtifact;
  }

  artifacts.unshift(artifact);
  await writeCollection(viewId, "artifacts", artifacts);
  return artifact;
}

export async function listArtifacts(viewId: ViewId) {
  return readCollection(viewId, "artifacts");
}

export async function getArtifact(
  viewId: ViewId,
  slug: string,
): Promise<Artifact | null> {
  const artifacts = await readCollection(viewId, "artifacts");
  return (
    artifacts.find((a) => a.slug === slug || a.id === slug) ?? null
  );
}

/**
 * Replace a diagram artifact's spec. Backs the detail control on the artifact
 * page — the reason a diagram is stored as a spec rather than an image is so
 * this is a normal edit and not a re-export.
 */
async function updateDiagramArtifactImpl(
  viewId: ViewId,
  slug: string,
  input: { spec: unknown },
): Promise<Artifact> {
  const spec = normalizeDiagramSpec(input.spec);
  if (!spec) throw new Error("A diagram artifact needs a valid spec.");

  const artifacts = await readCollection(viewId, "artifacts");
  const index = artifacts.findIndex((a) => a.slug === slug || a.id === slug);
  if (index < 0) throw new Error(`Artifact not found: ${slug}`);

  const current = artifacts[index];
  if (current.kind !== "diagram") {
    throw new Error("Only diagram artifacts can be updated this way.");
  }
  if (current.snapshot || current.whiteboard) {
    throw new Error("This diagram has whiteboard edits. Edit it in the whiteboard, or save a new diagram to keep your drawing intact.");
  }

  const next: DiagramArtifact = { ...current, spec, updated: "Just now" };
  artifacts[index] = next;
  await writeCollection(viewId, "artifacts", artifacts);
  return next;
}

export type UpdateDocumentArtifactInput = {
  bodyHtml?: string;
  title?: string;
  shortTitle?: string;
  savedAt?: string;
  thread?: DocumentArtifact["thread"];
  status?: DocumentArtifact["status"];
};

async function updateDocumentArtifactImpl(
  viewId: ViewId,
  slug: string,
  input: UpdateDocumentArtifactInput,
  base?: Record<string, unknown>,
): Promise<Artifact> {
  const artifacts = await readCollection(viewId, "artifacts");
  const index = artifacts.findIndex((a) => a.slug === slug || a.id === slug);
  if (index < 0) throw new Error(`Artifact not found: ${slug}`);

  const current = artifacts[index];
  if (!isTextArtifact(current)) {
    throw new Error("Only document and notes artifacts can be updated this way.");
  }
  checkArtifactBase(current, { ...input }, base);

  const next = {
    ...current,
    ...(input.title !== undefined ? { title: input.title.trim() || current.title } : {}),
    ...(input.shortTitle !== undefined
      ? { shortTitle: input.shortTitle.trim() || current.shortTitle }
      : {}),
    ...(input.bodyHtml !== undefined ? { bodyHtml: input.bodyHtml } : {}),
    ...(input.savedAt !== undefined ? { savedAt: input.savedAt } : {}),
    ...(input.thread !== undefined ? { thread: input.thread } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    updated: "Just now",
  };

  artifacts[index] = next;
  await writeCollection(viewId, "artifacts", artifacts);
  return next;
}

/* ---------------------------------------------------------------- courses --- */

export type CreateCourseInput = {
  code: string;
  title: string;
  description?: string;
  instructor?: string;
  schedule?: string;
  term?: string;
  termStartsAt?: string;
  termEndsAt?: string;
  instructorEmail?: string;
  instructorOffice?: string;
  meetings?: CourseMeeting[];
  officeHours?: CourseOfficeHour[];
  grading?: Course["grading"];
  policies?: Course["policies"];
  sourceDocumentId?: string;
  needsReview?: string[];
};

async function createCourseImpl(
  viewId: ViewId,
  input: CreateCourseInput,
): Promise<Course> {
  const code = input.code.trim();
  const title = input.title.trim();
  if (!code || !title) throw new Error("Code and title are required.");

  const courses = await readCollection(viewId, "courses");
  const slugBase = slugify(code);
  let slug = slugBase;
  let n = 2;
  while (courses.some((c) => c.slug === slug)) {
    slug = `${slugBase}-${n}`;
    n += 1;
  }

  const meetings = input.meetings;
  const schedule =
    input.schedule?.trim() ||
    (meetings?.length ? deriveSchedule(meetings) : "Schedule TBD");

  const course: Course = {
    id: slug,
    slug,
    code,
    title,
    description: input.description?.trim() || "No description yet.",
    instructor: input.instructor?.trim() || "TBD",
    schedule,
    term: input.term?.trim() || "This term",
    ...(input.termStartsAt ? { termStartsAt: input.termStartsAt } : {}),
    ...(input.termEndsAt ? { termEndsAt: input.termEndsAt } : {}),
    ...(input.instructorEmail ? { instructorEmail: input.instructorEmail } : {}),
    ...(input.instructorOffice ? { instructorOffice: input.instructorOffice } : {}),
    ...(meetings?.length ? { meetings } : {}),
    ...(input.officeHours?.length ? { officeHours: input.officeHours } : {}),
    ...(input.grading?.length ? { grading: input.grading } : {}),
    ...(input.policies ? { policies: input.policies } : {}),
    ...(input.sourceDocumentId ? { sourceDocumentId: input.sourceDocumentId } : {}),
    ...(input.needsReview?.length ? { needsReview: input.needsReview } : {}),
  };

  courses.unshift(course);
  await writeCollection(viewId, "courses", courses);
  return course;
}

export async function listCourses(viewId: ViewId) {
  return readCollection(viewId, "courses");
}

export async function listAssignments(viewId: ViewId) {
  return readCollection(viewId, "assignments");
}

export async function listCalendarEvents(viewId: ViewId) {
  return readCollection(viewId, "calendar");
}

export async function listSourceDocuments(viewId: ViewId) {
  return readCollection(viewId, "documents");
}

export async function getSourceDocument(viewId: ViewId, id: string) {
  const documents = await listSourceDocuments(viewId);
  return documents.find((document) => document.id === id) ?? null;
}

async function createSourceDocumentImpl(
  viewId: ViewId,
  input: Omit<SourceDocument, "id" | "uploadedAt" | "status" | "kind"> & {
    kind?: SourceDocument["kind"];
    status?: SourceDocument["status"];
  },
): Promise<SourceDocument> {
  const documents = await readCollection(viewId, "documents");
  const id = nextPrefixed(documents.map((item) => item.id), "DOC");
  const document: SourceDocument = {
    id,
    filename: input.filename,
    mime: input.mime,
    sizeBytes: input.sizeBytes,
    storedPath: input.storedPath,
    uploadedAt: new Date().toISOString(),
    kind: input.kind ?? "syllabus",
    status: input.status ?? "uploaded",
    ...(input.fileApiId ? { fileApiId: input.fileApiId } : {}),
    ...(input.courseSlug ? { courseSlug: input.courseSlug } : {}),
  };
  documents.unshift(document);
  await writeCollection(viewId, "documents", documents);
  return document;
}

async function updateSourceDocumentImpl(
  viewId: ViewId,
  id: string,
  patch: Partial<SourceDocument>,
): Promise<SourceDocument> {
  const documents = await readCollection(viewId, "documents");
  const index = documents.findIndex((document) => document.id === id);
  if (index === -1) throw new Error("Document not found.");
  const next = { ...documents[index], ...patch };
  documents[index] = next;
  await writeCollection(viewId, "documents", documents);
  return next;
}

async function createIngestRunImpl(
  viewId: ViewId,
  documentId: string,
): Promise<IngestRun> {
  const runs = await readCollection(viewId, "ingestRuns");
  const run: IngestRun = {
    id: nextPrefixed(runs.map((item) => item.id), "RUN"),
    documentId,
    status: "running",
    stages: [],
  };
  runs.unshift(run);
  await writeCollection(viewId, "ingestRuns", runs);
  return run;
}

export async function getIngestRun(viewId: ViewId, id: string) {
  const runs = await readCollection(viewId, "ingestRuns");
  return runs.find((run) => run.id === id) ?? null;
}

async function updateIngestRunImpl(
  viewId: ViewId,
  id: string,
  patch: Partial<IngestRun>,
): Promise<IngestRun> {
  const runs = await readCollection(viewId, "ingestRuns");
  const index = runs.findIndex((run) => run.id === id);
  if (index === -1) throw new Error("Ingest run not found.");
  const next = { ...runs[index], ...patch };
  runs[index] = next;
  await writeCollection(viewId, "ingestRuns", runs);
  return next;
}

export function uploadsDir(viewId: ViewId) {
  return path.join(viewDir(viewId), "uploads");
}

function nextPrefixed(ids: string[], prefix: string) {
  let max = 0;
  const pattern = new RegExp(`^${prefix}-(\\d+)$`);
  for (const id of ids) {
    const match = pattern.exec(id);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `${prefix}-${max + 1}`;
}

function remintPlannerForest(
  tasks: PlannerIssue[],
  existing: PlannerIssue[],
): PlannerIssue[] {
  let cursor = existing;
  const assign = (issue: PlannerIssue): PlannerIssue => {
    const key = nextIssueKey(cursor);
    const stub: PlannerIssue = { ...issue, key, id: key };
    delete stub.children;
    cursor = [...cursor, stub];
    const children = (issue.children ?? []).map(assign);
    return children.length ? { ...stub, children } : stub;
  };
  return tasks.map(assign);
}

async function applyIngestProposalImpl(
  viewId: ViewId,
  proposal: Proposal,
): Promise<{ course: Course }> {
  const store = await readViewStore(viewId);
  const previousRun = store.ingestRuns.find((run) => run.id === proposal.runId);
  if (!previousRun) throw new Error("Ingest run not found.");
  if (previousRun.documentId !== proposal.documentId) throw new Error("This proposal belongs to a different source document.");
  if (previousRun.status === "applied") {
    const existing = store.courses.find((course) => course.sourceDocumentId === proposal.documentId);
    if (existing) return { course: existing };
    throw new Error("This import has already been applied.");
  }
  if (previousRun.status !== "proposed") throw new Error("Wait for the syllabus proposal to finish before applying it.");
  if (!Array.isArray(proposal.assignments) || !Array.isArray(proposal.tasks) || !Array.isArray(proposal.calendarEvents)) throw new Error("The syllabus proposal is incomplete.");
  proposal = syncReviewedAssignments(proposal);
  validateReviewedProposal(proposal);

  const slugBase = slugify(proposal.course.code || proposal.course.slug);
  let slug = slugBase;
  let n = 2;
  while (store.courses.some((course) => course.slug === slug)) {
    slug = `${slugBase}-${n}`;
    n += 1;
  }

  const course: Course = {
    ...proposal.course,
    id: slug,
    slug,
    schedule:
      proposal.course.schedule ||
      deriveSchedule(proposal.course.meetings) ||
      "Schedule TBD",
  };

  const assignmentIds = new Map<string, string>();
  const usedAssignmentIds = store.assignments.map((assignment) => assignment.id);
  const assignments = proposal.assignments.map((assignment) => {
    const id = nextPrefixed(usedAssignmentIds, "ASG");
    usedAssignmentIds.push(id);
    assignmentIds.set(assignment.id, id);
    return { ...assignment, id, courseSlug: slug };
  });

  let calendar = proposal.calendarEvents.map((event) => ({
    ...event,
    id: `EVT-${crypto.randomUUID()}`,
    ...(event.assignmentId ? { assignmentId: assignmentIds.get(event.assignmentId) } : {}),
    courseSlug: slug,
    courseId: slug,
  }));

  const recurrence = resolveRecurrence(proposal.recurrence, course);
  if (course.termStartsAt && course.termEndsAt && recurrence.length > 0) {
    calendar = [
      ...expandRecurrence(
        recurrence,
        slug,
        course.termStartsAt,
        course.termEndsAt,
      ),
      ...calendar.filter((event) => !event.seriesId),
    ];
  }

  const mapTask = (task: PlannerIssue): PlannerIssue => ({
      ...task,
      id: task.id || task.key,
      course: course.code,
      courseSlug: slug,
      courseId: slug,
      ...(task.assignmentId ? { assignmentId: assignmentIds.get(task.assignmentId) } : {}),
      ...(task.children ? { children: task.children.map(mapTask) } : {}),
    });
  const tasks = remintPlannerForest(
    proposal.tasks.map(mapTask),
    store.planner,
  );

  store.courses.unshift(course);
  store.assignments = [...assignments, ...store.assignments];
  store.calendar = [...calendar, ...store.calendar];
  store.planner = [...tasks, ...store.planner];

  const documents = store.documents.map((document) =>
    document.id === proposal.documentId
      ? { ...document, status: "applied" as const, courseSlug: slug }
      : document,
  );
  const ingestRuns = store.ingestRuns.map((run) =>
    run.id === proposal.runId
      ? {
          ...run,
          status: "applied" as const,
          proposal: { ...proposal, course },
          appliedAt: new Date().toISOString(),
        }
      : run,
  );

  await writeWorkspaceCollections(viewId, seedFor(viewId), { ...store, documents, ingestRuns });

  return { course };
}

async function patchArtifactImpl(
  viewId: ViewId,
  slug: string,
  patch: Record<string, unknown>,
  base?: Record<string, unknown>,
): Promise<Artifact> {
  const store = await readViewStore(viewId);
  const index = store.artifacts.findIndex((a) => a.slug === slug || a.id === slug);
  if (index < 0) throw new Error(`Artifact not found: ${slug}`);
  const current = store.artifacts[index];
  checkArtifactBase(current,patch,base);
  if (patch.courseId !== undefined && !store.courses.some(c => c.id === patch.courseId)) throw new Error("Course not found.");
  if (patch.sourceDocumentId !== undefined && !store.documents.some(d => d.id === patch.sourceDocumentId)) throw new Error("Source file not found.");
  const merged = { ...current, ...patch, id: current.id, slug: current.slug, kind: current.kind,
    updated: "Just now", updatedAt: new Date().toISOString(), revision: (current.revision ?? 0) + 1 };
  const next = normalizeArtifacts([merged], store.courses)[0];
  store.artifacts[index] = next;
  await writeCollection(viewId, "artifacts", store.artifacts);
  return next;
}

export async function listLinks(viewId: ViewId) {
  const store = await readViewStore(viewId);
  return store.links;
}

export async function listLinksFor(viewId: ViewId, ref: ObjectRef) {
  const links = await listLinks(viewId);
  return linksFor(links, ref);
}

async function dropLinksFor(viewId: ViewId, ref: ObjectRef) {
  const links = await readCollection(viewId, "links");
  const next = links.filter(
    (link) => !refsEqual(link.a, ref) && !refsEqual(link.b, ref),
  );
  if (next.length !== links.length) {
    await writeCollection(viewId, "links", next);
  }
}

async function linkObjectsImpl(
  viewId: ViewId,
  a: ObjectRef,
  b: ObjectRef,
): Promise<ObjectLink> {
  if (refsEqual(a, b)) throw new Error("Cannot link an object to itself.");
  const store = await readViewStore(viewId);
  const exists = (ref: ObjectRef) => ref.kind === "artifact" ? store.artifacts.some(item => item.id === ref.id)
    : ref.kind === "event" ? store.calendar.some(item => item.id === ref.id)
    : store.planner.some(item => flatten(item).some(task => task.id === ref.id || task.key === ref.id));
  if (!exists(a) || !exists(b)) throw new Error("One of the objects no longer exists. Refresh and choose it again.");
  const [left, right] = canonLinkPair(a, b);
  const links = await readCollection(viewId, "links");
  const existing = links.find(
    (link) =>
      refsEqual(link.a, left) && refsEqual(link.b, right),
  );
  if (existing) return existing;
  const link: ObjectLink = {
    id: newObjectId("lnk"),
    a: left,
    b: right,
  };
  links.unshift(link);
  await writeCollection(viewId, "links", links);
  return link;
}

async function unlinkObjectsImpl(viewId: ViewId, id: string) {
  const links = await readCollection(viewId, "links");
  const next = links.filter((link) => link.id !== id);
  await writeCollection(viewId, "links", next);
}

export async function readMemory(viewId: ViewId) {
  const store = await readViewStore(viewId);
  return store.memory;
}

async function recordMemoryImpl(
  viewId: ViewId,
  event: { kind: "page" | "create" | "link" | "copy" | "note"; text: string },
) {
  const memory = await readCollection(viewId, "memory");
  const next = appendMemoryEvent(normalizeMemory(memory), event);
  await writeCollection(viewId, "memory", next);
  return next;
}

async function recordCopyFlagImpl(
  viewId: ViewId,
  flag: { turn?: string; source?: "chat" | "document-paste" },
) {
  const memory = await readCollection(viewId, "memory");
  const normalized = normalizeMemory(memory);
  const withEvent = appendMemoryEvent(normalized, {
    kind: "copy",
    text: flag.turn
      ? `Student copied ${flag.source === "document-paste" ? "into a document" : "from chat"} (${flag.turn})`
      : "Student copied from chat",
  });
  const next = appendCopyFlag(withEvent, flag);
  await writeCollection(viewId, "memory", next);
  return next;
}

/* ------------------------------------------------------------ admin users --- */

const ADMIN_USERS_PATH = path.join(DATA_ROOT, "admin-users.json");

export type UpdateAdminUserInput = Partial<Pick<AdminUser, AdminUserField>>;

async function ensureAdminUsersFile() {
  await fs.mkdir(DATA_ROOT, { recursive: true });
  try {
    await fs.access(ADMIN_USERS_PATH);
  } catch {
    await fs.writeFile(
      ADMIN_USERS_PATH,
      `${JSON.stringify(structuredClone(ADMIN_USERS), null, 2)}\n`,
      "utf8",
    );
  }
}

function isAdminUser(value: unknown): value is AdminUser {
  if (!value || typeof value !== "object") return false;
  const user = value as Record<string, unknown>;
  return (
    typeof user.id === "string" &&
    ADMIN_USER_FIELDS.every((field) => typeof user[field] === "string")
  );
}

async function writeAdminUsers(users: AdminUser[]) {
  await fs.writeFile(
    ADMIN_USERS_PATH,
    `${JSON.stringify(users, null, 2)}\n`,
    "utf8",
  );
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  await ensureAdminUsersFile();
  const raw = await fs.readFile(ADMIN_USERS_PATH, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed) || !parsed.every(isAdminUser)) {
    return structuredClone(ADMIN_USERS);
  }
  return parsed;
}

function nextAdminUserId(users: AdminUser[]): string {
  let max = 0;
  for (const user of users) {
    const match = /^user-(\d+)$/.exec(user.id);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `user-${max + 1}`;
}

function blankAdminUser(id: string): AdminUser {
  return {
    id,
    username: "",
    role: "",
    email: "",
    courses: "",
    lastUsed: "",
    usage: "",
  };
}

export async function createAdminUser(): Promise<AdminUser> {
  const users = await listAdminUsers();
  const user = blankAdminUser(nextAdminUserId(users));
  users.push(user);
  await writeAdminUsers(users);
  return user;
}

export async function updateAdminUser(
  id: string,
  input: UpdateAdminUserInput,
): Promise<AdminUser> {
  const users = await listAdminUsers();
  const index = users.findIndex((user) => user.id === id);
  if (index === -1) throw new Error("User not found.");

  const current = users[index];
  const next: AdminUser = { ...current };
  for (const field of ADMIN_USER_FIELDS) {
    const value = input[field];
    if (typeof value === "string") next[field] = value;
  }

  users[index] = next;
  await writeAdminUsers(users);
  return next;
}

// Every read–modify–write operation owns one re-entrant workspace transaction.
export const createPlannerIssue = (...args: Parameters<typeof createPlannerIssueImpl>) =>
  withWorkspaceTransaction(args[0], seedFor(args[0]), () => createPlannerIssueImpl(...args));
export const updatePlannerIssue = (...args: Parameters<typeof updatePlannerIssueImpl>) =>
  withWorkspaceTransaction(args[0], seedFor(args[0]), () => updatePlannerIssueImpl(...args));
export const deletePlannerIssue = (...args: Parameters<typeof deletePlannerIssueImpl>) =>
  withWorkspaceTransaction(args[0], seedFor(args[0]), () => deletePlannerIssueImpl(...args));
export const createSubtask = (...args: Parameters<typeof createSubtaskImpl>) =>
  withWorkspaceTransaction(args[0], seedFor(args[0]), () => createSubtaskImpl(...args));
export const createArtifact = (...args: Parameters<typeof createArtifactImpl>) =>
  withWorkspaceTransaction(args[0], seedFor(args[0]), () => createArtifactImpl(...args));
export const updateDiagramArtifact = (...args: Parameters<typeof updateDiagramArtifactImpl>) =>
  withWorkspaceTransaction(args[0], seedFor(args[0]), () => updateDiagramArtifactImpl(...args));
export const updateDocumentArtifact = (...args: Parameters<typeof updateDocumentArtifactImpl>) =>
  withWorkspaceTransaction(args[0], seedFor(args[0]), () => updateDocumentArtifactImpl(...args));
export const createCourse = (...args: Parameters<typeof createCourseImpl>) =>
  withWorkspaceTransaction(args[0], seedFor(args[0]), () => createCourseImpl(...args));
export const createSourceDocument = (...args: Parameters<typeof createSourceDocumentImpl>) =>
  withWorkspaceTransaction(args[0], seedFor(args[0]), () => createSourceDocumentImpl(...args));
export const updateSourceDocument = (...args: Parameters<typeof updateSourceDocumentImpl>) =>
  withWorkspaceTransaction(args[0], seedFor(args[0]), () => updateSourceDocumentImpl(...args));
export const createIngestRun = (...args: Parameters<typeof createIngestRunImpl>) =>
  withWorkspaceTransaction(args[0], seedFor(args[0]), () => createIngestRunImpl(...args));
export const updateIngestRun = (...args: Parameters<typeof updateIngestRunImpl>) =>
  withWorkspaceTransaction(args[0], seedFor(args[0]), () => updateIngestRunImpl(...args));
export const applyIngestProposal = (...args: Parameters<typeof applyIngestProposalImpl>) =>
  withWorkspaceTransaction(args[0], seedFor(args[0]), () => applyIngestProposalImpl(...args));
export const patchArtifact = (...args: Parameters<typeof patchArtifactImpl>) =>
  withWorkspaceTransaction(args[0], seedFor(args[0]), () => patchArtifactImpl(...args));
export const linkObjects = (...args: Parameters<typeof linkObjectsImpl>) =>
  withWorkspaceTransaction(args[0], seedFor(args[0]), () => linkObjectsImpl(...args));
export const unlinkObjects = (...args: Parameters<typeof unlinkObjectsImpl>) =>
  withWorkspaceTransaction(args[0], seedFor(args[0]), () => unlinkObjectsImpl(...args));
export const recordMemory = (...args: Parameters<typeof recordMemoryImpl>) =>
  withWorkspaceTransaction(args[0], seedFor(args[0]), () => recordMemoryImpl(...args));
export const recordCopyFlag = (...args: Parameters<typeof recordCopyFlagImpl>) =>
  withWorkspaceTransaction(args[0], seedFor(args[0]), () => recordCopyFlagImpl(...args));

export async function createArtifactWithContent(viewId: ViewId, input: CreateArtifactInput, content: Record<string, unknown>, sourceIds: string[] = []) {
  return withWorkspaceTransaction(viewId, seedFor(viewId), async () => {
    const artifact = await createArtifact(viewId, { ...input, ...(content.spec ? { spec: content.spec } : {}) });
    const saved = Object.keys(content).length ? await patchArtifact(viewId, artifact.id, content) : artifact;
    for (const id of sourceIds) await linkObjects(viewId, { kind: "artifact", id: saved.id }, { kind: "artifact", id });
    await recordMemory(viewId, { kind: "create", text: `Created ${saved.kind} “${saved.title}” (${saved.id}).` });
    return saved;
  });
}
