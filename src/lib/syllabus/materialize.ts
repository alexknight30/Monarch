import type { Assignment } from "@/lib/assignments";
import { isAssignmentType } from "@/lib/assignments";
import type { StoredCalendarEvent } from "@/lib/calendar-events";
import { parseStoredDate } from "@/lib/calendar-events";
import type { Course, CourseMeeting, CourseOfficeHour } from "@/lib/mock-data";
import { deriveSchedule } from "@/lib/mock-data";
import {
  tagsFromAssignmentType,
  tagsFromCalendarKind,
} from "@/lib/objects/tags";
import type { PlannerIssue } from "@/lib/planner";
import type { Proposal, ProposalWarning } from "@/lib/source-documents";
import {
  normalizeClock,
  normalizeRecurrenceRule,
  normalizeWeekday,
  normalizeWeekdays,
  type AssignmentsAgentResult,
  type CourseAgentResult,
  type ExtractedOneOff,
  type RecurrenceRule,
  type ScheduleAgentResult,
  type SyllabusExtraction,
  type TasksAgentResult,
} from "@/lib/syllabus/schema";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function ymd(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function localDateTime(date: Date, time: string) {
  const [h = "00", m = "00"] = time.split(":");
  return `${ymd(date)}T${pad(Number(h))}:${pad(Number(m))}:00`;
}

function nextId(prefix: string, existing: string[], pattern: RegExp) {
  let max = 0;
  for (const id of existing) {
    const match = pattern.exec(id);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `${prefix}-${max + 1}`;
}

function meetingKind(value: string): CourseMeeting["kind"] {
  if (value === "lab" || value === "discussion" || value === "seminar") {
    return value;
  }
  return "lecture";
}

function officeMode(value: string): CourseOfficeHour["mode"] {
  if (value === "virtual" || value === "by-appointment") return value;
  return "in-person";
}

function synthesizeRecurrence(
  meetings: CourseMeeting[],
  officeHours: CourseOfficeHour[],
  course: { code: string; title: string; instructor: string },
  from?: string,
  to?: string,
): RecurrenceRule[] {
  const rules: RecurrenceRule[] = [];
  for (const meeting of meetings) {
    const days = normalizeWeekdays(meeting.days);
    const start = normalizeClock(meeting.start);
    const end = normalizeClock(meeting.end);
    if (!days.length || !start || !end) continue;
    rules.push({
      kind: "class",
      title: `${course.code} — ${course.title}`.replace(/^ — | — $/g, ""),
      days,
      start,
      end,
      ...(meeting.location ? { location: meeting.location } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
      skipDates: [],
    });
  }
  for (const hour of officeHours) {
    const day = normalizeWeekday(hour.day);
    const start = normalizeClock(hour.start);
    const end = normalizeClock(hour.end);
    if (day == null || !start || !end) continue;
    rules.push({
      kind: "office-hours",
      title: `${course.code || course.title} office hours`,
      days: [day],
      start,
      end,
      ...(hour.location ? { location: hour.location } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
      skipDates: [],
    });
  }
  return rules;
}

export function resolveRecurrence(
  rules: RecurrenceRule[] | undefined,
  course: {
    code: string;
    title: string;
    instructor: string;
    meetings?: CourseMeeting[];
    officeHours?: CourseOfficeHour[];
    termStartsAt?: string;
    termEndsAt?: string;
  },
): RecurrenceRule[] {
  const usable = (rules ?? [])
    .map(normalizeRecurrenceRule)
    .filter((rule) => rule.days.length && rule.start && rule.end);
  const synthesized = synthesizeRecurrence(
    course.meetings ?? [],
    course.officeHours ?? [],
    course,
    course.termStartsAt,
    course.termEndsAt,
  );
  const has = (kind: RecurrenceRule["kind"]) =>
    usable.some((rule) => rule.kind === kind);
  const name = course.code || course.title;
  return [
    ...usable,
    ...synthesized.filter((rule) => !has(rule.kind)),
  ].map((rule) =>
    rule.kind === "office-hours"
      ? { ...rule, title: `${name} office hours` }
      : rule,
  );
}

export function expandRecurrence(
  rules: RecurrenceRule[],
  courseSlug: string,
  termStartsAt?: string,
  termEndsAt?: string,
): StoredCalendarEvent[] {
  const events: StoredCalendarEvent[] = [];

  for (const [index, rule] of rules.entries()) {
    const normalized = normalizeRecurrenceRule(rule);
    const kind = normalized.kind === "office-hours" ? "office-hours" : "class";
    const from = normalized.from || termStartsAt;
    const to = normalized.to || termEndsAt;
    if (!from || !to) continue;

    const start = parseStoredDate(from);
    const end = parseStoredDate(to);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;

    const days = normalized.days;
    if (!days.length) continue;

    const skip = new Set(normalized.skipDates ?? []);
    const seriesId = `series-${index + 1}`;
    const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    while (cursor <= last) {
      const key = ymd(cursor);
      if (days.includes(cursor.getDay()) && !skip.has(key)) {
        events.push({
          id: `${seriesId}-${key}`,
          courseId: courseSlug,
          courseSlug,
          kind,
          timing: "meeting",
          tagIds: tagsFromCalendarKind(kind),
          title: normalized.title || rule.title,
          startsAt: localDateTime(cursor, normalized.start || rule.start),
          endsAt: localDateTime(cursor, normalized.end || rule.end),
          ...(normalized.location ? { location: normalized.location } : {}),
          generatedBy: "syllabus",
          seriesId,
        });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return events;
}

function oneOffEvents(
  oneOffs: ExtractedOneOff[],
  courseSlug: string,
): StoredCalendarEvent[] {
  return oneOffs
    .filter((item) => item.startsAt)
    .map((item, index) => {
      const kind =
        item.kind === "office-hours" || item.kind === "exam" || item.kind === "session"
          ? item.kind
          : item.kind === "deadline"
            ? "deadline"
            : "class";
      return {
        id: `oneoff-${index + 1}`,
        courseId: courseSlug,
        courseSlug,
        kind,
        timing: kind === "deadline" || kind === "exam" ? "deadline" as const : "meeting" as const,
        tagIds: tagsFromCalendarKind(kind),
        title: item.title,
        startsAt: item.startsAt,
        endsAt: item.endsAt || item.startsAt,
        ...(item.location ? { location: item.location } : {}),
        generatedBy: "syllabus" as const,
      };
    });
}

function deadlineEvents(
  assignments: Assignment[],
  courseSlug: string,
): StoredCalendarEvent[] {
  return assignments
    .filter((assignment) => assignment.dueAt)
    .map((assignment) => {
      const kind = assignment.type === "exam" ? ("exam" as const) : ("deadline" as const);
      return {
        id: `due-${assignment.id}`,
        courseId: courseSlug,
        courseSlug,
        kind,
        timing: "deadline" as const,
        tagIds: tagsFromAssignmentType(assignment.type),
        title: assignment.title,
        startsAt: assignment.dueAt as string,
        endsAt: assignment.dueAt as string,
        assignmentId: assignment.id,
        generatedBy: "syllabus" as const,
      };
    });
}

function slugifyCourse(code: string) {
  const base = code
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "course";
}

function formatDue(dueAt: string | null) {
  if (!dueAt) return undefined;
  const date = parseStoredDate(dueAt);
  if (Number.isNaN(date.getTime())) return dueAt;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function firstText(...values: Array<string | undefined | null>) {
  for (const value of values) {
    if (value && value.trim()) return value.trim();
  }
  return "";
}

function isoDay(value?: string | null) {
  if (!value) return "";
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  return match ? match[1] : "";
}

function splitCourseHeading(heading: string): { code: string; title: string } {
  const match = heading.match(
    /^([A-Za-z]{2,}\s*\d{1,4}[A-Za-z]?)\s*[—–\-:|]\s+(.+)$/,
  );
  if (match) {
    return {
      code: match[1].replace(/\s+/g, " ").trim().toUpperCase(),
      title: match[2].trim(),
    };
  }
  return { code: "", title: heading.trim() };
}

function termLabel(term: string, startsAt: string) {
  if (term) return term;
  if (!startsAt) return "";
  const date = parseStoredDate(startsAt);
  if (Number.isNaN(date.getTime())) return "";
  const month = date.getMonth();
  const year = date.getFullYear();
  if (month >= 7 && month <= 11) return `Fall ${year}`;
  if (month <= 4) return `Spring ${year}`;
  return `Summer ${year}`;
}

function minIso(values: string[]) {
  return values.filter(Boolean).sort()[0] ?? "";
}

function maxIso(values: string[]) {
  const sorted = values.filter(Boolean).sort();
  return sorted[sorted.length - 1] ?? "";
}

export function materializeProposal(input: {
  runId: string;
  documentId: string;
  extraction?: SyllabusExtraction;
  courseAgent: CourseAgentResult;
  assignmentsAgent: AssignmentsAgentResult;
  scheduleAgent: ScheduleAgentResult;
  tasksAgent: TasksAgentResult;
}): Proposal {
  const extracted = input.extraction?.course;
  const classRule = input.scheduleAgent.recurrence.find((rule) => rule.kind === "class");
  const heading = splitCourseHeading(classRule?.title ?? "");
  const code = firstText(input.courseAgent.code, extracted?.code, heading.code);
  const title = firstText(input.courseAgent.title, extracted?.title, heading.title);
  const courseSlug = slugifyCourse(code || "course");

  const meetings: CourseMeeting[] = (
    input.courseAgent.meetings.length
      ? input.courseAgent.meetings
      : (input.extraction?.meetings ?? [])
  ).map((meeting) => ({
    kind: meetingKind(meeting.kind),
    days: meeting.days,
    start: meeting.start,
    end: meeting.end,
    ...(meeting.location ? { location: meeting.location } : {}),
  }));
  const officeHours: CourseOfficeHour[] = (
    input.courseAgent.officeHours.length
      ? input.courseAgent.officeHours
      : (input.extraction?.officeHours ?? [])
  ).map((hour) => ({
    host: hour.host,
    day: hour.day,
    start: hour.start,
    end: hour.end,
    ...(hour.location ? { location: hour.location } : {}),
    mode: officeMode(hour.mode),
  }));

  const recurrenceStarts = input.scheduleAgent.recurrence.map((rule) => isoDay(rule.from));
  const recurrenceEnds = input.scheduleAgent.recurrence.map((rule) => isoDay(rule.to));
  const termStartsAt =
    isoDay(input.courseAgent.termStartsAt) ||
    isoDay(extracted?.termStartsAt) ||
    minIso(recurrenceStarts) ||
    undefined;
  const termEndsAt =
    isoDay(input.courseAgent.termEndsAt) ||
    isoDay(extracted?.termEndsAt) ||
    maxIso(recurrenceEnds) ||
    undefined;

  const instructor = firstText(
    input.courseAgent.instructor,
    extracted?.instructor,
    officeHours[0]?.host,
  );
  const term = termLabel(
    firstText(input.courseAgent.term, extracted?.term),
    termStartsAt ?? "",
  );
  const schedule =
    deriveSchedule(meetings) !== "Schedule TBD"
      ? deriveSchedule(meetings)
      : extracted?.scheduleText || "Schedule TBD";
  const email = firstText(input.courseAgent.instructorEmail, extracted?.instructorEmail);
  const office = firstText(
    input.courseAgent.instructorOffice,
    extracted?.instructorOffice,
  );
  const grading = input.courseAgent.grading.length
    ? input.courseAgent.grading
    : (input.extraction?.grading ?? []);
  const policies = {
    late: firstText(input.courseAgent.policies.late, input.extraction?.policies.late),
    attendance: firstText(
      input.courseAgent.policies.attendance,
      input.extraction?.policies.attendance,
    ),
    ai: firstText(input.courseAgent.policies.ai, input.extraction?.policies.ai),
    integrity: firstText(
      input.courseAgent.policies.integrity,
      input.extraction?.policies.integrity,
    ),
  };

  const course: Course = {
    id: courseSlug,
    slug: courseSlug,
    code: code || "COURSE",
    title: title || "Untitled course",
    description:
      firstText(input.courseAgent.description, extracted?.description) ||
      "No description yet.",
    instructor: instructor || "TBD",
    schedule,
    term: term || "This term",
    ...(termStartsAt ? { termStartsAt } : {}),
    ...(termEndsAt ? { termEndsAt } : {}),
    ...(email ? { instructorEmail: email } : {}),
    ...(office ? { instructorOffice: office } : {}),
    ...(meetings.length ? { meetings } : {}),
    ...(officeHours.length ? { officeHours } : {}),
    ...(grading.length ? { grading } : {}),
    policies: {
      ...(policies.late ? { late: policies.late } : {}),
      ...(policies.attendance ? { attendance: policies.attendance } : {}),
      ...(policies.ai ? { ai: policies.ai } : {}),
      ...(policies.integrity ? { integrity: policies.integrity } : {}),
    },
    sourceDocumentId: input.documentId,
  };

  const assignments: Assignment[] = input.assignmentsAgent.assignments.map(
    (item, index) => ({
      id: `ASG-${index + 1}`,
      courseSlug,
      title: item.title,
      type: isAssignmentType(item.type) ? item.type : "project",
      dueAt: item.dueAt || null,
      weight: item.weight,
      ...(item.description ? { description: item.description } : {}),
      source: {
        documentId: input.documentId,
        quote: item.quote,
        ...(item.page != null ? { page: item.page } : {}),
      },
      status: "upcoming",
      ...(item.needsReview ? { needsReview: true } : {}),
    }),
  );

  const recurrence = resolveRecurrence(input.scheduleAgent.recurrence, {
    code: code || "COURSE",
    title: title || "Untitled course",
    instructor: instructor || "TBD",
    meetings,
    officeHours,
    termStartsAt,
    termEndsAt,
  }).map((rule) => ({
    ...rule,
    from: rule.from || termStartsAt,
    to: rule.to || termEndsAt,
    skipDates: rule.skipDates ?? [],
  }));

  const calendarEvents = [
    ...expandRecurrence(recurrence, courseSlug, termStartsAt, termEndsAt),
    ...oneOffEvents(input.scheduleAgent.oneOffs, courseSlug),
    ...deadlineEvents(assignments, courseSlug),
  ];

  const tasks: PlannerIssue[] = input.tasksAgent.tasks.map((task, index) => {
    const assignment = assignments.find(
      (item) => item.title.toLowerCase() === task.assignmentTitle.toLowerCase(),
    );
    const dueAt = task.dueAt || assignment?.dueAt || undefined;
    return {
      id: `ING-${index + 1}`,
      key: `ING-${index + 1}`,
      title: task.title,
      status: "todo" as const,
      ...(task.description ? { description: task.description } : {}),
      course: course.code,
      courseSlug,
      courseId: courseSlug,
      tagIds: assignment
        ? tagsFromAssignmentType(assignment.type)
        : [],
      ...(assignment ? { assignment: assignment.title, assignmentId: assignment.id } : {}),
      ...(dueAt ? { dueAt, due: formatDue(dueAt) } : {}),
      ...(task.children.length
        ? {
            children: task.children.map((child, childIndex) => ({
              id: `ING-${index + 1}-${childIndex + 1}`,
              key: `ING-${index + 1}-${childIndex + 1}`,
              title: child.title,
              status: "todo" as const,
              ...(child.description ? { description: child.description } : {}),
              course: course.code,
              courseSlug,
              courseId: courseSlug,
              tagIds: assignment
                ? tagsFromAssignmentType(assignment.type)
                : [],
              ...(assignment
                ? { assignment: assignment.title, assignmentId: assignment.id }
                : {}),
            })),
          }
        : {}),
    };
  });

  const warnings: ProposalWarning[] = [];
  if (!code || !title) {
    warnings.push({
      severity: "warn",
      field: "course.title",
      message: "Add the course code and title before saving.",
    });
  }
  if (!termStartsAt || !termEndsAt) {
    warnings.push({
      severity: "warn",
      field: "course.termStartsAt",
      message: "Add term start and end dates so class meetings can be placed on the calendar.",
    });
  }

  return {
    runId: input.runId,
    documentId: input.documentId,
    course,
    assignments,
    calendarEvents,
    tasks,
    warnings,
    recurrence,
  };
}

export function rematerializeCalendar(proposal: Proposal): StoredCalendarEvent[] {
  const courseSlug = proposal.course.slug;
  const kept = proposal.calendarEvents.filter((event) => !event.seriesId);
  const recurrence = resolveRecurrence(proposal.recurrence, proposal.course);
  const expanded = expandRecurrence(
    recurrence,
    courseSlug,
    proposal.course.termStartsAt,
    proposal.course.termEndsAt,
  );
  return [...expanded, ...kept];
}

export function nextPrefixedId(prefix: string, ids: string[]) {
  return nextId(prefix, ids, new RegExp(`^${prefix}-(\\d+)$`));
}
