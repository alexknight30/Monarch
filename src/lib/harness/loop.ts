import Anthropic from "@anthropic-ai/sdk";
import { meteredAnthropicResponse } from "@/lib/usage-store";
import type { ChatToolAction } from "@/lib/chat-tools";
import type { DocumentChatContext } from "@/lib/document-tools";
import { buildPolicyText } from "./policy";
import { anthropicCacheSystem, decideTeachingModel, hasAnthropicKey, type ModelChoice } from "./models";
import { buildSessionContext } from "./session";
import { anthropicToolDefs, executeHarnessTool, toolCatalog, type ToolContext } from "./tools";
import { continuationItems, streamXai, xaiInput } from "./xai";
import type { ViewId } from "@/lib/views";
import type { ChatAttachmentMeta } from "@/lib/chat-attachments";

export const MAX_TOOL_ROUNDS = 12;
export type HarnessRequest = {
  study?:boolean;
  research?:boolean;
  viewId: ViewId;
  messages: Anthropic.MessageParam[];
  document?: DocumentChatContext;
  courseSlug?: string;
  toolsEnabled?: boolean;
  signal?: AbortSignal;
  attachments?: ChatAttachmentMeta[];
};
export type HarnessDone = {
  actions: ChatToolAction[];
  plannerChanged: boolean;
  documentChanged: boolean;
  documentHtml?: string;
  model: ModelChoice;
};

export function runHarnessStream(request: HarnessRequest) {
  const encoder = new TextEncoder();
  const abort = new AbortController();
  const signal = request.signal ? AbortSignal.any([request.signal, abort.signal]) : abort.signal;
  let canceled = false;
  return new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => {
        if (!canceled && !signal.aborted) controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };
      try {
        if (request.attachments?.length) send({ type: "attachments", attachments: request.attachments });
        const done = await runHarness({ ...request, signal }, (text) => send({ type: "delta", text }));
        send({ type: "done", ...done });
      } catch (error) {
        if (!signal.aborted) send({ type: "error", error: error instanceof Error ? error.message : "The model could not complete this request." });
      } finally { if (!canceled) controller.close(); }
    },
    cancel() { canceled = true; abort.abort(); },
  });
}

export async function runHarness(request: HarnessRequest, onText?: (text: string) => void): Promise<HarnessDone> {
  const policy = [buildPolicyText(toolCatalog()),
    request.study?"Study mode: explain the concept in manageable steps, check assumptions, and end with a short question or similar practice example for the student to try. Support learning without completing graded work.":"",
    request.research?"Research mode: use web_search or web_sources_search before answering factual research questions. Base the answer on returned evidence, include clickable source links, distinguish the provider's synthesis from direct quotations, and say clearly if search fails. Search only for public topic information; exclude private student details and verbatim private document passages from search queries.":"",
  ].filter(Boolean).join("\n\n");
  const session = await buildSessionContext(request.viewId, { courseSlug: request.courseSlug, document: request.document, artifactId: request.document?.slug });
  const model = decideTeachingModel();
  const tools = (request.toolsEnabled === false ? [] : anthropicToolDefs()).filter((tool) =>
    tool.name !== "emit_diagram" && (tool.name !== "update_document" || Boolean(request.document)));
  const ctx: ToolContext = { viewId: request.viewId, documentSlug: request.document?.slug, modelChoice: model,signal:request.signal };
  const actions: ChatToolAction[] = [];
  let documentHtml: string | undefined;
  let convo = request.messages;
  let grokInput = model.provider === "xai" ? await xaiInput(convo) : [];
  let textSent = false;
  const emit = (text: string) => { if (text.trim()) textSent = true; onText?.(text); };

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    request.signal?.throwIfAborted();
    // Finish with a student-facing summary after complete_goal or the tool budget.
    const bound = round === MAX_TOOL_ROUNDS || ctx.goalComplete ? [] : tools;
    let calls: { id: string; name: string; input: Record<string, unknown> }[];
    let assistant: Anthropic.ContentBlock[] = [];
    if (model.provider === "xai") {
      const turn = await streamXai({ instructions: `${policy}\n\n${session}`, input: grokInput, tools: bound, onText: emit, signal: request.signal });
      calls = turn.calls;
      grokInput = [...grokInput, ...continuationItems(turn.output)];
    } else {
      if (!hasAnthropicKey()) throw new Error("Add XAI_API_KEY or ANTHROPIC_API_KEY to .env.local to connect chat.");
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const stream = client.messages.stream({ model: model.model, max_tokens: 8192,
        system: anthropicCacheSystem(policy, session), messages: convo,
        ...(bound.length ? { tools: bound } : {}) }, { signal: request.signal });
      stream.on("text", emit);
      const response = await meteredAnthropicResponse(stream.finalMessage(), model.model);
      if (response.stop_reason === "max_tokens") throw new Error("The response reached its limit. Ask to continue with a smaller section.");
      assistant = response.content;
      calls = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
        .map((b) => ({ id: b.id, name: b.name, input: b.input as Record<string, unknown> }));
    }
    if (!calls.length || !bound.length) break;
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const call of calls) {
      request.signal?.throwIfAborted();
      let result: unknown;
      let failed = false;
      try {
        if (ctx.goalComplete) throw new Error("The goal is already complete. Summarize the result.");
        if (!bound.some((tool) => tool.name === call.name)) throw new Error("This tool is unavailable in the current workspace.");
        const applied = await executeHarnessTool(ctx, call.name, call.input);
        result = applied.result;
        if (applied.action) actions.push(applied.action);
        if (call.name === "update_document" && result && typeof result === "object" && "bodyHtml" in result && typeof result.bodyHtml === "string") documentHtml = result.bodyHtml;
      } catch (error) { failed = true; result = { error: error instanceof Error ? error.message : "Tool failed." }; }
      const output = JSON.stringify(result ?? null);
      grokInput.push({ type: "function_call_output", call_id: call.id, output });
      results.push({ type: "tool_result", tool_use_id: call.id, content: output, ...(failed ? { is_error: true } : {}) });
    }
    convo = [...convo, { role: "assistant", content: assistant }, { role: "user", content: results }];
    emit("\n\n");
  }
  if (!textSent && actions.length) emit(actions.map((a) => a.summary).join("\n"));
  if (!textSent) throw new Error("The model returned no answer. Please retry.");
  return { actions, plannerChanged: actions.length > 0, documentChanged: documentHtml !== undefined,
    ...(documentHtml !== undefined ? { documentHtml } : {}), model };
}
