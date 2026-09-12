import {
  durationMinutes,
  minutesFromStored,
  parseStoredDate,
  type StoredCalendarEvent,
} from "@/lib/calendar-events";
import { type CalendarKind } from "@/lib/mock-data";
import type { ViewDataset } from "@/lib/views";

/**
 * The slice of a view's dataset the calendar needs. Passed in rather than
 * imported so the screen renders whichever view is active.
 */
export type CalendarSource = Pick<
  ViewDataset,
  | "calendarCourses"
  | "officeHours"
  | "deadlines"
  | "studySessions"
  | "storedCalendar"
>;

function storedKindToChip(kind: StoredCalendarEvent["kind"]): CalendarKind {
  if (kind === "class") return "course";
  if (kind === "exam") return "deadline";
  return kind;
}

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

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function startOfWeek(date: Date) {
  const day = startOfDay(date);
  day.setDate(day.getDate() - day.getDay());
  return day;
}

/** Seven days, Sunday–Saturday, covering `date`. */
export function buildWeekDays(date: Date): Date[] {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** "11am" / "12:15pm" — compact labels like Google Calendar. */
export function formatTimeCompact(minutes: number) {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h24 >= 12 ? "pm" : "am";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, "0")}${suffix}`;
}

export function formatHourLabel(hour: number) {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

export type PositionedEvent = CalendarEvent & {
  /** Visual end — point-in-time events get a 30-minute block. */
  displayEndMin: number;
  col: number;
  cols: number;
};

/** Pack overlapping timed events into columns the way a week grid does. */
export function layoutDayEvents(events: CalendarEvent[]): PositionedEvent[] {
  const timed = events
    .map((event) => ({
      ...event,
      displayEndMin:
        event.endMin > event.startMin ? event.endMin : event.startMin + 30,
    }))
    .sort(
      (a, b) =>
        a.startMin - b.startMin || a.displayEndMin - b.displayEndMin,
    );

  const positioned: PositionedEvent[] = [];
  let cluster: typeof timed = [];
  let clusterEnd = -1;

  const flush = () => {
    if (cluster.length === 0) return;
    const colEnds: number[] = [];
    const assignments: number[] = [];
    for (const event of cluster) {
      let col = colEnds.findIndex((end) => end <= event.startMin);
      if (col === -1) {
        col = colEnds.length;
        colEnds.push(event.displayEndMin);
      } else {
        colEnds[col] = event.displayEndMin;
      }
      assignments.push(col);
    }
    const cols = colEnds.length;
    cluster.forEach((event, i) => {
      positioned.push({ ...event, col: assignments[i] ?? 0, cols });
    });
    cluster = [];
    clusterEnd = -1;
  };

  for (const event of timed) {
    if (cluster.length > 0 && event.startMin >= clusterEnd) flush();
    cluster.push(event);
    clusterEnd = Math.max(clusterEnd, event.displayEndMin);
  }
  flush();
  return positioned;
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
 * Everything on a given date. Seeded mocks still resolve by weekday / day of
 * month. Ingested events match a real ISO `startsAt`.
 */
export function eventsForDate(
  date: Date,
  source: CalendarSource,
): CalendarEvent[] {
  const weekday = date.getDay();
  const dayOfMonth = date.getDate();
  const events: CalendarEvent[] = [];

  for (const stored of source.storedCalendar ?? []) {
    const start = parseStoredDate(stored.startsAt);
    if (Number.isNaN(start.getTime()) || !isSameDay(start, date)) continue;
    const startMin = minutesFromStored(stored.startsAt);
    const endMin = minutesFromStored(stored.endsAt);
    events.push({
      id: stored.id,
      kind: storedKindToChip(stored.kind),
      code: stored.courseSlug.replace(/-/g, " ").toUpperCase(),
      title: stored.title,
      startMin,
      endMin: endMin > startMin ? endMin : startMin,
      location: stored.location,
    });
  }

  for (const course of source.calendarCourses) {
    if (!course.days.includes(weekday)) continue;
    events.push({
      id: `course-${course.code}-${dayOfMonth}`,
      kind: "course",
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
  const mock = source.studySessions.reduce(
    (total, s) => total + (toMinutes(s.end) - toMinutes(s.start)),
    0,
  );
  const stored = (source.storedCalendar ?? [])
    .filter((event) => event.kind === "session")
    .reduce((total, event) => total + durationMinutes(event), 0);
  return mock + stored;
}

export function loggedMinutesForDate(date: Date, source: CalendarSource) {
  return eventsForDate(date, source)
    .filter((e) => e.kind === "session")
    .reduce((total, e) => total + (e.endMin - e.startMin), 0);
}
