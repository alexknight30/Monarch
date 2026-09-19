"use client";
import { DesignCopy } from "@/components/design/runtime";


import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BreadcrumbBack } from "@/components/ui/breadcrumb-back";
import type { Assignment } from "@/lib/assignments";
import { formatAttachmentSize } from "@/lib/chat-attachments";
import { formatTime } from "@/lib/calendar";
import {
  formatDisplayDate,
  parseStoredDate,
  type StoredCalendarEvent,
} from "@/lib/calendar-events";
import { groupCourseEvents } from "@/lib/course-context";
import {
  ARTIFACT_KIND_LABEL,
  type Artifact,
  type Course,
  type CourseOfficeHour,
} from "@/lib/mock-data";
import { STATUS_LABEL, type PlannerIssue } from "@/lib/planner";
import type { ViewId } from "@/lib/views";
import { AcademicManager } from "@/components/academic-manager";
import { CourseEditor } from "@/components/course-editor";

type CourseDocument = {
  id: string;
  filename: string;
  mime: string;
  sizeBytes: number;
};

type CourseDetailClientProps = {
  course: Course;
  viewId: ViewId;
  documents: CourseDocument[];
  readingAssignments: Assignment[];
  readingArtifacts: { slug: string; title: string }[];
  artifacts: Artifact[];
  events: StoredCalendarEvent[];
  tasks: PlannerIssue[];
};

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const EVENT_KIND_LABEL: Record<StoredCalendarEvent["kind"], string> = {
  class: "Class",
  "office-hours": "Office hours",
  deadline: "Deadline",
  exam: "Exam",
  session: "Session",
};

function formatClock(time: string) {
  const [hRaw, mRaw] = time.split(":");
  const h24 = Number(hRaw);
  const m = Number(mRaw);
  if (!Number.isFinite(h24) || !Number.isFinite(m)) return time;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const minutes = String(m).padStart(2, "0");
  return `${h12}:${minutes} ${h24 >= 12 ? "PM" : "AM"}`;
}

function formatOfficeHour(hour: CourseOfficeHour) {
  const day = DAY_NAMES[hour.day] ?? "";
  const range = `${formatClock(hour.start)}–${formatClock(hour.end)}`;
  const place = [hour.location, hour.mode && hour.mode !== "in-person" ? hour.mode : null]
    .filter(Boolean)
    .join(" · ");
  return [day, range, place].filter(Boolean).join(" · ");
}

function formatEventWhen(startsAt: string, endsAt: string) {
  const start = parseStoredDate(startsAt);
  const end = parseStoredDate(endsAt);
  if (Number.isNaN(start.getTime())) return formatDisplayDate(startsAt);
  const day = start.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const startMin = start.getHours() * 60 + start.getMinutes();
  const endMin = end.getHours() * 60 + end.getMinutes();
  if (Number.isNaN(end.getTime()) || startMin === endMin) {
    return `${day} · ${formatTime(startMin)}`;
  }
  return `${day} · ${formatTime(startMin)}–${formatTime(endMin)}`;
}

