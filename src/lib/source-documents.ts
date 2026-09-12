import type { Assignment } from "@/lib/assignments";
import type { StoredCalendarEvent } from "@/lib/calendar-events";
import type { Course } from "@/lib/mock-data";
import type { PlannerIssue } from "@/lib/planner";
import type { RecurrenceRule } from "@/lib/syllabus/schema";

export type SourceDocumentKind = "syllabus";

export type SourceDocumentStatus =
  | "uploaded"
  | "extracting"
  | "extracted"
  | "applied"
  | "failed";

export type SourceDocument = {
  id: string;
  filename: string;
  mime: string;
  sizeBytes: number;
  storedPath: string;
  fileApiId?: string;
  uploadedAt: string;
  kind: SourceDocumentKind;
  courseSlug?: string;
  status: SourceDocumentStatus;
};

export type IngestStage = {
  name: string;
  status: "pending" | "running" | "done" | "failed";
  ms: number;
  error?: string;
};

export type IngestRunStatus = "running" | "proposed" | "applied" | "failed";

export type IngestRun = {
  id: string;
  documentId: string;
  status: IngestRunStatus;
  stages: IngestStage[];
  proposal?: Proposal;
  appliedAt?: string;
};

export type ProposalWarning = {
  severity: "info" | "warn";
  field: string;
  message: string;
  quote?: string;
};

export type Proposal = {
  runId: string;
  documentId: string;
  course: Course;
  assignments: Assignment[];
  calendarEvents: StoredCalendarEvent[];
  tasks: PlannerIssue[];
  warnings: ProposalWarning[];
  recurrence?: RecurrenceRule[];
};
