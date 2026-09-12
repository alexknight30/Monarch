import type { StoredCalendarEvent } from "@/lib/calendar-events";
import type { Artifact, Course } from "@/lib/mock-data";
import { flatten, type PlannerIssue } from "@/lib/planner";

export function artifactBelongsToCourse(artifact: Artifact, course: Course) {
  if (artifact.courseId === course.id || artifact.courseSlug === course.slug) {
    return true;
  }
  return "course" in artifact && artifact.course === course.code;
}

export function issueBelongsToCourse(issue: PlannerIssue, course: Course) {
  return flatten(issue).some(
    (item) =>
      item.courseId === course.id ||
      item.courseSlug === course.slug ||
      item.course === course.code,
  );
}

export type CalendarGroup = {
  id: string;
  title: string;
  kind: StoredCalendarEvent["kind"];
  location?: string;
  count: number;
  events: StoredCalendarEvent[];
};

const KIND_ORDER: Record<StoredCalendarEvent["kind"], number> = {
  class: 0,
  "office-hours": 1,
  session: 2,
  exam: 3,
  deadline: 4,
};

export function groupCourseEvents(
  events: StoredCalendarEvent[],
): CalendarGroup[] {
  const bySeries = new Map<string, StoredCalendarEvent[]>();
  const singles: StoredCalendarEvent[] = [];

  for (const event of events) {
    if (event.seriesId) {
      const list = bySeries.get(event.seriesId) ?? [];
      list.push(event);
      bySeries.set(event.seriesId, list);
    } else {
      singles.push(event);
    }
  }

  const groups: CalendarGroup[] = [];

  for (const [seriesId, list] of bySeries) {
    const sorted = [...list].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    groups.push({
      id: seriesId,
      title: sorted[0]?.title ?? "Repeating event",
      kind: sorted[0]?.kind ?? "class",
      location: sorted[0]?.location,
      count: sorted.length,
      events: sorted,
    });
  }

  for (const event of singles) {
    groups.push({
      id: event.id,
      title: event.title,
      kind: event.kind,
      location: event.location,
      count: 1,
      events: [event],
    });
  }

  groups.sort((a, b) => {
    const kind = (KIND_ORDER[a.kind] ?? 9) - (KIND_ORDER[b.kind] ?? 9);
    if (kind !== 0) return kind;
    return (a.events[0]?.startsAt ?? "").localeCompare(b.events[0]?.startsAt ?? "");
  });

  return groups;
}
