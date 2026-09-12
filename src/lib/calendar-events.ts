import type { TagId } from "@/lib/objects/tags";
import type { EventTiming } from "@/lib/objects/types";

export const STORED_CALENDAR_KINDS = [
  "class",
  "office-hours",
  "deadline",
  "exam",
  "session",
] as const;

export type StoredCalendarKind = (typeof STORED_CALENDAR_KINDS)[number];

export type StoredCalendarEvent = {
  id: string;
  courseId: string;
  courseSlug: string;
  kind: StoredCalendarKind;
  timing: EventTiming;
  tagIds: TagId[];
  title: string;
  startsAt: string;
  endsAt: string;
  location?: string;
  assignmentId?: string;
  generatedBy: "syllabus" | "user";
  seriesId?: string;
};

/** Parse an ISO date or datetime as a local calendar day when no offset is given. */
export function parseStoredDate(value: string): Date {
  const trimmed = value.trim();
  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(trimmed)) return new Date(trimmed);
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateOnly) {
    return new Date(
      Number(dateOnly[1]),
      Number(dateOnly[2]) - 1,
      Number(dateOnly[3]),
    );
  }
  const local = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(
    trimmed,
  );
  if (local) {
    return new Date(
      Number(local[1]),
      Number(local[2]) - 1,
      Number(local[3]),
      Number(local[4]),
      Number(local[5]),
      local[6] ? Number(local[6]) : 0,
    );
  }
  return new Date(trimmed);
}

export function minutesFromStored(value: string) {
  const date = parseStoredDate(value);
  return date.getHours() * 60 + date.getMinutes();
}

export function durationMinutes(event: StoredCalendarEvent) {
  return Math.max(
    0,
    minutesFromStored(event.endsAt) - minutesFromStored(event.startsAt),
  );
}

export function formatDisplayDate(value: string | null | undefined) {
  if (!value) return "TBD";
  const date = parseStoredDate(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