function fileKindLabel(mime: string, filename: string) {
  if (mime.includes("pdf") || filename.toLowerCase().endsWith(".pdf")) return "PDF";
  if (mime.startsWith("image/")) return "Image";
  const ext = filename.includes(".") ? filename.split(".").pop() : "";
  return ext ? ext.toUpperCase() : "File";
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      className={`shrink-0 text-[#9A9A98] transition-transform duration-150 ${
        open ? "rotate-90" : ""
      }`}
    >
      <path
        d="M9 6.5l6 5.5-6 5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" className="shrink-0">
      <path
        d="M3.5 7.5A2 2 0 015.5 5.5h4.2l1.6 2H18.5A2 2 0 0120.5 9.5v8a2 2 0 01-2 2h-13a2 2 0 01-2-2z"
        fill="none"
        stroke="#8A8A86"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" className="shrink-0">
      <path
        d="M7 3.5h7L18.5 8v12.5H7A1.5 1.5 0 015.5 19V5A1.5 1.5 0 017 3.5z"
        fill="none"
        stroke="#8A8A86"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M14 3.5V8h4.5"
        fill="none"
        stroke="#8A8A86"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" className="shrink-0">
      <rect
        x="3.5"
        y="5"
        width="17"
        height="15.5"
        rx="2"
        fill="none"
        stroke="#8A8A86"
        strokeWidth="1.7"
      />
      <path
        d="M3.5 10h17M8 3.5v3M16 3.5v3"
        fill="none"
        stroke="#8A8A86"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TaskIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" className="shrink-0">
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="3"
        fill="none"
        stroke="#8A8A86"
        strokeWidth="1.7"
      />
      <path
        d="M8 12.2l2.6 2.6L16.2 9"
        fill="none"
        stroke="#8A8A86"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChatIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0">
      <path
        d="M4 11.2C4 7.2 7.6 4 12 4s8 3.2 8 7.2-3.6 7.2-8 7.2c-.9 0-1.8-.1-2.6-.4L5 19.6l1.1-3.1A6.9 6.9 0 014 11.2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div data-design-id="m-11c7382aff3a" className="grid grid-cols-[132px_minmax(0,1fr)] items-start gap-4 py-[9px]">
      <dt data-design-id="m-e3049ec67276" className="text-[13px] leading-[18px] text-[#9A9A98]">{label}</dt>
      <dd data-design-id="m-50fde7a56338" className="text-[13px] leading-[18px] text-[#0A0A0A]">{value}</dd>
    </div>
  );
}

function TreeRow({
  indent = 0,
  icon,
  name,
  meta,
  expandable,
  open,
  href,
  onToggle,
}: {
  indent?: number;
  icon: "folder" | "file" | "calendar" | "task";
  name: string;
  meta?: string;
  expandable?: boolean;
  open?: boolean;
  href?: string;
  onToggle?: () => void;
}) {
  const Icon =
    icon === "folder"
      ? FolderIcon
      : icon === "calendar"
        ? CalendarIcon
        : icon === "task"
          ? TaskIcon
          : FileIcon;

  const body = (
    <>
      <span data-design-id="m-808164164bca"
        className="flex h-4 w-4 shrink-0 items-center justify-center"
        style={{ marginLeft: indent * 18 }}
      >
        {expandable ? <Chevron open={Boolean(open)} /> : null}
      </span>
      <Icon />
      <span data-design-id="m-c1a4d9fa8435" className="min-w-0 flex-1 truncate text-[13px] leading-4 text-[#0A0A0A]">
        {name}
      </span>
      {meta ? (
        <span data-design-id="m-5c83684e7303" className="shrink-0 text-[12px] leading-4 text-[#9A9A98]">{meta}</span>
      ) : null}
    </>
  );

  const className = `flex w-full items-center gap-2.5 px-3 py-[9px] text-left transition-colors hover:bg-[#F7F7F5]${
    expandable || href ? " cursor-pointer" : ""
  }`;

  if (expandable) {
    return (
      <button data-design-id="m-3110ebfcd9b0" type="button" onClick={onToggle} className={className}>
        {body}
      </button>
    );
  }

  if (href) {
    const external = href.startsWith("/api/");
    if (external) {
      return (
        <a data-design-id="m-4f0d12869703" href={href} target="_blank" rel="noreferrer" className={className}>
          {body}
        </a>
      );
    }
    return (
      <Link data-design-id="m-2c0575aaef49" href={href} className={className}>
        {body}
      </Link>
    );
  }

  return <div data-design-id="m-a5490018eda6" className={className}>{body}</div>;
}

function EmptyFolder({ indent = 1 }: { indent?: number }) {
  return (
    <div data-design-id="m-348cb01cdd7f"
      className="px-3 py-2 text-[12px] leading-4 text-[#B0B0AC]"
      style={{ paddingLeft: 38 + indent * 18 }}
    ><DesignCopy id="m-348cb01cdd7f">
      Nothing here yet
    </DesignCopy></div>
  );
}

