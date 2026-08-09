import { type CalendarKind } from "@/lib/mock-data";
import type { ViewDataset } from "@/lib/views";

/**
 * The slice of a view's dataset the calendar needs. Passed in rather than
 * imported so the screen renders whichever view is active.
 */
export type CalendarSource = Pick<
  ViewDataset,
  "courses" | "officeHours" | "deadlines" | "studySessions"
>;

export type CalendarEvent = {
  id: string;
  kind: CalendarKind;
  code: string;
  title: string;
  /** Minutes from midnight. */
  startMin: number;
  endMin: number;
  location?: string;
};

export type MonthDay = {
  date: Date;
  inMonth: boolean;
};

/** "09:30" -> 570 */
export function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function formatTime(minutes: number) {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Six weeks of days covering the month, padded with neighbouring months. */
export function buildMonthGrid(year: number, month: number): MonthDay[][] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());

  const weeks: MonthDay[][] = [];
  const cursor = new Date(start);

  for (let w = 0; w < 6; w++) {
    const week: MonthDay[] = [];
    for (let d = 0; d < 7; d++) {
      week.push({
        date: new Date(cursor),
        inMonth: cursor.getMonth() === month,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  return weeks;
}

/**
 * Everything on a given date: recurring classes and office hours resolve by
 * weekday, deadlines and logged sessions by day of month.
 */
export function eventsForDate(
  date: Date,
  source: CalendarSource,
): CalendarEvent[] {
  const weekday = date.getDay();
  const dayOfMonth = date.getDate();
  const events: CalendarEvent[] = [];

  for (const course of source.courses) {
    if (!course.days.includes(weekday)) continue;
    events.push({
      id: `class-${course.code}-${dayOfMonth}`,
      kind: "class",
      code: course.code,
      title: course.title,
      startMin: toMinutes(course.start),
      endMin: toMinutes(course.end),
      location: course.location,
    });
  }

  for (const oh of source.officeHours) {
    if (oh.day !== weekday) continue;
    events.push({
      id: `oh-${oh.code}-${dayOfMonth}`,
      kind: "office-hours",
      code: oh.code,
      title: oh.title,
      startMin: toMinutes(oh.start),
      endMin: toMinutes(oh.end),
      location: oh.location,
    });
  }

  for (const due of source.deadlines) {
    if (due.day !== dayOfMonth) continue;
    const at = toMinutes(due.at);
    events.push({
      id: `due-${due.code}-${due.title}`,
      kind: "deadline",
      code: due.code,
      title: due.title,
      startMin: at,
      endMin: at,
    });
  }

  for (const session of source.studySessions) {
    if (session.day !== dayOfMonth) continue;
    events.push({
      id: `session-${session.code}-${session.title}`,
      kind: "session",
      code: session.code,
      title: session.title,
      startMin: toMinutes(session.start),
      endMin: toMinutes(session.end),
    });
  }

  return events.sort((a, b) => a.startMin - b.startMin);
}

/** Total logged study time for the month, in minutes. */
export function loggedMinutesForMonth(source: CalendarSource) {
  return source.studySessions.reduce(
    (total, s) => total + (toMinutes(s.end) - toMinutes(s.start)),
    0,
  );
}

export function loggedMinutesForDate(date: Date, source: CalendarSource) {
  return eventsForDate(date, source)
    .filter((e) => e.kind === "session")
    .reduce((total, e) => total + (e.endMin - e.startMin), 0);
}
