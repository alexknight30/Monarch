"use client";

import { formatDisplayDate } from "@/lib/calendar-events";
import type { Proposal } from "@/lib/source-documents";
import { rematerializeCalendar } from "@/lib/syllabus/materialize";

type SyllabusProposalProps = {
  proposal: Proposal;
  excluded: Set<string>;
  onChange: (next: Proposal) => void;
  onToggleAssignment: (id: string) => void;
};

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] leading-4 font-medium text-[#7A7A7A]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 rounded-md border border-[#E6E6E6] px-2 text-[13px] text-[#0A0A0A] outline-none focus:border-[#0A0A0A]"
      />
    </label>
  );
}

export function SyllabusProposal({
  proposal,
  excluded,
  onChange,
  onToggleAssignment,
}: SyllabusProposalProps) {
  const course = proposal.course;
  const includedAssignments = proposal.assignments.filter((item) => !excluded.has(item.id));
  const calendarEvents = proposal.calendarEvents.filter((event) => {
    if (!event.assignmentId) return true;
    return !excluded.has(event.assignmentId);
  });
  const classCount = calendarEvents.filter((event) => event.kind === "class").length;
  const officeCount = calendarEvents.filter((event) => event.kind === "office-hours").length;
  const deadlineCount = calendarEvents.filter(
    (event) => event.kind === "deadline" || event.kind === "exam",
  ).length;
  const upcoming = [...calendarEvents]
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, 5);

  const patchCourse = (patch: Partial<typeof course>) => {
    const next = { ...proposal, course: { ...course, ...patch } };
    if ("termStartsAt" in patch || "termEndsAt" in patch) {
      next.calendarEvents = rematerializeCalendar(next);
    }
    onChange(next);
  };

  return (
    <div className="flex max-h-[420px] flex-col gap-4 overflow-y-auto rounded-[1.125rem] border border-dashed border-foreground/20 bg-background p-4">
      <div>
        <p className="font-display text-[18px] leading-6 tracking-[-0.015em] text-[#0A0A0A]">
          Ready to add {course.code || "this course"}
        </p>
        <p className="pt-1 text-[13px] leading-5 text-[#6B6B6B]">
          Review what we read from the syllabus, then add the course.
        </p>
      </div>

      {proposal.warnings.length > 0 && (
        <div className="space-y-1.5 rounded-lg bg-[#F7F4EC] px-3 py-2">
          {proposal.warnings.map((warning, index) => (
            <p key={`${warning.field}-${index}`} className="text-[12px] leading-4 text-[#5C5346]">
              {warning.message}
            </p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Code" value={course.code} onChange={(code) => patchCourse({ code })} />
        <Field label="Title" value={course.title} onChange={(title) => patchCourse({ title })} />
        <Field
          label="Instructor"
          value={course.instructor}
          onChange={(instructor) => patchCourse({ instructor })}
        />
        <Field label="Term" value={course.term} onChange={(term) => patchCourse({ term })} />
        <Field
          label="Term starts"
          type="date"
          value={course.termStartsAt ?? ""}
          onChange={(termStartsAt) => patchCourse({ termStartsAt: termStartsAt || undefined })}
        />
        <Field
          label="Term ends"
          type="date"
          value={course.termEndsAt ?? ""}
          onChange={(termEndsAt) => patchCourse({ termEndsAt: termEndsAt || undefined })}
        />
      </div>
      <p className="text-[12px] leading-4 text-[#6B6B6B]">{course.schedule}</p>

      <section>
        <h3 className="text-[12px] font-medium tracking-[0.02em] text-[#7A7A7A] uppercase">
          Assignments · {includedAssignments.length}
        </h3>
        <ul className="mt-2 space-y-1.5">
          {proposal.assignments.map((assignment) => (
            <li key={assignment.id}>
              <label className="flex items-start gap-2 text-[13px] leading-5 text-[#1A1A1A]">
                <input
                  type="checkbox"
                  checked={!excluded.has(assignment.id)}
                  onChange={() => onToggleAssignment(assignment.id)}
                  className="mt-1"
                />
                <span className="min-w-0">
                  <span className="font-medium">{assignment.title}</span>
                  <span className="text-[#7A7A7A]">
                    {" "}
                    · {assignment.type}
                    {assignment.weight != null ? ` · ${assignment.weight}%` : ""}
                    {` · ${formatDisplayDate(assignment.dueAt)}`}
                  </span>
                </span>
              </label>
            </li>
          ))}
          {proposal.assignments.length === 0 && (
            <li className="text-[13px] text-[#7A7A7A]">No assignments found.</li>
          )}
        </ul>
      </section>

      <section>
        <h3 className="text-[12px] font-medium tracking-[0.02em] text-[#7A7A7A] uppercase">
          Calendar · {classCount} classes · {officeCount} office hours · {deadlineCount}{" "}
          deadlines
        </h3>
        <ul className="mt-2 space-y-1">
          {upcoming.map((event) => (
            <li key={event.id} className="text-[13px] leading-5 text-[#1A1A1A]">
              {formatDisplayDate(event.startsAt)} · {event.title}
            </li>
          ))}
          {upcoming.length === 0 && (
            <li className="text-[13px] text-[#7A7A7A]">
              No dated events yet. Add term dates if class meetings are missing.
            </li>
          )}
        </ul>
      </section>

      <section>
        <h3 className="text-[12px] font-medium tracking-[0.02em] text-[#7A7A7A] uppercase">
          Suggested tasks
        </h3>
        <ul className="mt-2 space-y-1.5">
          {proposal.tasks
            .filter((task) => !task.assignmentId || !excluded.has(task.assignmentId))
            .map((task) => (
              <li key={task.key} className="text-[13px] leading-5 text-[#1A1A1A]">
                <span className="font-medium">{task.title}</span>
                {task.children?.length ? (
                  <ul className="mt-0.5 pl-3 text-[#6B6B6B]">
                    {task.children.map((child) => (
                      <li key={child.key}>{child.title}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          {proposal.tasks.length === 0 && (
            <li className="text-[13px] text-[#7A7A7A]">No suggested tasks.</li>
          )}
        </ul>
      </section>
    </div>
  );
}

export function filterProposal(proposal: Proposal, excluded: Set<string>): Proposal {
  const assignments = proposal.assignments.filter((item) => !excluded.has(item.id));
  const calendarEvents = proposal.calendarEvents.filter((event) => {
    if (!event.assignmentId) return true;
    return !excluded.has(event.assignmentId);
  });
  const tasks = proposal.tasks.filter(
    (task) => !task.assignmentId || !excluded.has(task.assignmentId),
  );
  return { ...proposal, assignments, calendarEvents, tasks };
}
