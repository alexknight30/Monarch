/**
 * Planner — a Linear-style issue tree.
 *
 * Issues nest arbitrarily deep: an issue has sub-issues, which have their own
 * sub-issues, and so on. Top-level issues are grouped by status; nested ones
 * stay under their parent regardless of status, the way Linear does it.
 */

import type { TagId } from "@/lib/objects/tags";

export type PlannerStatus = "in-progress" | "todo" | "backlog" | "done";

/** @deprecated Use tagIds. Kept so older JSON still parses. */
export type PlannerLabel = "Reading" | "Problem set" | "Exam" | "Writing" | "Lab";

export type PlannerPriority = "none" | "urgent" | "high" | "medium" | "low";

export type PlannerIssue = {
  id: string;
  /** Short human key, e.g. "LMS-11". */
  key: string;
  title: string;
  status: PlannerStatus;
  description?: string;
  priority?: PlannerPriority;
  labels?: PlannerLabel[];
  tagIds?: TagId[];
  /** Course code, e.g. "CHEM 122". */
  course?: string;
  artifact?: string;
  artifactId?: string;
  assignment?: string;
  due?: string;
  assignmentId?: string;
  courseId?: string;
  courseSlug?: string;
  dueAt?: string;
  children?: PlannerIssue[];
};

