import type { Skill } from "@/lib/skills";

export type PendingChat = {
  text: string;
  skill?: Skill;
  files: File[];
};

let pending: PendingChat | null = null;

/** Stash a home-composer submit so /chat can send it with File objects intact. */
export function setPendingChat(next: PendingChat) {
  pending = next;
}

export function takePendingChat(): PendingChat | null {
  const value = pending;
  pending = null;
  return value;
}
