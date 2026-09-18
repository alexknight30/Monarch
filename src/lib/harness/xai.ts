import { meteredXaiResponse, recordXaiUsage, withUsageCategory } from "@/lib/usage-store";
import OpenAI, { toFile } from "openai";
import type { ResponseInput, ResponseInputItem, ResponseOutputItem } from "openai/resources/responses/responses";
import type Anthropic from "@anthropic-ai/sdk";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { GROK_MODEL } from "./models";

export function xaiClient() {
  const apiKey = process.env.XAI_API_KEY?.trim();
  if (!apiKey) throw new Error("Add XAI_API_KEY to .env.local to connect Grok.");
  return new OpenAI({ apiKey, baseURL: "https://api.x.ai/v1", timeout: 180_000, maxRetries: 1 });
}

const uploads = new Map<string, Promise<string>>();
async function uploadDocument(data: string, mime: string, filename: string) {
  const hash = createHash("sha256").update(data).digest("hex");
  const cachePath = path.join(process.env.MONARCH_DATA_ROOT || path.join(process.cwd(), "data"), "provider-files", `${hash}.json`);
  if (!uploads.has(hash)) {
    const upload = (async () => {
      try {
        const cached = JSON.parse(await fs.readFile(cachePath, "utf8")) as { id?: string };
        if (cached.id) return cached.id;
      } catch { /* First upload. */ }
      const result = await xaiClient().files.create({ file: await toFile(Buffer.from(data, "base64"), filename, { type: mime }), purpose: "assistants" });
      await fs.mkdir(path.dirname(cachePath), { recursive: true });
      const temporary = `${cachePath}.${crypto.randomUUID()}.tmp`;
      await fs.writeFile(temporary, JSON.stringify({ id: result.id }), "utf8");
      await fs.rename(temporary, cachePath);
      return result.id;
    })().catch((error) => { uploads.delete(hash); throw error; });
    uploads.set(hash, upload);
    if (uploads.size > 100) uploads.delete(uploads.keys().next().value!);
  }
  return uploads.get(hash)!;
}

/** Preserve native function calls and attachments instead of flattening them to text. */
export async function xaiInput(messages: Anthropic.MessageParam[]): Promise<ResponseInput> {
  const input: ResponseInput = [];
  for (const message of messages) {
    if (typeof message.content === "string") { input.push({ role: message.role, content: message.content }); continue; }
    for (const block of message.content) {
      if (block.type === "text") {
        if (block.text) input.push({ role: message.role, content: block.text });
      } else if (block.type === "tool_use") {
        input.push({ type: "function_call", call_id: block.id, name: block.name, arguments: JSON.stringify(block.input) });
      } else if (block.type === "tool_result") {
        input.push({ type: "function_call_output", call_id: block.tool_use_id, output: typeof block.content === "string" ? block.content : JSON.stringify(block.content ?? []) });
      } else if (block.type === "image") {
        const source = block.source;
        const imageUrl = source.type === "base64" ? `data:${source.media_type};base64,${source.data}` : source.type === "url" ? source.url : undefined;
        if (!imageUrl) throw new Error("This image source is unavailable. Please attach it again.");
        input.push({ role: "user", content: [{ type: "input_image", image_url: imageUrl, detail: "auto" }] });
      } else if (block.type === "document") {
        const source = block.source;
        if (source.type === "text") {
          input.push({ role: "user", content: `Source: ${block.title || "Attached document"}\n<source_document>\n${source.data}\n</source_document>` });
        } else if (source.type === "base64") {
          const id = await uploadDocument(source.data, source.media_type, block.title || "document.pdf");
          input.push({ role: "user", content: [{ type: "input_file", file_id: id }] });
        } else if (source.type === "url") {
          input.push({ role: "user", content: [{ type: "input_file", file_url: source.url }] });
        } else throw new Error("This document source is unavailable. Please attach the original file.");
      }
    }
  }
  return input;
}

export function xaiTools(tools: Anthropic.Tool[]): OpenAI.Responses.Tool[] {
  return tools.map((tool) => ({ type: "function", name: tool.name, description: tool.description,
    parameters: tool.input_schema as Record<string, unknown>, strict: false }));
}

export async function streamXai(opts: { instructions: string; input: ResponseInput; tools?: Anthropic.Tool[]; onText?: (text: string) => void; signal?: AbortSignal }) {
  let reported = false;
  let responseId: string | undefined;
  try {
  const stream = await xaiClient().responses.create({ model: GROK_MODEL, instructions: opts.instructions, input: opts.input,
    tools: xaiTools(opts.tools ?? []), stream: true, store: false, reasoning: { effort: "medium" }, max_output_tokens: 16000 }, { signal: opts.signal });
  let text = "";
  let output: ResponseOutputItem[] | undefined;
  for await (const event of stream) {
    if (event.type === "response.created") responseId = event.response.id;
    if (["response.completed", "response.failed", "response.incomplete"].includes(event.type) && "response" in event) {
      await recordXaiUsage(event.response); reported = true;
    }
    if (event.type === "response.output_text.delta") { text += event.delta; opts.onText?.(event.delta); }
    else if (event.type === "response.completed") output = event.response.output;
    else if (event.type === "response.failed") throw new Error(event.response.error?.message || "Grok could not complete this request. Try again.");
    else if (event.type === "response.incomplete") throw new Error("Grok reached its response limit. Ask to continue with a smaller section.");
    else if (event.type === "error") throw new Error(event.message);
  }
  if (!output) throw new Error("The connection ended before Grok finished. Please retry.");
  const calls = output.filter((item) => item.type === "function_call").map((item) => {
    const parsed: unknown = JSON.parse(item.arguments);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Grok returned invalid tool arguments.");
    return { id: item.call_id, name: item.name, input: parsed as Record<string, unknown> };
  });
  return { text, output, calls };
  } finally { if (!reported) await recordXaiUsage({ id: responseId, model: GROK_MODEL, status: "unreported" }); }
}

export function continuationItems(output: ResponseOutputItem[]): ResponseInputItem[] { return output as ResponseInputItem[]; }

export async function xaiText(system: string, input: string, signal?: AbortSignal) {
  const response = await meteredXaiResponse(xaiClient().responses.create({ model: GROK_MODEL, instructions: system, input, store: false,
    reasoning: { effort: "low" }, max_output_tokens: 4000 }, { signal }));
  if (response.status !== "completed") throw new Error("Grok did not finish the response.");
  return response.output_text.trim();
}

export async function xaiToolResult(system: string, messages: Anthropic.MessageParam[], tool: Anthropic.Tool, signal?: AbortSignal) {
  return withUsageCategory("special", async () => {
  const response = await meteredXaiResponse(xaiClient().responses.create({ model: GROK_MODEL, instructions: system, input: await xaiInput(messages),
    tools: xaiTools([tool]), tool_choice: { type: "function", name: tool.name }, store: false, reasoning: { effort: "low" }, max_output_tokens: 12000 }, { signal }));
  if (response.status !== "completed") throw new Error("Grok did not finish creating the result.");
  const call = response.output.find((item) => item.type === "function_call" && item.name === tool.name);
  if (!call || call.type !== "function_call") throw new Error("Grok did not return the requested result.");
  return JSON.parse(call.arguments) as unknown;
  });
}
