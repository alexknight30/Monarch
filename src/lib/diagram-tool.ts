/**
 * Server-only half of the diagram skill: the tool the model must call, and the
 * instructions that keep a diagram at a student's reading level.
 *
 * Kept apart from diagram.ts so the Anthropic types never reach the client.
 */

import type Anthropic from "@anthropic-ai/sdk";
import { DIAGRAM_LIMITS, type DiagramDetail, type DiagramSpec } from "@/lib/diagram";

export const DIAGRAM_TOOL_NAME = "emit_diagram";

/**
 * Schema limits are advisory — the model follows them most of the time and
 * `normalizeDiagramSpec` repairs the rest. They're worth stating anyway because
 * they steer the first attempt.
 */
export const DIAGRAM_TOOL: Anthropic.Tool = {
  name: DIAGRAM_TOOL_NAME,
  description:
    "Render a diagram for the student. Call this exactly once. Prefer the " +
    "smallest diagram that makes the idea click — a student glancing at this " +
    "before a quiz should grasp the whole shape in a few seconds.",
  input_schema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description:
          "Plain-language title, no colon-prefixed topic. e.g. 'How a cell is organized'.",
      },
      caption: {
        type: "string",
        description:
          "One short sentence of context shown above the diagram. No preamble like 'This diagram shows'.",
      },
      layout: {
        type: "string",
        enum: ["tree", "process", "compare", "cycle"],
        description:
          "tree = parts of a whole. process = ordered steps. compare = two things side by side. cycle = steps that repeat.",
      },
      detail: {
        type: "integer",
        enum: [1, 2],
        description:
          "1 = the shape only (default). 2 = one supporting level under each branch. Use 1 unless the student asked for more.",
      },
      nodes: {
        type: "array",
        minItems: 2,
        maxItems: 14,
        description:
          "For tree/compare: exactly one node without a parent (the root), then branches pointing at it. " +
          "For process/cycle: the steps in order, no parents.",
        items: {
          type: "object",
          properties: {
            id: { type: "string", description: "Short unique id, e.g. 'nucleus'." },
            label: {
              type: "string",
              description: `One to three words, max ${DIAGRAM_LIMITS.label} characters. The thing itself, not a sentence.`,
            },
            note: {
              type: "string",
              description: `Optional. One plain-language phrase saying what it does, max ${DIAGRAM_LIMITS.note} characters. e.g. 'Controls what gets in'.`,
            },
            parent: {
              type: "string",
              description: "Id of the parent node. Omit for the root.",
            },
          },
          required: ["id", "label"],
        },
      },
    },
    required: ["title", "layout", "nodes"],
  },
};

const READING_LEVEL = `Rules for the diagram:
- At most ${DIAGRAM_LIMITS.branches} branches off the root. Fewer is better.
- Labels are one to three words. Notes are one plain phrase, not a sentence with a period.
- Write so a first-year student reads it without stopping. No jargon unless the jargon IS what's being taught — in which case put the term in the label and the plain meaning in the note.
- Leave things out. A diagram that covers 4 of 19 facts well beats one that lists all 19.
- Never put the same word in both a label and its own note.`;

/** The /diagram skill message. Pairs with a forced call to DIAGRAM_TOOL. */
export function buildDiagramMessage(opts: {
  source: string;
  extra?: string;
}): string {
  const extra = opts.extra?.trim();
  return (
    `Turn the reply below into one diagram for the student, using the ${DIAGRAM_TOOL_NAME} tool.\n\n` +
    `${READING_LEVEL}\n\n` +
    `Pick the layout that fits the material: tree for parts of a whole, process for ordered steps, ` +
    `compare for two things held side by side, cycle for steps that repeat.\n\n` +
    `Start at detail 1 — the shape only — unless the student explicitly asked for depth.\n\n` +
    `---\n${opts.source.trim()}\n---` +
    (extra ? `\n\nAdditional direction from the student:\n${extra}` : "")
  );
}

/**
 * Re-render an existing diagram at a different depth.
 *
 * The current spec travels with the request, so "add a level" expands the nodes
 * already on screen rather than inventing an unrelated second diagram.
 */
export function buildDiagramDetailMessage(opts: {
  spec: DiagramSpec;
  detail: DiagramDetail;
  source?: string;
}): string {
  const { spec, detail } = opts;
  const source = opts.source?.trim();

  const instruction =
    detail === 2
      ? `Add exactly one level of supporting detail. Keep the existing root and branches as they are — same labels, same order — and give each branch up to ${DIAGRAM_LIMITS.leaves} short children that say something a student would actually be tested on. Do not add new branches.`
      : `Strip it back to the shape only. Keep the existing root and branches, drop every child, and make sure each branch has a short note in plain language.`;

  return (
    `Re-render this diagram at detail ${detail} using the ${DIAGRAM_TOOL_NAME} tool.\n\n` +
    `${instruction}\n\n` +
    `${READING_LEVEL}\n\n` +
    `Set detail to ${detail} and keep the same title and layout.\n\n` +
    `Current diagram:\n${JSON.stringify(spec, null, 2)}` +
    (source ? `\n\nThe explanation it came from:\n---\n${source}\n---` : "")
  );
}

/** Pull the tool input out of a response, or null if the model didn't call it. */
export function readDiagramToolInput(
  response: Anthropic.Message,
): unknown | null {
  for (const block of response.content) {
    if (block.type === "tool_use" && block.name === DIAGRAM_TOOL_NAME) {
      return block.input;
    }
  }
  return null;
}
