import type Anthropic from "@anthropic-ai/sdk";
import type { ChatToolAction } from "@/lib/chat-tools";
import { executePlannerTool, PLANNER_TOOLS } from "@/lib/chat-tools";
import { executeDocumentTool, DOCUMENT_TOOLS } from "@/lib/document-tools";
import { DIAGRAM_TOOL } from "@/lib/diagram-tool";
import { readViewStore, linkObjects, unlinkObjects } from "@/lib/local-db";
import { artifactBodyText } from "@/lib/objects/normalize";
import {
  findTask,
  linksFor,
  otherEnd,
  summarizeArtifact,
  summarizeEvent,
  summarizeTask,
} from "@/lib/objects/summaries";
import { isLinkableKind, type ObjectRef } from "@/lib/objects/types";
import { flatten } from "@/lib/planner";
import type { ViewId } from "@/lib/views";
import type { ModelChoice } from "@/lib/harness/models";
import { decideTeachingModel } from "@/lib/harness/models";
import { STUDY_TOOLS } from "./study-tools";
import { researchPublicWeb,type WebResearch } from "./web-research";

const BODY_LIMIT = 8000;

export type ToolContext = {
  viewId: ViewId;
  documentSlug?: string;
  goal?: string;
  goalComplete?: boolean;
  modelChoice?: ModelChoice;
  lastModelReport?: string;
  artifactReads?: Map<string,Record<string,unknown>>;
  signal?:AbortSignal;
};

export type ToolResult = {
  result: unknown;
  action?: ChatToolAction;
};

export type HarnessTool = {
  name: string;
  facing: "multi" | "agent";
  summary: string;
  definition: Anthropic.Tool;
  execute: (ctx: ToolContext, input: Record<string, unknown>) => Promise<ToolResult>;
};

function asString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function pageBody(text: string, offset = 0, limit = BODY_LIMIT) {
  const start = Math.max(0, offset);
  const slice = text.slice(start, start + limit);
  return {
    body: slice,
    truncated: start + slice.length < text.length,
    nextOffset: start + slice.length,
    totalChars: text.length,
  };
}

function parseRef(kind: unknown, id: unknown): ObjectRef | null {
  if (typeof kind !== "string" || !isLinkableKind(kind)) return null;
  if (typeof id !== "string" || !id.trim()) return null;
  return { kind, id: id.trim() };
}

const readObject: HarnessTool = {
  name: "read_object",
  facing: "agent",
  summary: "Read the full body of an artifact, task, or event. Paginate with offset.",
  definition: {
    name: "read_object",
    description:
      "Read the full body of an object. Use after summaries if you need the actual text, cards, diagram spec, or description. Defaults to the open artifact when id is omitted.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Object id or artifact slug or task key." },
        kind: {
          type: "string",
          enum: ["artifact", "event", "task"],
          description: "Defaults to artifact.",
        },
        offset: { type: "integer", description: "Character offset for long bodies." },
        limit: { type: "integer", description: "Max characters to return. Default 8000." },
      },
      additionalProperties: false,
    },
  },
  async execute(ctx, input) {
    const store = await readViewStore(ctx.viewId);
    const kind = asString(input.kind) ?? "artifact";
    const id = (asString(input.id) || ctx.documentSlug || "").trim();
    if (!id) throw new Error("id is required.");
    const offset = typeof input.offset === "number" ? input.offset : 0;
    const limit = typeof input.limit === "number" ? input.limit : BODY_LIMIT;

    if (kind === "task" || /^LMS-|ING-/.test(id)) {
      const task = findTask(store.planner, id);
      if (task) {
        const body = task.description ?? "";
        return {
          result: {
            kind: "task",
            id: task.id,
            key: task.key,
            title: task.title,
            ...pageBody(body, offset, limit),
          },
        };
      }
    }

    if (kind === "event") {
      const event = store.calendar.find((item) => item.id === id);
      if (!event) throw new Error(`Event not found: ${id}`);
      return {
        result: {
          kind: "event",
          id: event.id,
          title: event.title,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          location: event.location ?? null,
          ...pageBody(event.location ?? event.title, offset, limit),
        },
      };
    }

    const artifact = store.artifacts.find((item) => item.id === id || item.slug === id);
    if (!artifact) throw new Error(`Object not found: ${id}`);
    const reads=ctx.artifactReads??=new Map();
    reads.set(artifact.id,artifact as unknown as Record<string,unknown>);
    reads.set(artifact.slug,artifact as unknown as Record<string,unknown>);
    const paged = pageBody(artifactBodyText(artifact), offset, limit);
    return {
      result: {
        kind: "artifact",
        id: artifact.id,
        slug: artifact.slug,
        artifactKind: artifact.kind,
        title: artifact.title,
        ...paged,
      },
    };
  },
};

