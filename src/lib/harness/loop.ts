import Anthropic from "@anthropic-ai/sdk";
import type { ChatToolAction } from "@/lib/chat-tools";
import type { DocumentChatContext } from "@/lib/document-tools";
import { buildPolicyText } from "@/lib/harness/policy";
import {
  anthropicCacheSystem,
  decideTeachingModel,
  hasAnthropicKey,
  hasXaiKey,
  type ModelChoice,
} from "@/lib/harness/models";
import { buildSessionContext } from "@/lib/harness/session";
import {
  anthropicToolDefs,
  executeHarnessTool,
  openaiToolsFromAnthropic,
  toolCatalog,
  type ToolContext,
} from "@/lib/harness/tools";
import type { ViewId } from "@/lib/views";

export const MAX_TOOL_ROUNDS = 12;

export type HarnessRequest = {
  viewId: ViewId;
  messages: Anthropic.MessageParam[];
  document?: DocumentChatContext;
  courseSlug?: string;
  toolsEnabled?: boolean;
};

export type HarnessDone = {
  actions: ChatToolAction[];
  plannerChanged: boolean;
  documentChanged: boolean;
  documentHtml?: string;
  model: ModelChoice;
};

function sseChunk(payload: unknown) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export function runHarnessStream(request: HarnessRequest) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(sseChunk(payload)));
      };
      try {
        const done = await runHarness(request, (text) => {
          send({ type: "delta", text });
        });
        send({
          type: "done",
          actions: done.actions,
          plannerChanged: done.plannerChanged,
          documentChanged: done.documentChanged,
          ...(done.documentHtml ? { documentHtml: done.documentHtml } : {}),
        });
      } catch (error) {
        console.error("[harness]", error);
        send({
          type: "error",
          error: error instanceof Error ? error.message : "Failed to reach the model.",
        });
      } finally {
        controller.close();
      }
    },
  });
}

export async function runHarness(
  request: HarnessRequest,
  onText?: (text: string) => void,
): Promise<HarnessDone> {
  const toolsEnabled = request.toolsEnabled !== false;
  const policy = buildPolicyText(toolCatalog());
  const session = await buildSessionContext(request.viewId, {
    courseSlug: request.courseSlug,
    document: request.document,
    artifactId: request.document?.slug,
  });
  const model = decideTeachingModel();
  const tools = toolsEnabled ? anthropicToolDefs() : [];
  const bound = tools.filter((tool) => {
    if (tool.name === "emit_diagram") return false;
    if (tool.name === "update_document" && !request.document) return false;
    return true;
  });

  const ctx: ToolContext = {
    viewId: request.viewId,
    documentSlug: request.document?.slug,
    modelChoice: model,
  };
  const actions: ChatToolAction[] = [];
  let documentHtml: string | undefined;
  let convo = request.messages;
  let rounds = 0;

  while (true) {
    const turn =
      model.provider === "xai" && hasXaiKey()
        ? await turnGrok({
            model: model.model,
            policy,
            session,
            messages: convo,
            tools: bound,
            onText,
          })
        : await turnAnthropic({
            model: model.model,
            policy,
            session,
            messages: convo,
            tools: bound,
            onText,
          });

    if (
      toolsEnabled &&
      turn.stopReason === "tool_use" &&
      turn.toolUses.length &&
      rounds < MAX_TOOL_ROUNDS &&
      !ctx.goalComplete
    ) {
      rounds += 1;
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const use of turn.toolUses) {
        try {
          const applied = await executeHarnessTool(ctx, use.name, use.input);
          if (applied.action) actions.push(applied.action);
          if (
            use.name === "update_document" &&
            applied.result &&
            typeof applied.result === "object" &&
            "bodyHtml" in applied.result &&
            typeof (applied.result as { bodyHtml?: unknown }).bodyHtml === "string"
          ) {
            documentHtml = (applied.result as { bodyHtml: string }).bodyHtml;
          }
          toolResults.push({
            type: "tool_result",
            tool_use_id: use.id,
            content: JSON.stringify(applied.result),
          });
        } catch (err) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: use.id,
            is_error: true,
            content: JSON.stringify({
              error: err instanceof Error ? err.message : "Tool failed.",
            }),
          });
        }
      }
      convo = [
        ...convo,
        { role: "assistant", content: turn.assistantContent },
        { role: "user", content: toolResults },
      ];
      if (ctx.goalComplete) break;
      continue;
    }
    break;
  }

  if (ctx.lastModelReport) {
    console.info("[harness] model report", model, ctx.lastModelReport);
  }

  return {
    actions,
    plannerChanged: !request.document && actions.length > 0,
    documentChanged: Boolean(documentHtml),
    ...(documentHtml ? { documentHtml } : {}),
    model,
  };
}