export const PRIORITY_LABEL: Record<PlannerPriority, string> = {
  none: "No priority",
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const STATUS_ORDER: PlannerStatus[] = [
  "in-progress",
  "todo",
  "backlog",
  "done",
];

export const STATUS_LABEL: Record<PlannerStatus, string> = {
  "in-progress": "In Progress",
  todo: "Todo",
  backlog: "Backlog",
  done: "Done",
};

/* ------------------------------------------------------------- traversal --- */

/** Every issue in the subtree, including the root. */
export function flatten(issue: PlannerIssue): PlannerIssue[] {
  return [issue, ...(issue.children ?? []).flatMap(flatten)];
}

/** Find an issue anywhere in a forest. */
export function findIssue(
  issues: PlannerIssue[],
  key: string,
): PlannerIssue | null {
  for (const issue of issues) {
    if (issue.key === key) return issue;
    const nested = issue.children ? findIssue(issue.children, key) : null;
    if (nested) return nested;
  }
  return null;
}

/** Map a single issue (by key) anywhere in a forest. */
export function mapIssue(
  issues: PlannerIssue[],
  key: string,
  fn: (issue: PlannerIssue) => PlannerIssue,
): PlannerIssue[] {
  return issues.map((issue) => {
    if (issue.key === key) return fn(issue);
    if (!issue.children?.length) return issue;
    return { ...issue, children: mapIssue(issue.children, key, fn) };
  });
}

/** Remove an issue (and its subtree) anywhere in a forest. */
export function removeIssue(
  issues: PlannerIssue[],
  key: string,
): PlannerIssue[] {
  return issues
    .filter((issue) => issue.key !== key)
    .map((issue) =>
      issue.children?.length
        ? { ...issue, children: removeIssue(issue.children, key) }
        : issue,
    );
}

/** Completed vs total across all descendants — the "3/7" on a parent row. */
export function subtreeProgress(issue: PlannerIssue) {
  const descendants = (issue.children ?? []).flatMap(flatten);
  return {
    done: descendants.filter((d) => d.status === "done").length,
    total: descendants.length,
  };
}

export function groupByStatus(issues: PlannerIssue[]) {
  return STATUS_ORDER.map((status) => ({
    status,
    issues: issues.filter((i) => i.status === status),
  })).filter((group) => group.issues.length > 0);
}

export type PlannerTab = "all" | "active" | "backlog";
export type PlannerGroupBy = "status" | "course" | "priority" | "none";

export const PLANNER_TABS: { id: PlannerTab; label: string }[] = [
  { id: "all", label: "All tasks" },
  { id: "active", label: "Active" },
  { id: "backlog", label: "Backlog" },
];

export const GROUP_BY_OPTIONS: { id: PlannerGroupBy; label: string }[] = [
  { id: "status", label: "Status" },
  { id: "course", label: "Course" },
  { id: "priority", label: "Priority" },
  { id: "none", label: "None" },
];

export type IssueGroup = {
  id: string;
  label: string;
  issues: PlannerIssue[];
  /** When grouping by status, used for the section icon. */
  status?: PlannerStatus;
};

/** Top-level tab filter (children stay nested under their parents). */
export function filterByTab(issues: PlannerIssue[], tab: PlannerTab): PlannerIssue[] {
  if (tab === "all") return issues;
  if (tab === "active") {
    return issues.filter(
      (i) => i.status === "in-progress" || i.status === "todo",
    );
  }
  return issues.filter((i) => i.status === "backlog");
}

/** Keep a root if its title or any descendant title matches. */
export function filterByQuery(issues: PlannerIssue[], query: string): PlannerIssue[] {
  const q = query.trim().toLowerCase();
  if (!q) return issues;
  return issues.filter((issue) =>
    flatten(issue).some((node) => node.title.toLowerCase().includes(q)),
  );
}

export function groupIssues(
  issues: PlannerIssue[],
  mode: PlannerGroupBy,
): IssueGroup[] {
  if (mode === "none") {
    return issues.length ? [{ id: "all", label: "Tasks", issues }] : [];
  }

  if (mode === "status") {
    return groupByStatus(issues).map((group) => ({
      id: group.status,
      label: STATUS_LABEL[group.status],
      issues: group.issues,
      status: group.status,
    }));
  }

  if (mode === "course") {
    const buckets = new Map<string, PlannerIssue[]>();
    for (const issue of issues) {
      const key =
        issue.course?.trim() && issue.course.trim() !== "Unassigned"
          ? issue.course.trim()
          : "Unassigned";
      const list = buckets.get(key);
      if (list) list.push(issue);
      else buckets.set(key, [issue]);
    }
    return [...buckets.entries()]
      .sort(([a], [b]) => {
        if (a === "Unassigned") return 1;
        if (b === "Unassigned") return -1;
        return a.localeCompare(b);
      })
      .map(([label, groupIssues]) => ({
        id: label,
        label,
        issues: groupIssues,
      }));
  }

  // priority
  const order: PlannerPriority[] = ["urgent", "high", "medium", "low", "none"];
  return order
    .map((priority) => {
      const groupIssues = issues.filter((i) => (i.priority ?? "none") === priority);
      return {
        id: priority,
        label: PRIORITY_LABEL[priority],
        issues: groupIssues,
      };
    })
    .filter((group) => group.issues.length > 0);
}

/* ------------------------------------------------------------------ seed --- */

type SeedIssue = Omit<PlannerIssue, "id" | "children"> & {
  children?: SeedIssue[];
};

function stampIssueIds(issues: SeedIssue[]): PlannerIssue[] {
  return issues.map((issue) => ({
    ...issue,
    id: issue.key,
    children: issue.children ? stampIssueIds(issue.children) : undefined,
  }));
}

/** Seed tree for the Mock One view. Blank views get an empty array. */
export const PLANNER_ISSUES: PlannerIssue[] = stampIssueIds([
  {
    key: "LMS-11",
    title: "Organic chemistry midterm prep",
    status: "in-progress",
    labels: ["Exam"],
    course: "CHEM 122",
    due: "Aug 12",
    children: [
      {
        key: "LMS-12",
        title: "Rewatch carbonyl mechanism lectures",
        status: "done",
        course: "CHEM 122",
      },
      {
        key: "LMS-13",
        title: "Build reaction map flashcards",
        status: "in-progress",
        labels: ["Problem set"],
        course: "CHEM 122",
        children: [
          { key: "LMS-14", title: "Aldol condensation set", status: "done", course: "CHEM 122" },
          {
            key: "LMS-15",
            title: "Grignard addition set",
            status: "in-progress",
            course: "CHEM 122",
            children: [
              { key: "LMS-16", title: "Draw 10 worked mechanisms", status: "todo", course: "CHEM 122" },
              { key: "LMS-17", title: "Check answers against Ch. 14 key", status: "todo", course: "CHEM 122" },
            ],
          },
          { key: "LMS-18", title: "Wittig reaction set", status: "todo", course: "CHEM 122" },
        ],
      },
      {
        key: "LMS-19",
        title: "Sit practice exam under timed conditions",
        status: "todo",
        labels: ["Exam"],
        course: "CHEM 122",
        due: "Aug 11",
      },
    ],
  },
  {
    key: "LMS-20",
    title: "Response paper — Ch. 4",
    status: "in-progress",
    labels: ["Writing", "Reading"],
    course: "HIST 210",
    due: "Aug 9",
    children: [
      { key: "LMS-21", title: "Finish Ch. 4 reading + margin notes", status: "done", course: "HIST 210" },
      {
        key: "LMS-22",
        title: "Outline the argument",
        status: "in-progress",
        labels: ["Writing"],
        course: "HIST 210",
        children: [
          { key: "LMS-23", title: "Pull three supporting passages", status: "done", course: "HIST 210" },
          { key: "LMS-24", title: "Draft thesis sentence", status: "todo", course: "HIST 210" },
        ],
      },
      { key: "LMS-25", title: "Write first draft", status: "todo", labels: ["Writing"], course: "HIST 210" },
    ],
  },
  {
    key: "LMS-30",
    title: "Statistics problem set 8",
    status: "todo",
    labels: ["Problem set"],
    course: "STAT 140",
    due: "Aug 21",
    children: [
      { key: "LMS-31", title: "Review regression lecture notes", status: "todo", course: "STAT 140" },
      {
        key: "LMS-32",
        title: "Work through questions 1–6",
        status: "todo",
        course: "STAT 140",
        children: [
          { key: "LMS-33", title: "Q1–Q3 — confidence intervals", status: "todo", course: "STAT 140" },
          { key: "LMS-34", title: "Q4–Q6 — hypothesis tests", status: "todo", course: "STAT 140" },
        ],
      },
    ],
  },
  {
    key: "LMS-40",
    title: "Titration lab report",
    status: "todo",
    labels: ["Lab"],
    course: "CHEM 122",
    due: "Aug 28",
    children: [
      { key: "LMS-41", title: "Plot the titration curve", status: "todo", course: "CHEM 122" },
      { key: "LMS-42", title: "Write up error analysis", status: "todo", course: "CHEM 122" },
    ],
  },
  {
    key: "LMS-50",
    title: "Spanish oral exam prep",
    status: "backlog",
    labels: ["Exam"],
    course: "SPAN 101",
    children: [
      { key: "LMS-51", title: "Drill unit 4–6 vocab", status: "backlog", course: "SPAN 101" },
      { key: "LMS-52", title: "Practice conversation prompts", status: "backlog", course: "SPAN 101" },
    ],
  },
  {
    key: "LMS-60",
    title: "Literary theory essay",
    status: "backlog",
    labels: ["Writing"],
    course: "ENGL 185",
    children: [
      { key: "LMS-61", title: "Choose a critical framework", status: "backlog", course: "ENGL 185" },
      { key: "LMS-62", title: "Assemble secondary sources", status: "backlog", course: "ENGL 185" },
    ],
  },
  {
    key: "LMS-70",
    title: "Vocab quiz 4",
    status: "done",
    labels: ["Exam"],
    course: "SPAN 101",
    children: [
      { key: "LMS-71", title: "Drill unit 3 vocab", status: "done", course: "SPAN 101" },
    ],
  },
]);