function CourseChatBubble({ course }: { course: Course }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chatHref = useMemo(() => {
    const params = new URLSearchParams({
      course: course.slug,
      code: course.code,
      title: course.title,
    });
    return `/chat?${params.toString()}`;
  }, [course.code, course.slug, course.title]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 20);
    const onPointer = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const startChat = (prompt?: string) => {
    const params = new URLSearchParams({
      course: course.slug,
      code: course.code,
      title: course.title,
    });
    if (prompt?.trim()) params.set("q", prompt.trim());
    router.push(`/chat?${params.toString()}`);
  };

  return (
    <div data-design-id="m-f00fa2ad6df0" ref={panelRef} className="absolute right-6 bottom-6 z-30 flex flex-col items-end gap-3">
      {open ? (
        <div data-design-id="m-674cb0be74ce" className="w-[320px] rounded-2xl border border-[#E8E8E6] bg-white p-3.5 shadow-[0_12px_40px_rgba(20,20,18,0.12)]">
          <p data-design-id="m-b9a53ea8c456" className="text-[13px] leading-4 text-[#7A7A7A]">
            Ask about {course.code}
          </p>
          <form data-design-id="m-7e243e6a8995"
            className="mt-2.5 flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              startChat(text);
            }}
          >
            <input data-design-id="m-220ddc329e07"
              ref={inputRef}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Due dates, readings, study plan…"
              className="h-10 min-w-0 flex-1 rounded-lg bg-[#F5F5F3] px-3 text-[13px] leading-4 text-[#0A0A0A] outline-none placeholder:text-[#A0A0A0]"
            />
            <button data-design-id="m-5b0d983e1122"
              type="submit"
              aria-label="Start chat"
              className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#141414] text-white transition hover:bg-black"
            >
              <svg width="14" height="14" viewBox="0 0 24 24">
                <path
                  d="M5 12h14M13 6l6 6-6 6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </form>
          <Link data-design-id="m-b7fd5eba00d9"
            href={chatHref}
            className="mt-2 inline-block text-[12px] leading-4 text-[#9A9A98] hover:text-[#0A0A0A]"
          ><DesignCopy id="m-b7fd5eba00d9">
            Open a blank chat
          </DesignCopy></Link>
        </div>
      ) : null}

      <button data-design-id="m-25d9c1d5ce47"
        type="button"
        aria-label={`Chat about ${course.code}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex size-12 items-center justify-center rounded-full bg-[#141414] text-white shadow-[0_8px_24px_rgba(20,20,18,0.18)] transition hover:bg-black"
      >
        <ChatIcon />
      </button>
    </div>
  );
}

export default function CourseDetailClient({
  course,
  viewId,
  documents,
  readingAssignments,
  readingArtifacts,
  artifacts,
  events,
  tasks,
}: CourseDetailClientProps) {
  const [openFolders, setOpenFolders] = useState({
    readings: true,
    artifacts: true,
    calendar: true,
    tasks: true,
  });
  const [openNested, setOpenNested] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => groupCourseEvents(events), [events]);
  const location = course.meetings?.[0]?.location;
  const readingCount =
    documents.length + readingAssignments.length + readingArtifacts.length;

  const toggleFolder = (key: keyof typeof openFolders) => {
    setOpenFolders((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleNested = (key: string) => {
    setOpenNested((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div data-design-id="m-6ef84013d77c" className="relative flex min-h-0 flex-1 flex-col">
      <div data-design-id="m-8a275d4fc6ca" className="flex min-h-0 flex-1 flex-col overflow-hidden px-10 pt-11 pb-6">
        <div data-design-id="m-8756206cdd5c" className="shrink-0">
          <div data-design-id="m-62b47bcf61b0" className="mb-4 flex flex-wrap gap-2"><CourseEditor course={course} /><AcademicManager mode="assignments" course={course} /><AcademicManager mode="calendar" course={course} /></div>
          <div data-design-id="m-2aee7833a1e1" className="flex items-center gap-3">
            <Link data-design-id="m-451c0c74c6b3"
              href="/courses"
              aria-label="Back to courses"
              className="flex size-[30px] shrink-0 items-center justify-center rounded-md text-[#0A0A0A] transition-colors hover:bg-[#F5F5F5]"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" className="shrink-0">
                <path
                  d="M15 5.5 8.5 12 15 18.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <div data-design-id="m-484f600dda7d" className="flex items-center gap-2">
              <BreadcrumbBack
                href="/courses"
                className="text-sm leading-[18px] text-[#7A7A7A]"
              >
                Courses
              </BreadcrumbBack>
              <span data-design-id="m-174ec3420d25" className="text-sm leading-[18px] text-[#C4C4C0]"><DesignCopy id="m-174ec3420d25">/</DesignCopy></span>
              <span data-design-id="m-6dd165811dad" className="text-sm leading-[18px] text-[#0A0A0A]">
                {course.code}
              </span>
            </div>
          </div>

          <div data-design-id="m-b2865b0cfff3" className="pt-[18px]">
            <h1 data-design-id="m-e44341020dc1" className="font-display text-[34px] leading-[42px] tracking-[-0.015em] text-[#0A0A0A]">
              {course.code} – {course.title}
            </h1>
            <p data-design-id="m-7d1644735fe4" className="max-w-[720px] pt-3 text-sm leading-[21px] text-[#4E4E4C]">
              {course.description}
            </p>
          </div>
        </div>

        <div data-design-id="m-581afa3f21cb" className="mt-7 grid min-h-0 flex-1 grid-cols-2 gap-5">
          <section data-design-id="m-21378cd5aedb" className="min-h-0 overflow-y-auto rounded-xl border border-[#E8E8E6] bg-white px-[22px] py-2">
            <h2 data-design-id="m-4997d442fdb3" className="pt-3 text-[13px] leading-4 font-medium text-[#7A7A7A]"><DesignCopy id="m-4997d442fdb3">
              Info
            </DesignCopy></h2>
            <dl data-design-id="m-ba7b5045aa47" className="divide-y divide-[#F1F1EF] pt-1 pb-2">
              <InfoRow label="Instructor" value={course.instructor} />
              {course.instructorEmail ? (
                <InfoRow label="Email" value={course.instructorEmail} />
              ) : null}
              {course.instructorOffice ? (
                <InfoRow label="Office" value={course.instructorOffice} />
              ) : null}
              <InfoRow label="Term" value={course.term} />
              <InfoRow label="Schedule" value={course.schedule} />
              {location ? <InfoRow label="Location" value={location} /> : null}
              {course.officeHours?.map((hour, index) => (
                <InfoRow
                  key={`${hour.host}-${hour.day}-${index}`}
                  label={index === 0 ? "Office hours" : ""}
                  value={formatOfficeHour(hour)}
                />
              ))}
            </dl>

            {course.grading?.length ? (
              <div data-design-id="m-ef53c2e0f081" className="border-t border-[#F1F1EF] py-4">
                <h3 data-design-id="m-153623892f43" className="text-[13px] leading-4 font-medium text-[#7A7A7A]"><DesignCopy id="m-153623892f43">
                  Grading
                </DesignCopy></h3>
                <ul data-design-id="m-f8d1c334327a" className="flex flex-col gap-2 pt-3">
                  {course.grading.map((item) => (
                    <li data-design-id="m-635c35ed86b4" data-design-key={item.component}
                      key={item.component}
                      className="flex items-baseline justify-between gap-4 text-[13px] leading-[18px]"
                    >
                      <span data-design-id="m-429509cc42d4" className="text-[#0A0A0A]">{item.component}</span>
                      <span data-design-id="m-13be17d18583" className="shrink-0 text-[#9A9A98]">
                        {item.weight} pts
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {course.policies &&
            Object.values(course.policies).some(Boolean) ? (
              <div data-design-id="m-1ee77ae853f5" className="border-t border-[#F1F1EF] py-4">
                <h3 data-design-id="m-3e6a0b579a55" className="text-[13px] leading-4 font-medium text-[#7A7A7A]"><DesignCopy id="m-3e6a0b579a55">
                  Policies
                </DesignCopy></h3>
                <dl data-design-id="m-699fa652253f" className="flex flex-col gap-3 pt-3">
                  {course.policies.late ? (
                    <div data-design-id="m-59acc8323a4f">
                      <dt data-design-id="m-339df64c51dc" className="text-[12px] leading-4 text-[#9A9A98]"><DesignCopy id="m-339df64c51dc">Late work</DesignCopy></dt>
                      <dd data-design-id="m-32ad8f3da239" className="pt-1 text-[13px] leading-[19px] text-[#4E4E4C]">
                        {course.policies.late}
                      </dd>
                    </div>
                  ) : null}
                  {course.policies.attendance ? (
                    <div data-design-id="m-f2da4a11274d">
                      <dt data-design-id="m-d18072b71ad0" className="text-[12px] leading-4 text-[#9A9A98]"><DesignCopy id="m-d18072b71ad0">Attendance</DesignCopy></dt>
                      <dd data-design-id="m-dfbd34640c9a" className="pt-1 text-[13px] leading-[19px] text-[#4E4E4C]">
                        {course.policies.attendance}
                      </dd>
                    </div>
                  ) : null}
                  {course.policies.ai ? (
                    <div data-design-id="m-7f7234972744">
                      <dt data-design-id="m-6f7d2a926413" className="text-[12px] leading-4 text-[#9A9A98]"><DesignCopy id="m-6f7d2a926413">AI</DesignCopy></dt>
                      <dd data-design-id="m-ba0d92e51d95" className="pt-1 text-[13px] leading-[19px] text-[#4E4E4C]">
                        {course.policies.ai}
                      </dd>
                    </div>
                  ) : null}
                  {course.policies.integrity ? (
                    <div data-design-id="m-3f0e3923bd7a">
                      <dt data-design-id="m-56ed0034d835" className="text-[12px] leading-4 text-[#9A9A98]"><DesignCopy id="m-56ed0034d835">Integrity</DesignCopy></dt>
                      <dd data-design-id="m-1fe584201a63" className="pt-1 text-[13px] leading-[19px] text-[#4E4E4C]">
                        {course.policies.integrity}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            ) : null}
          </section>

          <section data-design-id="m-d03c41a22dcc" className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-[#E8E8E6] bg-white">
            <div data-design-id="m-6e0388aee32e" className="shrink-0 px-[22px] pt-4 pb-2">
              <h2 data-design-id="m-b1296434ae4f" className="text-[13px] leading-4 font-medium text-[#7A7A7A]"><DesignCopy id="m-b1296434ae4f">
                Files
              </DesignCopy></h2>
            </div>

            <div data-design-id="m-eab5043a5005" className="min-h-0 flex-1 overflow-y-auto pb-1.5">
              <TreeRow
                icon="folder"
                name="Readings"
                meta={String(readingCount)}
                expandable
                open={openFolders.readings}
                onToggle={() => toggleFolder("readings")}
              />
              {openFolders.readings ? (
                readingCount === 0 ? (
                  <EmptyFolder />
                ) : (
                  <>
                    {documents.map((doc) => (
                      <TreeRow
                        key={doc.id}
                        indent={1}
                        icon="file"
                        name={doc.filename}
                        meta={`${fileKindLabel(doc.mime, doc.filename)} · ${formatAttachmentSize(doc.sizeBytes)}`}
                        href={`/api/${viewId}/documents/${doc.id}/file`}
                      />
                    ))}
                    {readingArtifacts.map((artifact) => (
                      <TreeRow
                        key={artifact.slug}
                        indent={1}
                        icon="file"
                        name={artifact.title}
                        meta="Reading"
                        href={`/artifacts/${artifact.slug}`}
                      />
                    ))}
                    {readingAssignments.map((assignment) => (
                      <TreeRow
                        key={assignment.id}
                        indent={1}
                        icon="file"
                        name={assignment.title}
                        meta={
                          assignment.dueAt
                            ? `Reading · ${formatDisplayDate(assignment.dueAt)}`
                            : "Reading"
                        }
                      />
                    ))}
                  </>
                )
              ) : null}

              <TreeRow
                icon="folder"
                name="Artifacts"
                meta={String(artifacts.length)}
                expandable
                open={openFolders.artifacts}
                onToggle={() => toggleFolder("artifacts")}
              />
              {openFolders.artifacts ? (
                artifacts.length === 0 ? (
                  <EmptyFolder />
                ) : (
                  artifacts.map((artifact) => (
                    <TreeRow
                      key={artifact.slug}
                      indent={1}
                      icon="file"
                      name={artifact.title}
                      meta={ARTIFACT_KIND_LABEL[artifact.kind]}
                      href={`/artifacts/${artifact.slug}`}
                    />
                  ))
                )
              ) : null}

              <TreeRow
                icon="folder"
                name="Calendar"
                meta={String(events.length)}
                expandable
                open={openFolders.calendar}
                onToggle={() => toggleFolder("calendar")}
              />
              {openFolders.calendar ? (
                groups.length === 0 ? (
                  <EmptyFolder />
                ) : (
                  groups.map((group) => {
                    const series = group.count > 1;
                    const nestedKey = `cal-${group.id}`;
                    const nestedOpen = Boolean(openNested[nestedKey]);
                    if (series) {
                      return (
                        <div data-design-id="m-c03189242152" data-design-key={group.id} key={group.id}>
                          <TreeRow
                            indent={1}
                            icon="folder"
                            name={group.title}
                            meta={`${group.count} sessions`}
                            expandable
                            open={nestedOpen}
                            onToggle={() => toggleNested(nestedKey)}
                          />
                          {nestedOpen
                            ? group.events.map((event) => (
                                <TreeRow
                                  key={event.id}
                                  indent={2}
                                  icon="calendar"
                                  name={formatEventWhen(event.startsAt, event.endsAt)}
                                  meta={event.location}
                                  href="/calendar"
                                />
                              ))
                            : null}
                        </div>
                      );
                    }

                    const event = group.events[0];
                    return (
                      <TreeRow
                        key={group.id}
                        indent={1}
                        icon="calendar"
                        name={group.title}
                        meta={`${EVENT_KIND_LABEL[group.kind]}${
                          event
                            ? ` · ${formatDisplayDate(event.startsAt)}`
                            : ""
                        }`}
                        href="/calendar"
                      />
                    );
                  })
                )
              ) : null}

              <TreeRow
                icon="folder"
                name="Tasks"
                meta={String(tasks.length)}
                expandable
                open={openFolders.tasks}
                onToggle={() => toggleFolder("tasks")}
              />
              {openFolders.tasks ? (
                tasks.length === 0 ? (
                  <EmptyFolder />
                ) : (
                  tasks.map((task) => {
                    const childKey = `task-${task.key}`;
                    const hasChildren = Boolean(task.children?.length);
                    const nestedOpen = openNested[childKey] ?? true;
                    return (
                      <div data-design-id="m-dffcdfa0b6fe" data-design-key={task.key} key={task.key}>
                        <TreeRow
                          indent={1}
                          icon={hasChildren ? "folder" : "task"}
                          name={task.title}
                          meta={[STATUS_LABEL[task.status], task.due]
                            .filter(Boolean)
                            .join(" · ")}
                          expandable={hasChildren}
                          open={hasChildren ? nestedOpen : undefined}
                          href={hasChildren ? undefined : "/planner"}
                          onToggle={
                            hasChildren ? () => toggleNested(childKey) : undefined
                          }
                        />
                        {hasChildren && nestedOpen
                          ? task.children?.map((child) => (
                              <TreeRow
                                key={child.key}
                                indent={2}
                                icon="task"
                                name={child.title}
                                meta={STATUS_LABEL[child.status]}
                                href="/planner"
                              />
                            ))
                          : null}
                      </div>
                    );
                  })
                )
              ) : null}
            </div>
          </section>
        </div>
      </div>

      <CourseChatBubble course={course} />
    </div>
  );
}