const getObjectContext: HarnessTool = {
  name: "get_object_context",
  facing: "agent",
  summary: "Return an object summary and its 1-hop linked neighbors (summaries only).",
  definition: {
    name: "get_object_context",
    description:
      "Fetch an object summary plus 1-hop linked neighbors. Never returns full bodies — use read_object for that.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        kind: { type: "string", enum: ["artifact", "event", "task"] },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  async execute(ctx, input) {
    const store = await readViewStore(ctx.viewId);
    const id = asString(input.id)?.trim();
    if (!id) throw new Error("id is required.");
    const kind = (asString(input.kind) as ObjectRef["kind"] | undefined) ?? "artifact";
    const ref: ObjectRef = { kind, id };

    let summary = null;
    if (kind === "artifact") {
      const artifact = store.artifacts.find((item) => item.id === id || item.slug === id);
      if (artifact) {
        ref.id = artifact.id;
        summary = summarizeArtifact(artifact, store.courses);
      }
    } else if (kind === "event") {
      const event = store.calendar.find((item) => item.id === id);
      if (event) summary = summarizeEvent(event, store.courses);
    } else {
      const task = findTask(store.planner, id);
      if (task) {
        ref.id = task.id;
        summary = summarizeTask(task, store.courses);
      }
    }
    if (!summary) throw new Error(`Object not found: ${id}`);

    const neighbors = linksFor(store.links, ref)
      .map((link) => {
        const other = otherEnd(link, ref);
        if (other.kind === "artifact") {
          const hit = store.artifacts.find((item) => item.id === other.id);
          return hit ? summarizeArtifact(hit, store.courses) : null;
        }
        if (other.kind === "event") {
          const hit = store.calendar.find((item) => item.id === other.id);
          return hit ? summarizeEvent(hit, store.courses) : null;
        }
        const hit = findTask(store.planner, other.id);
        return hit ? summarizeTask(hit, store.courses) : null;
      })
      .filter(Boolean);

    return { result: { object: summary, neighbors } };
  },
};

const listObjectsTool: HarnessTool = {
  name: "list_objects",
  facing: "agent",
  summary: "Search artifacts, tasks, and events by title, course, or tag.",
  definition: {
    name: "list_objects",
    description: "List objects the student has. Filter by kind, course, tag, or query.",
    input_schema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["artifact", "event", "task"] },
        query: { type: "string" },
        courseId: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  async execute(ctx, input) {
    const store = await readViewStore(ctx.viewId);
    const query = (asString(input.query) ?? "").toLowerCase();
    const kind = asString(input.kind);
    const courseId = asString(input.courseId);
    let rows = [
      ...store.artifacts.map((item) => summarizeArtifact(item, store.courses)),
      ...store.planner.flatMap((issue) =>
        flatten(issue).map((node) => summarizeTask(node, store.courses)),
      ),
      ...store.calendar.map((item) => summarizeEvent(item, store.courses)),
    ];
    if (kind) rows = rows.filter((row) => row.kind === kind);
    if (courseId) rows = rows.filter((row) => row.courseId === courseId);
    if (query) {
      rows = rows.filter(
        (row) =>
          row.title.toLowerCase().includes(query) ||
          row.id.toLowerCase().includes(query),
      );
    }
    return { result: { count: rows.length, objects: rows.slice(0, 40) } };
  },
};

