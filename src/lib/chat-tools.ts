/**
 * Anthropic tools that mirror planner UI actions (create / edit / subtask / list).
 */

import type Anthropic from "@anthropic-ai/sdk";
import {
  createPlannerIssue,
  createSubtask,
  deletePlannerIssue,
  listPlanner,
  updatePlannerIssue,
  type CreatePlannerIssueInput,
  type UpdatePlannerIssueInput,
} from "@/lib/local-db";
import {
  flatten,
  type PlannerIssue,
  type PlannerLabel,
  type PlannerPriority,
  type PlannerStatus,
} from "@/lib/planner";
import type { ViewId } from "@/lib/views";

export type ChatToolAction = {
  tool: string;
  summary: string;
  key?: string;
};

const STATUSES = ["in-progress", "todo", "backlog", "done"] as const;
const PRIORITIES = ["none", "urgent", "high", "medium", "low"] as const;
const LABELS = ["Reading", "Problem set", "Exam", "Writing", "Lab"] as const;

export const PLANNER_TOOLS: Anthropic.Tool[] = [
  {
    name: "list_tasks",
    description:
      "List planner tasks for the active student. Use before updating when you need a task key, or to check what already exists.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Optional filter matched against title, course, project, assignment, or key.",
        },
        status: {
          type: "string",
          enum: [...STATUSES],
          description: "Optional status filter.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "create_task",
    description:
      "Create a new top-level planner task. Same fields as the New task dialog.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Task title (required)." },
        status: {
          type: "string",
          enum: [...STATUSES],
          description: 'Defaults to "todo".',
        },
        course: { type: "string", description: 'Class code, e.g. "CHEM 122".' },
        project: { type: "string" },
        assignment: {
          type: "string",
          description: 'Assignment name, e.g. "Problem Set 7".',
        },
        due: {
          type: "string",
          description: "Due date as the student would type it.",
        },
        description: { type: "string" },
        label: {
          type: "string",
          enum: [...LABELS],
        },
      },
      required: ["title"],
      additionalProperties: false,
    },
  },
  {
    name: "update_task",
    description:
      "Update an existing planner task by key (e.g. LMS-12). Same fields as the task detail editor. Pass null to clear optional string fields.",
    input_schema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description: "Task key from list_tasks, e.g. LMS-12.",
        },
        title: { type: "string" },
        status: { type: "string", enum: [...STATUSES] },
        priority: { type: "string", enum: [...PRIORITIES] },
        course: { type: ["string", "null"] },
        project: { type: ["string", "null"] },
        assignment: { type: ["string", "null"] },
        due: { type: ["string", "null"] },
        description: { type: ["string", "null"] },
        labels: {
          type: "array",
          items: { type: "string", enum: [...LABELS] },
        },
      },
      required: ["key"],
      additionalProperties: false,
    },
  },
  {
    name: "create_subtask",
    description: "Add a subtask under an existing planner task.",
    input_schema: {
      type: "object",
      properties: {
        parent_key: {
          type: "string",
          description: "Parent task key, e.g. LMS-12.",
        },
        title: { type: "string" },
        status: { type: "string", enum: [...STATUSES] },
      },
      required: ["parent_key", "title"],
      additionalProperties: false,
    },
  },
  {
    name: "delete_task",
    description:
      "Permanently delete a planner task by key, including any subtasks under it. Use when the student asks to remove or delete a task.",
    input_schema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description: "Task key from list_tasks, e.g. LMS-12.",
        },
      },
      required: ["key"],
      additionalProperties: false,
    },
  },
];

function isStatus(v: unknown): v is PlannerStatus {
  return typeof v === "string" && (STATUSES as readonly string[]).includes(v);
}

function isPriority(v: unknown): v is PlannerPriority {
  return typeof v === "string" && (PRIORITIES as readonly string[]).includes(v);
}

