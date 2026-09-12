import { issueBelongsToCourse } from "@/lib/course-context";
import { readViewStore } from "@/lib/local-db";
import type { ViewId } from "@/lib/views";

/** Compact course brief so a class-scoped chat knows the syllabus facts we have. */
export async function buildCourseSystemAddendum(
  viewId: ViewId,
  slug: string,
): Promise<string | null> {
  const store = await readViewStore(viewId);
  const course = store.courses.find((item) => item.slug === slug);
  if (!course) return null;

  const docs = store.documents.filter(
    (doc) => doc.courseSlug === slug || doc.id === course.sourceDocumentId,
  );
  const tasks = store.planner.filter((issue) =>
    issueBelongsToCourse(issue, course),
  );
  const upcoming = store.calendar
    .filter((event) => event.courseSlug === slug)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, 10);

  return [
    "The student started this chat from a course page. Stay focused on this course unless they change the subject.",
    `Course: ${course.code} — ${course.title}`,
    `Instructor: ${course.instructor}`,
    `Term: ${course.term}`,
    `Schedule: ${course.schedule}`,
    course.description ? `Description: ${course.description}` : "",
    course.instructorEmail ? `Instructor email: ${course.instructorEmail}` : "",
    docs.length
      ? `Readings / attachments:\n${docs.map((doc) => `- ${doc.filename}`).join("\n")}`
      : "",
    tasks.length
      ? `Tasks:\n${tasks
          .map(
            (task) =>
              `- ${task.key}: ${task.title}${task.due ? ` (${task.due})` : ""}`,
          )
          .join("\n")}`
      : "",
    upcoming.length
      ? `Upcoming calendar items:\n${upcoming
          .map((event) => `- ${event.title} (${event.kind}) ${event.startsAt}`)
          .join("\n")}`
      : "",
    "Use planner tools when they ask to add or change work for this course. Prefer this course's code and slug. Do not invent syllabus facts that are not listed here.",
  ]
    .filter(Boolean)
    .join("\n");
}
