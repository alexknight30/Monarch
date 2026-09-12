import type Anthropic from "@anthropic-ai/sdk";
import { structuredMessage } from "@/lib/syllabus/anthropic";
import { AGENT_MODEL } from "@/lib/syllabus/models";
import {
  normalizeAssignmentsAgent,
  normalizeCourseAgent,
  normalizeScheduleAgent,
  normalizeTasksAgent,
  type AssignmentsAgentResult,
  type CourseAgentResult,
  type ScheduleAgentResult,
  type TasksAgentResult,
} from "@/lib/syllabus/schema";

type AgentOpts = {
  client: Anthropic;
  fileApiId: string;
  mime: string;
};

export async function runCourseAgent(opts: AgentOpts): Promise<CourseAgentResult> {
  return normalizeCourseAgent(
    await structuredMessage<CourseAgentResult>({
      client: opts.client,
      model: AGENT_MODEL,
      fileApiId: opts.fileApiId,
      mime: opts.mime,
      instruction: `Write a clean course profile from the syllabus header and logistics block.

Return a FLAT JSON object with these top-level keys (do not nest them under "course"):
{
  "code": "PSYC 179",
  "title": "Cognitive Psychology and the Brain",
  "description": "1-3 sentences",
  "instructor": "Dr. Miriam Ostrander",
  "instructorEmail": "",
  "instructorOffice": "",
  "term": "Fall Semester 2026",
  "termStartsAt": "2026-08-31",
  "termEndsAt": "2026-12-11",
  "meetings": [{ "kind": "lecture", "days": [1,3,5], "start": "10:00", "end": "10:50", "location": "" }],
  "officeHours": [{ "host": "", "day": 2, "start": "13:00", "end": "15:00", "location": "", "mode": "in-person" }],
  "grading": [{ "component": "", "weight": 0 }],
  "policies": { "late": "", "attendance": "", "ai": "", "integrity": "" },
  "needsReview": []
}

Rules:
- code and title come from the document title. Split "PSYC 179 — Cognitive Psychology and the Brain" into code "PSYC 179" and title "Cognitive Psychology and the Brain".
- Never leave code, title, instructor, or term empty when they appear on the first page.
- meetings.days and officeHours.day MUST be integers: 0 = Sunday, 1 = Monday, … 6 = Saturday. "M/W" → [1, 3]. Never write weekday names.
- start/end are 24-hour HH:mm. "1:30 – 3:30 pm" → "13:30" / "15:30".
- termStartsAt / termEndsAt are ISO dates. If the syllabus states a year ("Fall Semester 2026") and a start/end day ("classes begin Monday, August 31", "instruction ends Friday, December 11"), emit "2026-08-31" and "2026-12-11". That is reading, not guessing.
- needsReview must be []. Do not write reasoning.`,
    }),
  );
}

export async function runAssignmentsAgent(
  opts: AgentOpts,
): Promise<AssignmentsAgentResult> {
  return normalizeAssignmentsAgent(
    await structuredMessage<AssignmentsAgentResult>({
      client: opts.client,
      model: AGENT_MODEL,
      fileApiId: opts.fileApiId,
      mime: opts.mime,
      instruction: `Produce the discrete assignment list from the grading table and the schedule.

Return:
{ "assignments": [{ "title", "type", "dueAt", "weight", "description", "quote", "page", "needsReview" }] }

Rules:
- Reconcile the schedule table with the grading table (same paper/exam appears once, with weight if known).
- type: reading, problem-set, paper, lab, exam, quiz, project, presentation, discussion.
- dueAt is ISO (YYYY-MM-DD or YYYY-MM-DDTHH:mm:00). Empty string if unknown.
- If a due day is "Fri" inside a week range like "Week 2 Sep 7 – Sep 11" and the term year is stated, emit that Friday as an ISO date.
- weight is a number or null. Do not write reasoning.`,
    }),
  );
}

export async function runScheduleAgent(opts: AgentOpts): Promise<ScheduleAgentResult> {
  return normalizeScheduleAgent(
    await structuredMessage<ScheduleAgentResult>({
      client: opts.client,
      model: AGENT_MODEL,
      fileApiId: opts.fileApiId,
      mime: opts.mime,
      instruction: `Emit recurrence rules and exception dates — not an expanded list of every class meeting.

Return:
{
  "recurrence": [{ "kind", "title", "days", "start", "end", "location", "from", "to", "skipDates" }],
  "oneOffs": [{ "kind", "title", "startsAt", "endsAt", "location" }],
  "warnings": []
}

Rules:
- kind is "class" or "office-hours". Always emit one class rule for the weekly meeting pattern and one office-hours rule per listed office-hour block.
- days MUST be integers: 0 = Sunday, 1 = Monday, … 6 = Saturday. "M/W 11–12:15 pm" → days [1, 3]. Never write weekday names.
- start/end are 24-hour HH:mm. "1:30 – 3:30 pm" → start "13:30", end "15:30".
- title on the class rule should be the course title (e.g. "PSYC 179 — Cognitive Psychology and the Brain").
- title on each office-hours rule must be the course name plus "office hours" (e.g. "PSYC 179 office hours"). Never reuse the class title.
- from/to are ISO dates for the term. If the syllabus states a year and "classes begin Monday, August 31" / "instruction ends Friday, December 11", set from and to to those dates. If only a term label is given ("Fall 2026"), still emit the weekly rules and leave from/to empty.
- skipDates: holidays, breaks, and cancelled meetings (ISO dates).
- oneOffs: midterms, finals, single room changes, special sessions — not the regular weekly meetings.
- warnings must be []. Do not write reasoning.`,
    }),
  );
}

export async function runTasksAgent(opts: AgentOpts): Promise<TasksAgentResult> {
  return normalizeTasksAgent(
    await structuredMessage<TasksAgentResult>({
      client: opts.client,
      model: AGENT_MODEL,
      fileApiId: opts.fileApiId,
      mime: opts.mime,
      instruction: `Suggest a small planner tree for the major assignments (exams, papers, projects, presentations, problem sets).

Return:
{ "tasks": [{ "title", "assignmentTitle", "dueAt", "description", "children": [{ "title", "description" }] }] }

Rules:
- One parent task per major assignment. 1–4 children when useful (read, outline, draft, review).
- assignmentTitle must match an assignment title from the syllabus.
- dueAt mirrors the assignment due date when known (ISO).
- Skip generic weekly reading responses unless they have a specific listed date.
- Do not write reasoning.`,
    }),
  );
}
