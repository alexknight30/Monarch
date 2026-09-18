import { structuredMessage,type SyllabusInput } from "@/lib/syllabus/provider";
import {
  normalizeExtraction,
  type SyllabusExtraction,
} from "@/lib/syllabus/schema";

const EXTRACT_PROMPT = `Extract facts from this course syllabus.

Return this shape:
{
  "course": { "code", "title", "description", "instructor", "instructorEmail", "instructorOffice", "term", "termStartsAt", "termEndsAt", "scheduleText" },
  "meetings": [{ "kind", "days", "start", "end", "location" }],
  "officeHours": [{ "host", "day", "start", "end", "location", "mode" }],
  "assignments": [{ "title", "type", "dueAt", "weight", "description", "quote", "page", "needsReview" }],
  "recurrence": [{ "kind", "title", "days", "start", "end", "location", "from", "to", "skipDates" }],
  "oneOffs": [{ "kind", "title", "startsAt", "endsAt", "location" }],
  "grading": [{ "component", "weight" }],
  "policies": { "late", "attendance", "ai", "integrity" },
  "warnings": []
}

Rules:
- Read the header first. code and title are usually on the first line (e.g. "PSYC 179 — Cognitive Psychology and the Brain").
- Copy names, emails, rooms, times, and weights from the document.
- Dates must be ISO. Date-only as YYYY-MM-DD. Datetimes as YYYY-MM-DDTHH:mm:00 (no timezone).
- If the syllabus states a term year (e.g. "Fall Semester 2026") and a start/end day ("classes begin Monday, August 31", "instruction ends Friday, December 11"), combine them: termStartsAt "2026-08-31", termEndsAt "2026-12-11". That is reading, not guessing.
- Weekdays MUST be integers: 0 = Sunday, 1 = Monday, ... 6 = Saturday. Never write names like "Monday".
- Recurrence: rules plus skipDates (breaks, holidays, no-class days). Do not expand every meeting.
- Office-hours recurrence titles are the course name plus "office hours" (e.g. "PSYC 179 office hours"), not the class title and not the professor's name.
- Assignments: one row per discrete due date.
- warnings must be []. Never write reasoning, notes, or an internal monologue.

Return only the JSON object.`;

export async function extractSyllabus(opts:SyllabusInput): Promise<SyllabusExtraction> {
  const raw = await structuredMessage<SyllabusExtraction>({
    ...opts,
    instruction: EXTRACT_PROMPT,
    maxTokens: 16000,
  });
  return normalizeExtraction(raw);
}
