/**
 * Diagram specs — the wire format for /diagram.
 *
 * The model emits one of these instead of Mermaid. Two reasons:
 *
 *  1. Bounded content means we never need a graph-layout engine. With at most a
 *     handful of nodes and two levels, flexbox always fits the container — so a
 *     diagram can't scale itself down to unreadable like an auto-laid-out SVG.
 *  2. A spec serializes into an artifact record and re-renders at any size, so
 *     "save this diagram" doesn't degrade into "save a picture of a diagram".
 *
 * Client-safe: no server-only imports. Tool schema and prompts live in
 * diagram-tool.ts so the Anthropic SDK stays out of the browser bundle.
 */

export const DIAGRAM_LAYOUTS = ["tree", "process", "compare", "cycle"] as const;
export type DiagramLayout = (typeof DIAGRAM_LAYOUTS)[number];

/** 1 = the shape only. 2 = one level of supporting detail under each branch. */
export type DiagramDetail = 1 | 2;

export type DiagramNode = {
  id: string;
  label: string;
  note?: string;
  /** Parent node id. Top-level nodes omit it. */
  parent?: string;
};

export type DiagramSpec = {
  title: string;
  caption?: string;
  layout: DiagramLayout;
  detail: DiagramDetail;
  /**
   * Canonical order after normalization: root first, then each branch followed
   * immediately by its own leaves. Renderers rely on this.
   */
  nodes: DiagramNode[];
};

/**
 * Caps are deliberately tight. These are the numbers that keep a diagram
 * readable for a student skimming before a quiz — not the numbers a model
 * would pick if asked to be thorough.
 */
export const DIAGRAM_LIMITS = {
  title: 64,
  caption: 150,
  label: 28,
  note: 56,
  /** Children of the root. */
  branches: 4,
  /** Children of a branch, at detail 2. */
  leaves: 3,
  /** Steps in a linear (process / cycle) diagram. */
  steps: 5,
} as const;