type ToolUse = { id: string; name: string; input: Record<string, unknown> };

type Turn = {
  stopReason: string;
  toolUses: ToolUse[];
  assistantContent: Anthropic.ContentBlock[];
};

async function turnAnthropic(opts: {
  model: string;
  policy: string;
  session: string;
  messages: Anthropic.MessageParam[];
  tools: Anthropic.Tool[];
  onText?: (text: string) => void;
}): Promise<Turn> {
  if (!hasAnthropicKey()) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const stream = client.messages.stream({
    model: opts.model,
    max_tokens: 1024,
    system: anthropicCacheSystem(opts.policy, opts.session),
    messages: opts.messages,
    ...(opts.tools.length ? { tools: opts.tools } : {}),
  });
  stream.on("text", (delta) => opts.onText?.(delta));
  const response = await stream.finalMessage();
  const toolUses = response.content
    .filter((block): block is Anthropic.ToolUseBlock => block.type === "tool_use")
    .map((block) => ({
      id: block.id,
      name: block.name,
      input:
        block.input && typeof block.input === "object"
          ? (block.input as Record<string, unknown>)
          : {},
    }));
  return {
    stopReason: response.stop_reason ?? "end_turn",
    toolUses,
    assistantContent: response.content,
  };
}

async function turnGrok(opts: {
  model: string;
  policy: string;
  session: string;
  messages: Anthropic.MessageParam[];
  tools: Anthropic.Tool[];
  onText?: (text: string) => void;
}): Promise<Turn> {
  const key = process.env.XAI_API_KEY;
  if (!key) throw new Error("XAI_API_KEY is not configured.");

  const openaiMessages = grokMessages(opts.policy, opts.session, opts.messages);
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model,
      stream: true,
      messages: openaiMessages,
      ...(opts.tools.length
        ? { tools: openaiToolsFromAnthropic(opts.tools) }
        : {}),
    }),
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Grok request failed.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  const toolAcc: Record<
    number,
    { id: string; name: string; arguments: string }
  > = {};

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") continue;
      try {
        const json = JSON.parse(data) as {
          choices?: {
            delta?: {
              content?: string;
              tool_calls?: {
                index?: number;
                id?: string;
                function?: { name?: string; arguments?: string };
              }[];
            };
            finish_reason?: string | null;
          }[];
        };
        const delta = json.choices?.[0]?.delta;
        if (delta?.content) {
          content += delta.content;
          opts.onText?.(delta.content);
        }
        for (const call of delta?.tool_calls ?? []) {
          const index = call.index ?? 0;
          const current = toolAcc[index] ?? { id: "", name: "", arguments: "" };
          if (call.id) current.id = call.id;
          if (call.function?.name) current.name = call.function.name;
          if (call.function?.arguments) current.arguments += call.function.arguments;
          toolAcc[index] = current;
        }
      } catch {
        // ignore malformed SSE lines
      }
    }
  }

  const toolUses: ToolUse[] = Object.values(toolAcc)
    .filter((item) => item.name)
    .map((item, index) => {
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(item.arguments || "{}") as Record<string, unknown>;
      } catch {
        parsed = {};
      }
      return {
        id: item.id || `tool_${index}`,
        name: item.name,
        input: parsed,
      };
    });

  const assistantContent: Anthropic.ContentBlock[] = [];
  if (content) {
    assistantContent.push({ type: "text", text: content } as Anthropic.TextBlock);
  }
  for (const use of toolUses) {
    assistantContent.push({
      type: "tool_use",
      id: use.id,
      name: use.name,
      input: use.input,
    } as Anthropic.ToolUseBlock);
  }

  return {
    stopReason: toolUses.length ? "tool_use" : "end_turn",
    toolUses,
    assistantContent,
  };
}

function grokMessages(
  policy: string,
  session: string,
  messages: Anthropic.MessageParam[],
) {
  const out: { role: string; content: string }[] = [
    { role: "system", content: `${policy}\n\n${session}` },
  ];
  for (const message of messages) {
    if (typeof message.content === "string") {
      out.push({ role: message.role, content: message.content });
      continue;
    }
    const text = message.content
      .map((block) => {
        if ("text" in block && typeof block.text === "string") return block.text;
        if (block.type === "tool_result") {
          return `Tool result ${block.tool_use_id}: ${
            typeof block.content === "string" ? block.content : JSON.stringify(block.content)
          }`;
        }
        if (block.type === "tool_use") {
          return `Called ${block.name}(${JSON.stringify(block.input)})`;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
    out.push({ role: message.role, content: text });
  }
  return out;
}