const linkTool: HarnessTool = {
  name: "link_objects",
  facing: "agent",
  summary: "Create a bidirectional link between two objects.",
  definition: {
    name: "link_objects",
    description: "Link two objects (artifact, task, or event). Stored once, visible from both ends.",
    input_schema: {
      type: "object",
      properties: {
        a_kind: { type: "string", enum: ["artifact", "event", "task"] },
        a_id: { type: "string" },
        b_kind: { type: "string", enum: ["artifact", "event", "task"] },
        b_id: { type: "string" },
      },
      required: ["a_kind", "a_id", "b_kind", "b_id"],
      additionalProperties: false,
    },
  },
  async execute(ctx, input) {
    const a = parseRef(input.a_kind, input.a_id);
    const b = parseRef(input.b_kind, input.b_id);
    if (!a || !b) throw new Error("Both ends of the link are required.");
    const link = await linkObjects(ctx.viewId, a, b);
    return {
      result: { ok: true, link },
      action: { tool: "link_objects", summary: `Linked ${a.kind} ${a.id} ↔ ${b.kind} ${b.id}` },
    };
  },
};

const unlinkTool: HarnessTool = {
  name: "unlink_objects",
  facing: "agent",
  summary: "Remove a link by id.",
  definition: {
    name: "unlink_objects",
    description: "Remove an object link by its link id.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
      additionalProperties: false,
    },
  },
  async execute(ctx, input) {
    const id = asString(input.id)?.trim();
    if (!id) throw new Error("id is required.");
    await unlinkObjects(ctx.viewId, id);
    return {
      result: { ok: true },
      action: { tool: "unlink_objects", summary: `Removed link ${id}` },
    };
  },
};

const setGoal: HarnessTool = {
  name: "set_goal",
  facing: "agent",
  summary: "Declare a checkable goal for a multi-step request.",
  definition: {
    name: "set_goal",
    description: "Set a one-sentence checkable goal for this turn. Skip for simple Q&A.",
    input_schema: {
      type: "object",
      properties: { goal: { type: "string" } },
      required: ["goal"],
      additionalProperties: false,
    },
  },
  async execute(ctx, input) {
    const goal = asString(input.goal)?.trim();
    if (!goal) throw new Error("goal is required.");
    ctx.goal = goal;
    ctx.goalComplete = false;
    return { result: { ok: true, goal } };
  },
};

const completeGoal: HarnessTool = {
  name: "complete_goal",
  facing: "agent",
  summary: "Mark the current goal complete and end the tool loop.",
  definition: {
    name: "complete_goal",
    description: "Call when the current goal is met. Ends the tool loop after this round.",
    input_schema: {
      type: "object",
      properties: { note: { type: "string" } },
      additionalProperties: false,
    },
  },
  async execute(ctx, input) {
    ctx.goalComplete = true;
    return { result: { ok: true, note: asString(input.note) ?? null } };
  },
};

const decideModel: HarnessTool = {
  name: "decide_model",
  facing: "agent",
  summary: "Record a model preference; the current request stays on its selected model.",
  definition: {
    name: "decide_model",
    description:
      "Evaluate a model preference for future routing. This tool does not switch the running model. Report the returned active model truthfully.",
    input_schema: {
      type: "object",
      properties: {
        choice: { type: "string", enum: ["haiku", "grok", "sonnet"] },
        reason: { type: "string" },
      },
      required: ["choice"],
      additionalProperties: false,
    },
  },
  async execute(ctx, input) {
    const choice = asString(input.choice) as "haiku" | "grok" | "sonnet" | undefined;
    const picked = decideTeachingModel(choice);
    return {
      result: {active:ctx.modelChoice??decideTeachingModel(),recommended:picked,switched:false,reason:asString(input.reason)||picked.reason},
    };
  },
};

