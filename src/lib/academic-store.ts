import { readViewStore, type ViewStore } from "./local-db";
import { withWorkspaceTransaction, writeWorkspaceCollections } from "./workspace-store";
import { isAssignmentType, type Assignment } from "./assignments";
import { STORED_CALENDAR_KINDS, parseStoredDate, formatDisplayDate, type StoredCalendarEvent } from "./calendar-events";
import type { ViewId } from "./views";
import type { PlannerIssue } from "./planner";
import { sanitizeTagIds } from "./objects/tags";
import { deriveSchedule, type Course } from "./mock-data";
import { expandRecurrence, resolveRecurrence } from "./syllabus/materialize";
import { validateStoredDate as date } from "./stored-date";

async function mutate<T>(viewId: ViewId, operation: (store: ViewStore) => T) {
  const seed = await readViewStore(viewId);
  return withWorkspaceTransaction(viewId, seed, async () => {
    const store = await readViewStore(viewId);
    const result = operation(store);
    await writeWorkspaceCollections(viewId, seed, store);
    return result;
  });
}
function title(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.length > 500) throw new Error("Use a title of 1–500 characters.");
  return value.trim();
}
function courseFor(store: ViewStore, id: unknown) {
  const course = store.courses.find(c => c.id === id || c.slug === id);
  if (!course) throw new Error("Choose an existing course.");
  return course;
}
function mapTasks(tasks: PlannerIssue[], fn: (task: PlannerIssue) => PlannerIssue): PlannerIssue[] {
  return tasks.map(task => fn({ ...task, ...(task.children ? { children: mapTasks(task.children, fn) } : {}) }));
}
function syncAssignment(store: ViewStore, assignment: Assignment) {
  const course = courseFor(store, assignment.courseSlug);
  store.planner = mapTasks(store.planner, task => task.assignmentId === assignment.id ? {
    ...task, assignment: assignment.title, courseId: course.id, courseSlug: course.slug, course: course.code,
    dueAt: assignment.dueAt || undefined, due: assignment.dueAt ? formatDisplayDate(assignment.dueAt) : undefined,
  } : task);
  const prior = store.calendar.find(event => event.assignmentId === assignment.id);
  if (!assignment.dueAt) {
    const removed = new Set(store.calendar.filter(e => e.assignmentId === assignment.id).map(e => e.id));
    store.calendar = store.calendar.filter(event => event.assignmentId !== assignment.id);
    store.links = store.links.filter(l => !(l.a.kind === "event" && removed.has(l.a.id)) && !(l.b.kind === "event" && removed.has(l.b.id)));
    return;
  }
  const event: StoredCalendarEvent = { id: prior?.id || crypto.randomUUID(), courseId: course.id, courseSlug: course.slug,
    title: assignment.title, startsAt: assignment.dueAt, endsAt: assignment.dueAt, kind: assignment.type === "exam" || assignment.type === "quiz" ? "exam" : "deadline",
    timing: "deadline", tagIds: prior?.tagIds ?? [assignment.type === "exam" ? "exam" : assignment.type === "quiz" ? "quiz" : "assignment"], assignmentId: assignment.id, generatedBy: prior?.generatedBy || "user" };
  if (prior) store.calendar = store.calendar.map(e => e.assignmentId === assignment.id ? { ...e, ...event, id: e.id } : e);
  else store.calendar.push(event);
}
export function saveAssignment(viewId: ViewId, id: string | null, patch: Record<string, unknown>) {
  return mutate(viewId, store => {
    const current = id ? store.assignments.find(a => a.id === id) : undefined;
    if (id && !current) throw new Error("Assignment not found.");
    const course = courseFor(store, patch.courseSlug ?? current?.courseSlug ?? "unassigned");
    const type = patch.type ?? current?.type ?? "problem-set";
    if (typeof type !== "string" || !isAssignmentType(type)) throw new Error("Choose a valid assignment type.");
    const status = patch.status ?? current?.status ?? "upcoming";
    if (!["upcoming", "submitted", "graded"].includes(String(status))) throw new Error("Choose a valid status.");
    const weight = patch.weight === undefined ? current?.weight ?? null : patch.weight === "" || patch.weight === null ? null : Number(patch.weight);
    if (weight !== null && (!Number.isFinite(weight) || weight < 0 || weight > 100)) throw new Error("Grade weight must be between 0 and 100.");
    const assignment: Assignment = { ...current, id: current?.id || `ASG-${crypto.randomUUID()}`, courseSlug: course.slug,
      title: title(patch.title ?? current?.title), type, status: status as Assignment["status"], weight,
      dueAt: date(patch.dueAt === undefined ? current?.dueAt : patch.dueAt),
      description: typeof patch.description === "string" ? patch.description : current?.description, needsReview: false };
    if (current) store.assignments = store.assignments.map(a => a.id === id ? assignment : a); else store.assignments.push(assignment);
    syncAssignment(store, assignment);
    return assignment;
  });
}
export function deleteAssignment(viewId: ViewId, id: string) {
  return mutate(viewId, store => {
    const current = store.assignments.find(a => a.id === id); if (!current) throw new Error("Assignment not found.");
    syncAssignment(store, { ...current, dueAt: null });
    store.assignments = store.assignments.filter(a => a.id !== id);
    store.planner = mapTasks(store.planner, task => {
      if (task.assignmentId !== id) return task;
      const next = { ...task }; delete next.assignmentId; delete next.assignment; return next;
    });
    return current;
  });
}
export function saveCalendarEvent(viewId: ViewId, id: string | null, patch: Record<string, unknown>) {
  return mutate(viewId, store => {
    const current = id ? store.calendar.find(e => e.id === id) : undefined;
    if (id && !current) throw new Error("Event not found.");
    const course = courseFor(store, patch.courseId ?? current?.courseId ?? "unassigned");
    const kind = patch.kind ?? current?.kind ?? "session";
    if (!(STORED_CALENDAR_KINDS as readonly unknown[]).includes(kind)) throw new Error("Choose a valid event type.");
    const startsAt = date(patch.startsAt ?? current?.startsAt, true)!;
    const endsAt = date(current?.assignmentId ? startsAt : patch.endsAt ?? current?.endsAt ?? startsAt, true)!;
    if (parseStoredDate(endsAt) < parseStoredDate(startsAt)) throw new Error("End time must be at or after the start.");
    const event: StoredCalendarEvent = { ...current, id: current?.id || crypto.randomUUID(), title: title(patch.title ?? current?.title), courseId: course.id, courseSlug: course.slug,
      kind: kind as StoredCalendarEvent["kind"], timing: kind === "deadline" || kind === "exam" ? "deadline" : "meeting", startsAt, endsAt,
      location: typeof patch.location === "string" ? patch.location : current?.location,
      tagIds: sanitizeTagIds(patch.tagIds ?? current?.tagIds ?? (kind === "class" || kind === "office-hours" ? [kind] : []), "event"), generatedBy: current?.generatedBy || "user" };
    if (current?.assignmentId) {
      const assignment = store.assignments.find(a => a.id === current.assignmentId);
      if (!assignment) throw new Error("The linked assignment is missing.");
      if (event.kind !== "deadline" && event.kind !== "exam") throw new Error("Assignment events must remain deadlines or exams.");
      Object.assign(assignment, { title: event.title, courseSlug: course.slug, dueAt: event.startsAt });
      syncAssignment(store, assignment);
    }
    if (current) store.calendar = store.calendar.map(e => e.id === id ? event : e); else store.calendar.push(event);
    return event;
  });
}
export function deleteCalendarEvent(viewId: ViewId, id: string) {
  return mutate(viewId, store => {
    const event = store.calendar.find(e => e.id === id); if (!event) throw new Error("Event not found.");
    if (event.assignmentId) throw new Error("This is an assignment deadline. Clear its due date or delete the assignment instead.");
    store.calendar = store.calendar.filter(e => e.id !== id);
    store.links = store.links.filter(l => !(l.a.kind === "event" && l.a.id === id) && !(l.b.kind === "event" && l.b.id === id));
    return event;
  });
}
export function updateCourse(viewId: ViewId, id: string, patch: Record<string, unknown>) {
  return mutate(viewId, store => {
    const current = courseFor(store, id); if (current.id === "unassigned") throw new Error("The Unassigned course cannot be edited.");
    const next: Course = { ...current };
    for (const key of ["code", "title", "description", "instructor", "term", "instructorEmail", "instructorOffice"] as const) {
      if (patch[key] !== undefined) { if (typeof patch[key] !== "string") throw new Error(`Invalid ${key}.`); next[key] = patch[key]; }
    }
    next.code = title(next.code); next.title = title(next.title);
    for (const key of ["termStartsAt", "termEndsAt"] as const) if (patch[key] !== undefined) next[key] = date(patch[key]) || undefined;
    if (next.termStartsAt && next.termEndsAt && next.termEndsAt < next.termStartsAt) throw new Error("The term must end after it starts.");
    if (patch.policies !== undefined) {
      if (!patch.policies || typeof patch.policies !== "object") throw new Error("Invalid course policies.");
      next.policies = Object.fromEntries(Object.entries(patch.policies).filter(([key,value]) => ["ai","late","attendance","integrity"].includes(key) && typeof value === "string"));
    }
    const clock = (value: unknown) => typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
    for (const key of ["meetings","officeHours"] as const) {
      if (patch[key] === undefined) continue;
      const rows = patch[key]; if (!Array.isArray(rows) || rows.length > 30) throw new Error("Use up to 30 weekly meeting entries.");
      for (const row of rows) {
        if (!row || typeof row !== "object" || !clock(row.start) || !clock(row.end) || row.end <= row.start) throw new Error("Every meeting needs a valid start and a later end time.");
        const days = key === "meetings" ? row.days : [row.day];
        if (!Array.isArray(days) || !days.length || days.some(day => !Number.isInteger(day) || day < 0 || day > 6)) throw new Error("Choose valid weekdays for each meeting.");
      }
      if (key === "meetings") next.meetings = rows as Course["meetings"];
      else next.officeHours = rows as Course["officeHours"];
    }
    if (patch.rebuildSchedule === true) {
      if (!next.termStartsAt || !next.termEndsAt) throw new Error("Set the term's start and end dates before creating weekly calendar events.");
      if (+parseStoredDate(next.termEndsAt) - +parseStoredDate(next.termStartsAt) > 730*86400000) throw new Error("Use a term of two years or less.");
      const previous = store.calendar.filter(e => e.courseId === next.id && e.generatedBy === "syllabus" && (e.kind === "class" || e.kind === "office-hours"));
      const previousIds = new Set(previous.map(e => e.id));
      const generated = expandRecurrence(resolveRecurrence(undefined,next),next.slug,next.termStartsAt,next.termEndsAt).map(event => {
        const match = previous.find(e => e.kind === event.kind && e.startsAt.slice(0,10) === event.startsAt.slice(0,10) && e.seriesId?.endsWith(event.seriesId || ""));
        return { ...event,id:match?.id || crypto.randomUUID(),courseId:next.id,seriesId:`${next.id}-${event.seriesId}` };
      });
      store.calendar = [...store.calendar.filter(e => !previousIds.has(e.id)),...generated];
      const retained = new Set(generated.map(e => e.id));
      const gone = (ref: {kind:string;id:string}) => ref.kind === "event" && previousIds.has(ref.id) && !retained.has(ref.id);
      store.links = store.links.filter(l => !gone(l.a) && !gone(l.b));
    }
    next.schedule = deriveSchedule(next.meetings);
    store.courses = store.courses.map(c => c.id === current.id ? next : c);
    store.planner = mapTasks(store.planner, task => task.courseId === current.id || task.courseSlug === current.slug ? { ...task, course: next.code } : task);
    store.artifacts = store.artifacts.map(a => a.courseId === current.id && (a.kind === "document" || a.kind === "notes") ? {...a,course:next.code}:a);
    return next;
  });
}
export function deleteCourse(viewId: ViewId, id: string) {
  return mutate(viewId, store => {
    const course=courseFor(store,id);if(course.id==="unassigned")throw new Error("The Unassigned course cannot be deleted.");
    store.courses=store.courses.filter(c=>c.id!==course.id);
    store.artifacts=store.artifacts.map(a=>a.courseId===course.id?{...a,courseId:"unassigned",courseSlug:undefined,...(a.kind==="document"||a.kind==="notes"?{course:"Unassigned"}:{})}:a);
    store.calendar=store.calendar.map(e=>e.courseId===course.id||e.courseSlug===course.slug?{...e,courseId:"unassigned",courseSlug:"unassigned"}:e);
    store.assignments=store.assignments.map(a=>a.courseSlug===course.slug?{...a,courseSlug:"unassigned"}:a);
    store.planner=mapTasks(store.planner,t=>t.courseId===course.id||t.courseSlug===course.slug?{...t,courseId:"unassigned",courseSlug:"unassigned",course:"Unassigned"}:t);
    store.documents=store.documents.map(d=>d.courseSlug===course.slug?{...d,courseSlug:"unassigned"}:d);
    return course;
  });
}