function isLabel(v: unknown): v is PlannerLabel {
  return typeof v === "string" && (LABELS as readonly string[]).includes(v);
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function asNullableString(v: unknown): string | null | undefined {
  if (v === null) return null;
  if (typeof v === "string") return v;
  return undefined;
}

function summarize(issue: PlannerIssue, parentKey?: string) {
  return {
    key: issue.key,
    title: issue.title,
    status: issue.status,
    course: issue.course ?? null,
    project: issue.project ?? null,
    assignment: issue.assignment ?? null,
    due: issue.due ?? null,
    priority: issue.priority ?? null,
    labels: issue.labels ?? [],
    description: issue.description ?? null,
    parentKey: parentKey ?? null,
    childCount: issue.children?.length ?? 0,
  };
}

function walkWithParent(
  issues: PlannerIssue[],
  parentKey?: string,
): ReturnType<typeof summarize>[] {
  const out: ReturnType<typeof summarize>[] = [];
  for (const issue of issues) {
    out.push(summarize(issue, parentKey));
    if (issue.children?.length) {
      out.push(...walkWithParent(issue.children, issue.key));
    }
  }
  return out;
}

function matchesQuery(
  row: ReturnType<typeof summarize>,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [
    row.key,
    row.title,
    row.course,
    row.project,
    row.assignment,
    row.description,
  ]
    .filter(Boolean)
    .some((v) => String(v).toLowerCase().includes(q));
}

export async function executePlannerTool(
  viewId: ViewId,
  name: string,
  input: Record<string, unknown>,
): Promise<{ result: unknown; action?: ChatToolAction }> {
  switch (name) {
    case "list_tasks": {
      const planner = await listPlanner(viewId);
      const query = asString(input.query) ?? "";
      const status = isStatus(input.status) ? input.status : undefined;
      let rows = walkWithParent(planner);
      if (status) rows = rows.filter((r) => r.status === status);
      if (query) rows = rows.filter((r) => matchesQuery(r, query));
      return {
        result: {
          count: rows.length,
          tasks: rows.slice(0, 80),
        },
      };
    }

    case "create_task": {
      const title = asString(input.title)?.trim();
      if (!title) throw new Error("title is required.");
      const payload: CreatePlannerIssueInput = {
        title,
        ...(isStatus(input.status) ? { status: input.status } : {}),
        ...(isLabel(input.label) ? { label: input.label } : {}),
        course: asString(input.course),
        project: asString(input.project),
        assignment: asString(input.assignment),
        due: asString(input.due),
        description: asString(input.description),
      };
      const issue = await createPlannerIssue(viewId, payload);
      return {
        result: { ok: true, issue: summarize(issue) },
        action: {
          tool: name,
          summary: `Created ${issue.key}: ${issue.title}`,
          key: issue.key,
        },
      };
    }

    case "update_task": {
      const key = asString(input.key)?.trim();
      if (!key) throw new Error("key is required.");

      const payload: UpdatePlannerIssueInput = {};
      if (input.title !== undefined) {
        const title = asString(input.title)?.trim();
        if (!title) throw new Error("title cannot be empty.");
        payload.title = title;
      }
      if (isStatus(input.status)) payload.status = input.status;
      if (isPriority(input.priority)) payload.priority = input.priority;
      if (input.course !== undefined) payload.course = asNullableString(input.course);
      if (input.project !== undefined)
        payload.project = asNullableString(input.project);
      if (input.assignment !== undefined)
        payload.assignment = asNullableString(input.assignment);
      if (input.due !== undefined) payload.due = asNullableString(input.due);
      if (input.description !== undefined)
        payload.description = asNullableString(input.description);
      if (Array.isArray(input.labels)) {
        payload.labels = input.labels.filter(isLabel);
      }

      if (Object.keys(payload).length === 0) {
        throw new Error("Provide at least one field to update.");
      }

      const issue = await updatePlannerIssue(viewId, key, payload);
      return {
        result: { ok: true, issue: summarize(issue) },
        action: {
          tool: name,
          summary: `Updated ${issue.key}: ${issue.title}`,
          key: issue.key,
        },
      };
    }

    case "create_subtask": {
      const parentKey = asString(input.parent_key)?.trim();
      const title = asString(input.title)?.trim();
      if (!parentKey) throw new Error("parent_key is required.");
      if (!title) throw new Error("title is required.");
      const issue = await createSubtask(viewId, parentKey, {
        title,
        ...(isStatus(input.status) ? { status: input.status } : {}),
      });
      return {
        result: { ok: true, issue: summarize(issue, parentKey) },
        action: {
          tool: name,
          summary: `Added subtask ${issue.key} under ${parentKey}: ${issue.title}`,
          key: issue.key,
        },
      };
    }

    case "delete_task": {
      const key = asString(input.key)?.trim();
      if (!key) throw new Error("key is required.");
      const issue = await deletePlannerIssue(viewId, key);
      const removedDescendants = flatten(issue).length - 1;
      return {
        result: {
          ok: true,
          deleted: summarize(issue),
          removedDescendants,
        },
        action: {
          tool: name,
          summary:
            removedDescendants > 0
              ? `Deleted ${issue.key}: ${issue.title} (+${removedDescendants} subtasks)`
              : `Deleted ${issue.key}: ${issue.title}`,
          key: issue.key,
        },
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