const reportModel: HarnessTool = {
  name: "report_model_choice",
  facing: "agent",
  summary: "Log whether the chosen model fit the output. Not shown to the student.",
  definition: {
    name: "report_model_choice",
    description: "After answering, score whether the model choice fit. Logged only.",
    input_schema: {
      type: "object",
      properties: {
        quality: { type: "string", enum: ["good", "ok", "poor"] },
        note: { type: "string" },
      },
      required: ["quality"],
      additionalProperties: false,
    },
  },
  async execute(ctx, input) {
    ctx.lastModelReport = `${asString(input.quality)} ${asString(input.note) ?? ""}`.trim();
    return { result: { ok: true, logged: true } };
  },
};

const searchTools: HarnessTool = {
  name: "search_tools",
  facing: "agent",
  summary: "Search the tool catalog. Unused in v1 because the full catalog is bound.",
  definition: {
    name: "search_tools",
    description: "Search available tools by name or purpose. The full catalog is already bound.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string" } },
      additionalProperties: false,
    },
  },
  async execute(_ctx, input) {
    const query = (asString(input.query) ?? "").toLowerCase();
    const hits = TOOLS.filter(
      (tool) =>
        !query ||
        tool.name.includes(query) ||
        tool.summary.toLowerCase().includes(query),
    ).map((tool) => ({ name: tool.name, summary: tool.summary }));
    return { result: { tools: hits } };
  },
};

async function webSearch(query: string, academic = false,signal?:AbortSignal):Promise<WebResearch> {
  const tavily = process.env.TAVILY_API_KEY?.trim();
  if (tavily) {
    const res = await fetch("https://api.tavily.com/search", {
      signal,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: tavily,
        query: academic ? `${query} site:.edu OR journal` : query,
        max_results: 5,
        search_depth: "basic",
      }),
    });
    if (!res.ok) throw new Error("Web search failed.");
    const data = (await res.json()) as {
      results?: { title?: string; url?: string; content?: string }[];
    };
    return {results:(data.results ?? []).map((item) => ({
      title: item.title ?? "",
      url: item.url ?? "",
      snippet: item.content ?? "",
    }))};
  }
  const brave = process.env.BRAVE_API_KEY?.trim();
  if (brave) {
    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", query);
    const res = await fetch(url, {
      signal,
      headers: { Accept: "application/json", "X-Subscription-Token": brave },
    });
    if (!res.ok) throw new Error("Web search failed.");
    const data = (await res.json()) as {
      web?: { results?: { title?: string; url?: string; description?: string }[] };
    };
    return {results:(data.web?.results ?? []).slice(0, 5).map((item) => ({
      title: item.title ?? "",
      url: item.url ?? "",
      snippet: item.description ?? "",
    }))};
  }
  return researchPublicWeb(query,academic,signal);
}

function webTool(
  name: string,
  summary: string,
  description: string,
  academic: boolean,
): HarnessTool {
  return {
    name,
    facing: "agent",
    summary,
    definition: {
      name,
      description,
      input_schema: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
        additionalProperties: false,
      },
    },
    async execute(ctx, input) {
      const query = asString(input.query)?.trim();
      if (!query) throw new Error("query is required.");
      return {result:await webSearch(query,academic,ctx.signal)};
    },
  };
}

const webSearchTool = webTool(
  "web_search",
  "General web search.",
  "Search the public web. Return titles, URLs, and snippets.",
  false,
);

const webSourcesTool = webTool(
  "web_sources_search",
  "Academic-biased source search with citation-shaped results.",
  "Search for citable academic sources. Prefer .edu, journals, and primary literature.",
  true,
);

