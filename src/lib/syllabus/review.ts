import type { Proposal } from "../source-documents";
import type { PlannerIssue } from "../planner";
import type { StoredCalendarEvent } from "../calendar-events";
import { formatDisplayDate } from "../calendar-events";
import { validateStoredDate } from "../stored-date";

/** Assignment edits in review must also change the proposed deadlines and task dates. */
export function syncReviewedAssignments(proposal: Proposal): Proposal {
  const calendarEvents = proposal.calendarEvents.filter(event => !event.assignmentId);
  for (const assignment of proposal.assignments) {
    if (!assignment.dueAt) continue;
    const previous = proposal.calendarEvents.find(event => event.assignmentId === assignment.id);
    const event: StoredCalendarEvent = {
      ...previous,
      id: previous?.id || `deadline-${assignment.id}`,
      courseId: proposal.course.id, courseSlug: proposal.course.slug,
      assignmentId: assignment.id, title: assignment.title,
      startsAt: assignment.dueAt, endsAt: assignment.dueAt,
      kind: ["exam", "quiz"].includes(assignment.type) ? "exam" : "deadline",
      timing: "deadline", generatedBy: "syllabus",
      tagIds: [assignment.type === "exam" ? "exam" : assignment.type === "quiz" ? "quiz" : "assignment"],
    };
    calendarEvents.push(event);
  }
  const tasks = (items: PlannerIssue[]): PlannerIssue[] => items.map(task => {
    const assignment = proposal.assignments.find(a => a.id === task.assignmentId);
    return { ...task,
      ...(assignment ? { assignment: assignment.title, dueAt: assignment.dueAt || undefined, due: assignment.dueAt ? formatDisplayDate(assignment.dueAt) : undefined } : {}),
      ...(task.children ? { children: tasks(task.children) } : {}),
    };
  });
  return { ...proposal, calendarEvents, tasks: tasks(proposal.tasks) };
}

export function validateReviewedProposal(proposal: Proposal) {
  const start = validateStoredDate(proposal.course.termStartsAt);
  const end = validateStoredDate(proposal.course.termEndsAt);
  if (start && end && (end < start || +new Date(end) - +new Date(start) > 730 * 86400000)) throw new Error("Use term dates in order, spanning two years or less.");
  for (const assignment of proposal.assignments) {
    if (!assignment.title?.trim()) throw new Error("Every assignment needs a title.");
    validateStoredDate(assignment.dueAt);
    if (assignment.weight !== null && (!Number.isFinite(assignment.weight) || assignment.weight < 0 || assignment.weight > 100)) throw new Error("Assignment weights must be between 0 and 100.");
  }
  for (const event of proposal.calendarEvents) {
    validateStoredDate(event.startsAt, true); validateStoredDate(event.endsAt, true);
  }
}
