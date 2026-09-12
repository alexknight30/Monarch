export const ASSIGNMENT_TYPES = [
  "reading",
  "problem-set",
  "paper",
  "lab",
  "exam",
  "quiz",
  "project",
  "presentation",
  "discussion",
] as const;

export type AssignmentType = (typeof ASSIGNMENT_TYPES)[number];

export type AssignmentStatus = "upcoming" | "submitted" | "graded";

export type Assignment = {
  id: string;
  courseSlug: string;
  title: string;
  type: AssignmentType;
  dueAt: string | null;
  weight: number | null;
  description?: string;
  source?: { documentId: string; quote: string; page?: number };
  status: AssignmentStatus;
  needsReview?: boolean;
};

export function isAssignmentType(value: string): value is AssignmentType {
  return (ASSIGNMENT_TYPES as readonly string[]).includes(value);
}