const webLibraryTool: HarnessTool = {
  name: "web_library_search",
  facing: "agent",
  summary: "Find public scholarly sources and openly available PDFs.",
  definition: {
    name: "web_library_search",
    description:
      "Find public scholarly sources and openly available PDF versions. This searches the public web, not a signed-in school library or subscription database.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string" },
        title: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  async execute(ctx, input) {
    const query =
      asString(input.query)?.trim() || asString(input.title)?.trim();
    if (!query) throw new Error("query is required.");
    const sources = await webSearch(query, true,ctx.signal);
    const pdfQuery = `${query} filetype:pdf`;
    let pdfs:WebResearch={results:[]};
    try {
      pdfs = await webSearch(pdfQuery, false,ctx.signal);
    } catch {
      pdfs = {results:[]};
    }
    return { result: {sources:sources.results,summary:sources.summary,pdfs:pdfs.results.slice(0,3),pdfSummary:pdfs.summary,scope:"public web"} };
  },
};

function wrapAnthropicTools(
  tools: Anthropic.Tool[],
  facing: "multi" | "agent",
  summaries: Record<string, string>,
  execute: HarnessTool["execute"],
): HarnessTool[] {
  return tools.map((definition) => ({
    name: definition.name,
    facing,
    summary:
      summaries[definition.name] ??
      (definition.description ?? definition.name).slice(0, 120),
    definition,
    execute,
  }));
}

const plannerWrapped = wrapAnthropicTools(
  PLANNER_TOOLS,
  "agent",
  {
    list_tasks: "List planner tasks.",
    create_task: "Create a planner task.",
    update_task: "Update a planner task.",
    create_subtask: "Add a subtask.",
    delete_task: "Delete a task and its children.",
  },
  (ctx, input) =>
    executePlannerTool(ctx.viewId, (input.__name as string) || "", input),
);

const documentWrapped = wrapAnthropicTools(
  DOCUMENT_TOOLS.filter((tool) => tool.name !== "get_document"),
  "agent",
  { update_document: "Edit the open document body." },
  (ctx, input) =>
    executeDocumentTool(
      ctx.viewId,
      (input.__name as string) || "",
      input,
      ctx.documentSlug,
      ctx.artifactReads??=new Map(),
    ),
);

const diagramWrapped: HarnessTool = {
  name: DIAGRAM_TOOL.name,
  facing: "multi",
  summary: "Emit a student-level diagram spec.",
  definition: DIAGRAM_TOOL,
  async execute() {
    throw new Error("emit_diagram is handled by the diagram skill path.");
  },
};

export const TOOLS: HarnessTool[] = [
  ...STUDY_TOOLS,
  readObject,
  getObjectContext,
  listObjectsTool,
  linkTool,
  unlinkTool,
  setGoal,
  completeGoal,
  decideModel,
  reportModel,
  searchTools,
  webSearchTool,
  webSourcesTool,
  webLibraryTool,
  ...plannerWrapped,
  ...documentWrapped,
  diagramWrapped,
];

export function toolCatalog() {
  return TOOLS.map((tool) => ({ name: tool.name, summary: tool.summary }));
}

export function anthropicToolDefs(names?: string[]) {
  const allow = names ? new Set(names) : null;
  return TOOLS.filter((tool) => !allow || allow.has(tool.name)).map(
    (tool) => tool.definition,
  );
}

export async function executeHarnessTool(
  ctx: ToolContext,
  name: string,
  input: Record<string, unknown>,
): Promise<ToolResult> {
  const tool = TOOLS.find((item) => item.name === name);
  if (!tool) throw new Error(`Unknown tool: ${name}`);
  if (
    PLANNER_TOOLS.some((item) => item.name === name) ||
    DOCUMENT_TOOLS.some((item) => item.name === name)
  ) {
    return tool.execute(ctx, { ...input, __name: name });
  }
  return tool.execute(ctx, input);
}

export function openaiToolsFromAnthropic(defs: Anthropic.Tool[]) {
  return defs.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  }));
}
