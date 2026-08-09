/**
 * Local file-backed store, one folder per admin view.
 *
 *   data/mock-one/{planner,projects,classes}.json
 *   data/alex-knight/...
 *   data/alex-seager/...
 *
 * Disk is the source of truth for those three collections. Missing files are
 * seeded once from the in-memory mocks (mock-one) or empty arrays (blank views).
 */

import { promises as fs } from "fs";
import path from "path";
import { CLASSES, PROJECTS, type CourseClass, type Project } from "@/lib/mock-data";
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
import { VIEWS, type ViewId } from "@/lib/views";

export type ViewStore = {
  planner: PlannerIssue[];
  projects: Project[];
  classes: CourseClass[];
};

const DATA_ROOT = path.join(process.cwd(), "data");

const VIEW_IDS = new Set<string>(VIEWS.map((v) => v.id));

export function isViewId(value: string): value is ViewId {
  return VIEW_IDS.has(value);
}

function viewDir(viewId: ViewId) {
  return path.join(DATA_ROOT, viewId);
}

function filePath(viewId: ViewId, name: keyof ViewStore) {
  return path.join(viewDir(viewId), `${name}.json`);
}

function seedFor(viewId: ViewId): ViewStore {
  if (viewId === "mock-one") {
    return {
      planner: structuredClone(PLANNER_ISSUES),
      projects: structuredClone(PROJECTS),
      classes: structuredClone(CLASSES),
    };
  }
  return { planner: [], projects: [], classes: [] };
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
  await ensureFile(viewId, "projects");
  await ensureFile(viewId, "classes");
}

async function readCollection<K extends keyof ViewStore>(
  viewId: ViewId,
  name: K,
): Promise<ViewStore[K]> {
  await ensureFile(viewId, name);
  const raw = await fs.readFile(filePath(viewId, name), "utf8");
  return JSON.parse(raw) as ViewStore[K];
}

