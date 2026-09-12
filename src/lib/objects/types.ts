import type { TagId } from "@/lib/objects/tags";

export const OBJECT_KINDS = ["course", "artifact", "event", "task"] as const;
export type ObjectKind = (typeof OBJECT_KINDS)[number];

export const LINKABLE_KINDS = ["artifact", "event", "task"] as const;
export type LinkableKind = (typeof LINKABLE_KINDS)[number];

export type ObjectRef = {
  kind: LinkableKind;
  id: string;
};

export type ObjectLink = {
  id: string;
  a: ObjectRef;
  b: ObjectRef;
};

export type EventTiming = "meeting" | "deadline";

export type ObjectSummary = {
  kind: LinkableKind;
  id: string;
  slug?: string;
  title: string;
  tagIds: TagId[];
  courseId: string;
  courseLabel?: string;
  updatedAt: string;
  bodyChars: number;
  artifactKind?: string;
};

export function isLinkableKind(value: string): value is LinkableKind {
  return (LINKABLE_KINDS as readonly string[]).includes(value);
}

export function refsEqual(a: ObjectRef, b: ObjectRef) {
  return a.kind === b.kind && a.id === b.id;
}

export function canonLinkPair(
  a: ObjectRef,
  b: ObjectRef,
): [ObjectRef, ObjectRef] {
  const left = `${a.kind}:${a.id}`;
  const right = `${b.kind}:${b.id}`;
  return left <= right ? [a, b] : [b, a];
}

export function newObjectId(prefix: string) {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 10)
      : Math.random().toString(36).slice(2, 12);
  return `${prefix}_${rand}`;
}
