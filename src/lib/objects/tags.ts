/**
 * Visual markers only — tags never change object behavior.
 * Blue tags apply to events + tasks. Orange tags apply to artifacts too.
 */

export const TAG_IDS = [
  "assignment",
  "project",
  "paper",
  "exam",
  "quiz",
  "class",
  "office-hours",
] as const;

export type TagId = (typeof TAG_IDS)[number];

export type TaggableKind = "artifact" | "event" | "task";

export type TagDef = {
  id: TagId;
  label: string;
  /** CSS color for chips. */
  color: string;
  appliesTo: readonly TaggableKind[];
};

export const TAGS: Record<TagId, TagDef> = {
  assignment: {
    id: "assignment",
    label: "Assignment",
    color: "#C45C26",
    appliesTo: ["artifact", "event", "task"],
  },
  project: {
    id: "project",
    label: "Project",
    color: "#D4782A",
    appliesTo: ["artifact", "event", "task"],
  },
  paper: {
    id: "paper",
    label: "Paper",
    color: "#C9A227",
    appliesTo: ["artifact", "event", "task"],
  },
  exam: {
    id: "exam",
    label: "Exam",
    color: "#C45C26",
    appliesTo: ["artifact", "event", "task"],
  },
  quiz: {
    id: "quiz",
    label: "Quiz",
    color: "#C9A227",
    appliesTo: ["artifact", "event", "task"],
  },
  class: {
    id: "class",
    label: "Class",
    color: "#3B6FD8",
    appliesTo: ["event", "task"],
  },
  "office-hours": {
    id: "office-hours",
    label: "Office Hours",
    color: "#3BA8C8",
    appliesTo: ["event", "task"],
  },
};

export function isTagId(value: string): value is TagId {
  return (TAG_IDS as readonly string[]).includes(value);
}

export function tagsForKind(kind: TaggableKind): TagDef[] {
  return TAG_IDS.map((id) => TAGS[id]).filter((tag) =>
    tag.appliesTo.includes(kind),
  );
}

export function sanitizeTagIds(
  values: unknown,
  kind: TaggableKind,
): TagId[] {
  if (!Array.isArray(values)) return [];
  const allowed = new Set(tagsForKind(kind).map((tag) => tag.id));
  const seen = new Set<TagId>();
  const out: TagId[] = [];
  for (const value of values) {
    if (typeof value !== "string" || !isTagId(value) || !allowed.has(value)) {
      continue;
    }
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

/** Map legacy planner labels onto the tag catalog. */
export function tagsFromPlannerLabels(labels?: string[]): TagId[] {
  const map: Record<string, TagId | undefined> = {
    Exam: "exam",
    "Problem set": "assignment",
    Writing: "paper",
    Lab: "assignment",
    Reading: "assignment",
  };
  const seen = new Set<TagId>();
  const out: TagId[] = [];
  for (const label of labels ?? []) {
    const tag = map[label];
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
  }
  return out;
}

export function tagsFromCalendarKind(kind: string): TagId[] {
  if (kind === "class") return ["class"];
  if (kind === "office-hours") return ["office-hours"];
  if (kind === "exam") return ["exam"];
  if (kind === "deadline") return ["assignment"];
  return [];
}

export function tagsFromAssignmentType(type: string): TagId[] {
  if (type === "exam") return ["exam"];
  if (type === "quiz") return ["quiz"];
  if (type === "paper") return ["paper"];
  if (type === "project" || type === "presentation") return ["project"];
  if (type === "reading") return [];
  return ["assignment"];
}