export function isDiagramLayout(value: unknown): value is DiagramLayout {
  return (
    typeof value === "string" &&
    (DIAGRAM_LAYOUTS as readonly string[]).includes(value)
  );
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Collapse whitespace, then trim to `max` on a word boundary where possible. */
function clamp(value: unknown, max: number): string {
  const text = str(value).replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(" ");
  const kept = space > max * 0.6 ? cut.slice(0, space) : cut;
  return `${kept.replace(/[\s,;:.–—-]+$/, "")}…`;
}

type WorkingNode = {
  id: string;
  label: string;
  note?: string;
  parent?: string;
};

/** Shape + dedupe the raw node list, dropping anything unusable. */
function cleanNodes(raw: unknown): WorkingNode[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: WorkingNode[] = [];

  raw.forEach((entry, i) => {
    if (!entry || typeof entry !== "object") return;
    const node = entry as Record<string, unknown>;
    const label = clamp(node.label, DIAGRAM_LIMITS.label);
    if (!label) return;

    let id = str(node.id).trim() || `n${i + 1}`;
    while (seen.has(id)) id = `${id}_`;
    seen.add(id);

    const note = clamp(node.note, DIAGRAM_LIMITS.note);
    const parent = str(node.parent).trim();
    out.push({
      id,
      label,
      ...(note ? { note } : {}),
      ...(parent ? { parent } : {}),
    });
  });

  return out;
}

/**
 * Drop parent links that point nowhere, at themselves, or around a cycle.
 * Anything dropped becomes a top-level node, which the layout pass then folds
 * back under the root.
 */
function resolveParents(nodes: WorkingNode[]): void {
  const byId = new Map(nodes.map((n) => [n.id, n]));

  for (const node of nodes) {
    if (node.parent && (node.parent === node.id || !byId.has(node.parent))) {
      delete node.parent;
    }
  }

  for (const node of nodes) {
    const path = new Set<string>([node.id]);
    let cursor = node.parent ? byId.get(node.parent) : undefined;
    while (cursor) {
      if (path.has(cursor.id)) {
        delete node.parent;
        break;
      }
      path.add(cursor.id);
      cursor = cursor.parent ? byId.get(cursor.parent) : undefined;
    }
  }
}

function childrenOf(nodes: WorkingNode[], id: string): WorkingNode[] {
  return nodes.filter((n) => n.parent === id);
}

/**
 * Fold a level that's too deep into its parent's note rather than dropping it.
 * Losing the label entirely is worse than demoting it to supporting text.
 */
function foldInto(parent: WorkingNode, extras: WorkingNode[]): void {
  if (!extras.length) return;
  if (parent.note) return;
  parent.note = clamp(
    extras.map((n) => n.label).join(", "),
    DIAGRAM_LIMITS.note,
  );
}

/** Root + branches + (at detail 2) leaves, with every cap enforced. */
function buildHierarchy(
  nodes: WorkingNode[],
  detail: DiagramDetail,
  maxBranches: number,
): WorkingNode[] {
  if (!nodes.length) return [];

  const roots = nodes.filter((n) => !n.parent);
  const root = roots[0] ?? nodes[0];
  delete root.parent;

  // Extra top-level nodes are branches the model forgot to parent.
  for (const node of roots.slice(1)) node.parent = root.id;

  const branches = childrenOf(nodes, root.id).slice(0, maxBranches);
  const kept: WorkingNode[] = [root];

  for (const branch of branches) {
    const grandchildren = childrenOf(nodes, branch.id);

    // Anything below level 2 collapses upward — we never render depth 3.
    for (const leaf of grandchildren) {
      foldInto(leaf, childrenOf(nodes, leaf.id));
    }

    if (detail === 1) {
      // No leaf row at this level; keep the information as the branch note.
      foldInto(branch, grandchildren);
      kept.push(branch);
      continue;
    }

    kept.push(branch);
    for (const leaf of grandchildren.slice(0, DIAGRAM_LIMITS.leaves)) {
      kept.push(leaf);
    }
  }

  return kept;
}

/** process / cycle are flat by definition — parents are meaningless. */
function buildLinear(nodes: WorkingNode[]): WorkingNode[] {
  return nodes.slice(0, DIAGRAM_LIMITS.steps).map((node) => {
    const next = { ...node };
    delete next.parent;
    return next;
  });
}

/**
 * Validate and repair a spec from the model (or from disk).
 *
 * Never throws and never rejects for shape it can fix: JSON Schema constraints
 * in a tool definition are advisory, so over-long labels and extra levels are
 * expected and get repaired deterministically rather than re-prompted.
 * Returns null only when there's genuinely no diagram here.
 *
 * Pass `detail` to force a depth. The detail-change endpoint needs this: a model
 * that returns the requested leaves but forgets to set `detail: 2` would
 * otherwise have those leaves folded straight back into notes.
 */
export function normalizeDiagramSpec(
  raw: unknown,
  opts?: { detail?: DiagramDetail },
): DiagramSpec | null {
  if (!raw || typeof raw !== "object") return null;
  const input = raw as Record<string, unknown>;

  const layout: DiagramLayout = isDiagramLayout(input.layout)
    ? input.layout
    : "tree";
  const detail: DiagramDetail =
    opts?.detail ?? (input.detail === 2 || input.detail === "2" ? 2 : 1);

  const nodes = cleanNodes(input.nodes);
  resolveParents(nodes);

  const linear = layout === "process" || layout === "cycle";
  const built = linear
    ? buildLinear(nodes)
    : buildHierarchy(nodes, detail, layout === "compare" ? 2 : DIAGRAM_LIMITS.branches);

  // A one-node diagram is a valid starting point for an editable whiteboard.
  if (built.length === 0) return null;

  // A missing title is recoverable and does happen — `required` in a tool
  // schema is a hint, not a guarantee. Fall back rather than lose the diagram.
  const explicit = clamp(input.title, DIAGRAM_LIMITS.title);
  const caption = clamp(input.caption, DIAGRAM_LIMITS.caption);
  const title = explicit || caption || built[0].label;

  return {
    title,
    // Don't show the same sentence as both title and caption.
    ...(caption && caption !== title ? { caption } : {}),
    layout,
    detail,
    nodes: built,
  };
}

/* ------------------------------------------------------------- accessors --- */

export type DiagramBranch = { node: DiagramNode; leaves: DiagramNode[] };

/** Root + branches for tree / compare layouts. */
export function diagramHierarchy(spec: DiagramSpec): {
  root: DiagramNode;
  branches: DiagramBranch[];
} {
  const [root, ...rest] = spec.nodes;
  const branches: DiagramBranch[] = [];

  for (const node of rest) {
    if (node.parent === root.id || !node.parent) {
      branches.push({ node, leaves: [] });
      continue;
    }
    const owner = branches.find((b) => b.node.id === node.parent);
    if (owner) owner.leaves.push(node);
    else branches.push({ node, leaves: [] });
  }

  return { root, branches };
}

/** Ordered steps for process / cycle layouts. */
export function diagramSteps(spec: DiagramSpec): DiagramNode[] {
  return spec.nodes;
}

/** Footer line: "Simplified · 4 ideas · 1 level". */
export function describeDiagram(spec: DiagramSpec): string {
  const count = spec.nodes.length;
  const ideas = `${count} idea${count === 1 ? "" : "s"}`;

  if (spec.layout === "process" || spec.layout === "cycle") {
    return `${spec.layout === "cycle" ? "Cycle" : "Steps"} · ${ideas}`;
  }

  const levels = spec.detail === 2 ? "2 levels" : "1 level";
  const label = spec.detail === 2 ? "Detailed" : "Simplified";
  return `${label} · ${ideas} · ${levels}`;
}

/** True when there's room to go deeper — drives the detail control. */
export function canExpandDiagram(spec: DiagramSpec): boolean {
  if (spec.layout === "process" || spec.layout === "cycle") return false;
  return spec.detail === 1;
}

/**
 * Plain-text outline of a diagram, for pasting into notes.
 * The spec JSON is the wrong thing to hand a student, so "copy" gives them this.
 */
export function diagramToOutline(spec: DiagramSpec): string {
  const lines: string[] = [spec.title];
  if (spec.caption) lines.push(spec.caption);
  lines.push("");

  if (spec.layout === "process" || spec.layout === "cycle") {
    spec.nodes.forEach((node, i) => {
      lines.push(`${i + 1}. ${node.label}${node.note ? ` — ${node.note}` : ""}`);
    });
    if (spec.layout === "cycle") lines.push("(then it starts again)");
    return lines.join("\n");
  }

  const { root, branches } = diagramHierarchy(spec);
  lines.push(root.label);
  for (const branch of branches) {
    lines.push(
      `  - ${branch.node.label}${branch.node.note ? ` — ${branch.node.note}` : ""}`,
    );
    for (const leaf of branch.leaves) {
      lines.push(`      - ${leaf.label}${leaf.note ? ` — ${leaf.note}` : ""}`);
    }
  }
  return lines.join("\n");
}

/* --------------------------------------------------------- block plumbing --- */

const DIAGRAM_FENCE = "diagram";

/**
 * Index of each ```diagram block in an assistant message.
 *
 * The chat renderer counts these in document order as it walks lines, and
 * `replaceDiagramBlock` scans the same way — so a block index means the same
 * thing on both sides. Keep the two in step if either changes.
 */
export function extractDiagramBlocks(text: string): { index: number; body: string }[] {
  const lines = text.split("\n");
  const blocks: { index: number; body: string }[] = [];
  let i = 0;

  while (i < lines.length) {
    const fence = /^```(\w*)\s*$/.exec(lines[i]);
    if (!fence) {
      i += 1;
      continue;
    }
    const lang = fence[1].toLowerCase();
    const body: string[] = [];
    i += 1;
    while (i < lines.length && !/^```\s*$/.test(lines[i])) {
      body.push(lines[i]);
      i += 1;
    }
    if (i < lines.length) i += 1;
    if (lang === DIAGRAM_FENCE) {
      blocks.push({ index: blocks.length, body: body.join("\n") });
    }
  }

  return blocks;
}

