"use client";
import { DesignCopy } from "@/components/design/runtime";


import { formatDisplayDate } from "@/lib/calendar-events";
import type { Proposal } from "@/lib/source-documents";
import { rematerializeCalendar } from "@/lib/syllabus/materialize";
import { syncReviewedAssignments } from "@/lib/syllabus/review";
import type { Assignment } from "@/lib/assignments";

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
    <label data-design-id="m-61f178702efe" className="flex min-w-0 flex-col gap-1">
      <span data-design-id="m-4c5defd19f08" className="text-[11px] leading-4 font-medium text-[#7A7A7A]">{label}</span>
      <input data-design-id="m-1eb32e142317"
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
  const patchAssignment = (id: string, patch: Partial<Assignment>) => {
    onChange(syncReviewedAssignments({...proposal, assignments:proposal.assignments.map(a=>a.id===id?{...a,...patch,needsReview:false}:a)}));
  };

  return (
    <div data-design-id="m-54f1a0131b38" className="flex max-h-[420px] flex-col gap-4 overflow-y-auto rounded-[1.125rem] border border-dashed border-foreground/20 bg-background p-4">
      <div data-design-id="m-2800885acd0d">
        <p data-design-id="m-bd855e3560e7" className="font-display text-[18px] leading-6 tracking-[-0.015em] text-[#0A0A0A]">
          Ready to add {course.code || "this course"}
        </p>
        <p data-design-id="m-e210341fc6be" className="pt-1 text-[13px] leading-5 text-[#6B6B6B]"><DesignCopy id="m-e210341fc6be">
          Review what we read from the syllabus, then add the course.
        </DesignCopy></p>
      </div>

      {proposal.warnings.length > 0 && (
        <div data-design-id="m-8a5c3bc033a6" className="space-y-1.5 rounded-lg bg-[#F7F4EC] px-3 py-2">
          {proposal.warnings.map((warning, index) => (
            <p data-design-id="m-841e43b72a84" key={`${warning.field}-${index}`} className="text-[12px] leading-4 text-[#5C5346]">
              {warning.message}
            </p>
          ))}
        </div>
      )}

      <div data-design-id="m-6fd1da39041b" className="grid grid-cols-2 gap-2.5">
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
      <p data-design-id="m-36ea36510949" className="text-[12px] leading-4 text-[#6B6B6B]">{course.schedule}</p>

      <section data-design-id="m-8f848556cbc0">
        <h3 data-design-id="m-901e2bf4c95a" className="text-[12px] font-medium tracking-[0.02em] text-[#7A7A7A] uppercase">
          Assignments · {includedAssignments.length}
        </h3>
        <ul data-design-id="m-7f4883bf16c1" className="mt-2 space-y-1.5">
          {proposal.assignments.map((assignment) => (
            <li data-design-id="m-26c5a2e9a203" data-design-key={assignment.id} key={assignment.id} className="rounded-lg border border-stone-200 p-3">
              <label data-design-id="m-b0cb7e4583dc" className="flex items-start gap-2 text-[13px] leading-5 text-[#1A1A1A]">
                <input data-design-id="m-81ba3e176c92"
                  type="checkbox"
                  checked={!excluded.has(assignment.id)}
                  onChange={() => onToggleAssignment(assignment.id)}
                  className="mt-1"
                />
                <span data-design-id="m-1835ccd60096" className="min-w-0">
                  <span data-design-id="m-3ca17fafe198" className="font-medium">{assignment.title}</span>
                  <span data-design-id="m-6e3be9860066" className="text-[#7A7A7A]">
                    {" "}
                    · {assignment.type}
                    {assignment.weight != null ? ` · ${assignment.weight}%` : ""}
                    {` · ${formatDisplayDate(assignment.dueAt)}`}
                  </span>
                </span>
              </label>
              <div data-design-id="m-1a81e866d31a" className="mt-2 grid grid-cols-2 gap-2">
                <Field label="Assignment title" value={assignment.title} onChange={title=>patchAssignment(assignment.id,{title})}/>
                <Field label="Grade weight (%)" type="number" value={assignment.weight === null ? "" : String(assignment.weight)} onChange={value=>patchAssignment(assignment.id,{weight:value === "" ? null : Number(value)})}/>
                <Field label="Due date" type="date" value={assignment.dueAt?.slice(0,10) || ""} onChange={day=>patchAssignment(assignment.id,{dueAt:day ? day+(assignment.dueAt?.includes("T") ? assignment.dueAt.slice(10) : "") : null})}/>
                <Field label="Time (optional)" type="time" value={assignment.dueAt?.includes("T") ? assignment.dueAt.slice(11,16) : ""} onChange={time=>{if(assignment.dueAt)patchAssignment(assignment.id,{dueAt:assignment.dueAt.slice(0,10)+(time?`T${time}`:"")});}}/>
              </div>
              {assignment.source?.quote && <blockquote data-design-id="m-77ddbaf46cd4" className="mt-2 text-xs leading-5 text-stone-500">{assignment.source.quote}</blockquote>}
              {assignment.needsReview && <p data-design-id="m-67c3388eaba8" className="mt-1 text-xs text-amber-700"><DesignCopy id="m-67c3388eaba8">Check this assignment against the syllabus.</DesignCopy></p>}
            </li>
          ))}
          {proposal.assignments.length === 0 && (
            <li data-design-id="m-8a9609d246aa" className="text-[13px] text-[#7A7A7A]"><DesignCopy id="m-8a9609d246aa">No assignments found.</DesignCopy></li>
          )}
        </ul>
      </section>

      <section data-design-id="m-61e03d611d8d">
        <h3 data-design-id="m-20e4386bd61f" className="text-[12px] font-medium tracking-[0.02em] text-[#7A7A7A] uppercase">
          Calendar · {classCount} classes · {officeCount} office hours · {deadlineCount}{" "}
          deadlines
        </h3>
        <ul data-design-id="m-4be9ef7347b4" className="mt-2 space-y-1">
          {upcoming.map((event) => (
            <li data-design-id="m-6a7a47ea04ab" data-design-key={event.id} key={event.id} className="text-[13px] leading-5 text-[#1A1A1A]">
              {formatDisplayDate(event.startsAt)} · {event.title}
            </li>
          ))}
          {upcoming.length === 0 && (
            <li data-design-id="m-f812774107bf" className="text-[13px] text-[#7A7A7A]"><DesignCopy id="m-f812774107bf">
              No dated events yet. Add term dates if class meetings are missing.
            </DesignCopy></li>
          )}
        </ul>
      </section>

      <section data-design-id="m-94254308bf59">
        <h3 data-design-id="m-2efc47cfc436" className="text-[12px] font-medium tracking-[0.02em] text-[#7A7A7A] uppercase"><DesignCopy id="m-2efc47cfc436">
          Suggested tasks
        </DesignCopy></h3>
        <ul data-design-id="m-8cb1a9386a92" className="mt-2 space-y-1.5">
          {proposal.tasks
            .filter((task) => !task.assignmentId || !excluded.has(task.assignmentId))
            .map((task) => (
              <li data-design-id="m-b25e63269dc8" data-design-key={task.key} key={task.key} className="text-[13px] leading-5 text-[#1A1A1A]">
                <span data-design-id="m-aada6097a5b6" className="font-medium">{task.title}</span>
                {task.children?.length ? (
                  <ul data-design-id="m-227cac5989ef" className="mt-0.5 pl-3 text-[#6B6B6B]">
                    {task.children.map((child) => (
                      <li data-design-id="m-fe7f89060e71" data-design-key={child.key} key={child.key}>{child.title}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          {proposal.tasks.length === 0 && (
            <li data-design-id="m-7d08dde1a755" className="text-[13px] text-[#7A7A7A]"><DesignCopy id="m-7d08dde1a755">No suggested tasks.</DesignCopy></li>
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