async function writeCollection<K extends keyof ViewStore>(
  viewId: ViewId,
  name: K,
  data: ViewStore[K],
) {
  await fs.mkdir(viewDir(viewId), { recursive: true });
  await fs.writeFile(filePath(viewId, name), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function readViewStore(viewId: ViewId): Promise<ViewStore> {
  await ensureViewStore(viewId);
  const [planner, projects, classes] = await Promise.all([
    readCollection(viewId, "planner"),
    readCollection(viewId, "projects"),
    readCollection(viewId, "classes"),
  ]);
  return { planner, projects, classes };
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
  course?: string | null;
  project?: string | null;
  /** Assignment name, e.g. "Problem Set 7". */
  assignment?: string | null;
  due?: string | null;
  description?: string;
};

export async function createPlannerIssue(
  viewId: ViewId,
  input: CreatePlannerIssueInput,
): Promise<PlannerIssue> {
  const title = input.title.trim();
  if (!title) throw new Error("Title is required.");

  const planner = await readCollection(viewId, "planner");
  const description = input.description?.trim();
  const course = input.course?.trim() || undefined;
  const project = input.project?.trim() || undefined;
  const assignment = input.assignment?.trim() || undefined;
  const due = input.due?.trim() || undefined;
  const issue: PlannerIssue = {
    key: nextIssueKey(planner),
    title,
    status: input.status ?? "todo",
    ...(description ? { description } : {}),
    ...(input.label ? { labels: [input.label] } : {}),
    ...(course ? { course } : {}),
    ...(project ? { project } : {}),
    ...(assignment ? { assignment } : {}),
    ...(due ? { due } : {}),
  };

  planner.unshift(issue);
  await writeCollection(viewId, "planner", planner);
  return issue;
}

export async function listPlanner(viewId: ViewId) {
  return readCollection(viewId, "planner");
}

export async function getPlannerIssue(viewId: ViewId, key: string) {
  const planner = await readCollection(viewId, "planner");
  return findIssue(planner, key);
}

export type UpdatePlannerIssueInput = {
  title?: string;
  description?: string | null;
  status?: PlannerStatus;
  priority?: PlannerPriority;
  labels?: PlannerLabel[];
  course?: string | null;
  project?: string | null;
  assignment?: string | null;
  due?: string | null;
};

function applyOptionalString(
  updated: PlannerIssue,
  key: "course" | "project" | "assignment" | "due" | "description",
  value: string | null | undefined,
) {
  if (value === undefined) return;
  const trimmed = value?.trim();
  if (trimmed) updated[key] = trimmed;
  else delete updated[key];
}

export async function updatePlannerIssue(
  viewId: ViewId,
  key: string,
  input: UpdatePlannerIssueInput,
): Promise<PlannerIssue> {
  const planner = await readCollection(viewId, "planner");
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
    applyOptionalString(updated, "project", input.project);
    applyOptionalString(updated, "assignment", input.assignment);
    applyOptionalString(updated, "due", input.due);
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
};

export async function deletePlannerIssue(
  viewId: ViewId,
  key: string,
): Promise<PlannerIssue> {
  const planner = await readCollection(viewId, "planner");
  const existing = findIssue(planner, key);
  if (!existing) throw new Error("Task not found.");

  await writeCollection(viewId, "planner", removeIssue(planner, key));
  return existing;
}

export async function createSubtask(
  viewId: ViewId,
  parentKey: string,
  input: CreateSubtaskInput,
): Promise<PlannerIssue> {
  const title = input.title.trim();
  if (!title) throw new Error("Title is required.");

  const planner = await readCollection(viewId, "planner");
  const parent = findIssue(planner, parentKey);
  if (!parent) throw new Error("Parent task not found.");

  const child: PlannerIssue = {
    key: nextIssueKey(planner),
    title,
    status: input.status ?? "todo",
    ...(parent.course ? { course: parent.course } : {}),
  };

  const next = mapIssue(planner, parentKey, (issue) => ({
    ...issue,
    children: [...(issue.children ?? []), child],
  }));

  await writeCollection(viewId, "planner", next);
  return child;
}

/* --------------------------------------------------------------- projects --- */

function slugify(title: string) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return base || "untitled";
}

function uniqueSlug(existing: Project[], title: string) {
  const base = slugify(title);
  if (!existing.some((p) => p.slug === base)) return base;
  let n = 2;
  while (existing.some((p) => p.slug === `${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export type CreateProjectInput = {
  title: string;
  description?: string;
  createdBy?: string;
};

export async function createProject(
  viewId: ViewId,
  input: CreateProjectInput,
): Promise<Project> {
  const title = input.title.trim();
  if (!title) throw new Error("Title is required.");

  const projects = await readCollection(viewId, "projects");
  const project: Project = {
    slug: uniqueSlug(projects, title),
    title,
    description: input.description?.trim() || "No description yet.",
    createdBy: input.createdBy?.trim() || "You",
    updated: "Just now",
    visibility: "Private",
    instructions: null,
    context: [],
    scheduled: [],
    chats: [],
  };

  projects.unshift(project);
  await writeCollection(viewId, "projects", projects);
  return project;
}

export async function listProjects(viewId: ViewId) {
  return readCollection(viewId, "projects");
}

/* ---------------------------------------------------------------- classes --- */

export type CreateClassInput = {
  code: string;
  title: string;
  description?: string;
  instructor?: string;
  schedule?: string;
  term?: string;
};

export async function createClass(
  viewId: ViewId,
  input: CreateClassInput,
): Promise<CourseClass> {
  const code = input.code.trim();
  const title = input.title.trim();
  if (!code || !title) throw new Error("Code and title are required.");

  const classes = await readCollection(viewId, "classes");
  const slugBase = slugify(code);
  let slug = slugBase;
  let n = 2;
  while (classes.some((c) => c.slug === slug)) {
    slug = `${slugBase}-${n}`;
    n += 1;
  }

  const course: CourseClass = {
    slug,
    code,
    title,
    description: input.description?.trim() || "No description yet.",
    instructor: input.instructor?.trim() || "TBD",
    schedule: input.schedule?.trim() || "Schedule TBD",
    term: input.term?.trim() || "This term",
  };

  classes.unshift(course);
  await writeCollection(viewId, "classes", classes);
  return course;
}

export async function listClasses(viewId: ViewId) {
  return readCollection(viewId, "classes");
}