export function parseDiagramBlock(body: string): DiagramSpec | null {
  try {
    return normalizeDiagramSpec(JSON.parse(body));
  } catch {
    return null;
  }
}

/** Serialize a spec back into a fenced block. */
export function formatDiagramBlock(spec: DiagramSpec): string {
  return `\`\`\`${DIAGRAM_FENCE}\n${JSON.stringify(spec, null, 2)}\n\`\`\``;
}

/**
 * Swap the nth ```diagram block for a new spec, leaving the rest of the
 * message untouched. Used when a student changes the detail level in place.
 */
export function replaceDiagramBlock(
  text: string,
  blockIndex: number,
  spec: DiagramSpec,
): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let seen = 0;
  let i = 0;

  while (i < lines.length) {
    const fence = /^```(\w*)\s*$/.exec(lines[i]);
    if (!fence) {
      out.push(lines[i]);
      i += 1;
      continue;
    }

    const lang = fence[1].toLowerCase();
    const open = lines[i];
    const body: string[] = [];
    i += 1;
    while (i < lines.length && !/^```\s*$/.test(lines[i])) {
      body.push(lines[i]);
      i += 1;
    }
    const closed = i < lines.length;
    if (closed) i += 1;

    if (lang === DIAGRAM_FENCE) {
      if (seen === blockIndex) {
        out.push(formatDiagramBlock(spec));
      } else {
        out.push(open, ...body, ...(closed ? ["```"] : []));
      }
      seen += 1;
      continue;
    }

    out.push(open, ...body, ...(closed ? ["```"] : []));
  }

  return out.join("\n");
}
