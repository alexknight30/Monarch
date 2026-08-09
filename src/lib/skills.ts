/**
 * Chat skills — slash commands like /simplify and /diagram.
 * Built-ins ship with the app; custom ones live in localStorage per admin view.
 */

import { readViewIdFromDocument } from "@/lib/views";

export type Skill = {
  id: string;
  /** Slash token without leading slash, e.g. "simplify". */
  command: string;
  name: string;
  description: string;
  /** Instruction sent to the model. Built-ins may ignore this. */
  prompt?: string;
  builtin?: boolean;
};

export const BUILTIN_SKILLS: Skill[] = [
  {
    id: "simplify",
    command: "simplify",
    name: "Simplify",
    description: "Retell the last reply in simple words a 10-year-old would get.",
    builtin: true,
  },
  {
    id: "diagram",
    command: "diagram",
    name: "Diagram",
    description: "Turn the last reply into a clear Mermaid diagram.",
    builtin: true,
  },
];

function storageKey() {
  return `lumis.skills.${readViewIdFromDocument()}`;
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readCustomSkills(): Skill[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(storageKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Skill[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s) =>
        s &&
        typeof s.id === "string" &&
        typeof s.command === "string" &&
        typeof s.name === "string",
    );
  } catch {
    return [];
  }
}

function writeCustomSkills(skills: Skill[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(storageKey(), JSON.stringify(skills));
}

export function listSkills(): Skill[] {
  const custom = readCustomSkills().map((s) => ({ ...s, builtin: false }));
  const taken = new Set(BUILTIN_SKILLS.map((s) => s.command.toLowerCase()));
  const extras = custom.filter((s) => !taken.has(s.command.toLowerCase()));
  return [...BUILTIN_SKILLS, ...extras];
}

export function getSkillByCommand(command: string): Skill | undefined {
  const key = command.replace(/^\//, "").trim().toLowerCase();
  return listSkills().find((s) => s.command.toLowerCase() === key);
}

export function addCustomSkill(input: {
  command: string;
  name: string;
  description: string;
  prompt: string;
}): Skill {
  const command = input.command.replace(/^\//, "").trim().toLowerCase();
  if (!/^[a-z][a-z0-9_-]{0,31}$/.test(command)) {
    throw new Error("Use a short command like review or study-plan.");
  }
  if (BUILTIN_SKILLS.some((s) => s.command === command)) {
    throw new Error(`/${command} is a built-in skill.`);
  }
  const existing = readCustomSkills();
  if (existing.some((s) => s.command === command)) {
    throw new Error(`/${command} already exists.`);
  }
  const skill: Skill = {
    id: `custom-${command}-${Date.now()}`,
    command,
    name: input.name.trim() || command,
    description: input.description.trim() || "Custom skill",
    prompt: input.prompt.trim(),
    builtin: false,
  };
  if (!skill.prompt) throw new Error("Tell the skill what to do.");
  writeCustomSkills([skill, ...existing]);
  return skill;
}

export function removeCustomSkill(id: string) {
  writeCustomSkills(readCustomSkills().filter((s) => s.id !== id));
}

/** Filter skills for the slash menu query (text after `/`). */
export function filterSkills(query: string, skills = listSkills()): Skill[] {
  const q = query.trim().toLowerCase();
  if (!q) return skills;
  return skills.filter(
    (s) =>
      s.command.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q),
  );
}
