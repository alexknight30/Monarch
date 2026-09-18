import { AsyncLocalStorage } from "node:async_hooks";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import type { ViewId } from "./views";
import type { UsageCategory, UsageEntry } from "./usage-summary";

export const usageContext = new AsyncLocalStorage<{ viewId: ViewId; category: UsageCategory }>();
export function setUsageCategory(category: UsageCategory) { const context = usageContext.getStore(); if (context) context.category = category; }
export function withUsageCategory<T>(category: UsageCategory, work: () => T): T {
  const context = usageContext.getStore();
  return context ? usageContext.run({ ...context, category }, work) : work();
}
const folder = (viewId: ViewId) => path.join(process.env.MONARCH_DATA_ROOT || path.join(process.cwd(), "data"), viewId, "usage");
async function putOnce(filename: string, value: unknown) {
  await fs.mkdir(path.dirname(filename), { recursive: true });
  const temporary = filename + "." + randomUUID() + ".tmp";
  await fs.writeFile(temporary, JSON.stringify(value), { mode: 0o600 });
  try { await fs.link(temporary, filename); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
  finally { await fs.unlink(temporary); }
}
export async function ensureUsageLedger(viewId: ViewId) {
  const filename = path.join(folder(viewId), "started.json");
  await putOnce(filename, { startedAt: new Date().toISOString() });
  return JSON.parse(await fs.readFile(filename, "utf8")) as { startedAt: string };
}
export async function readUsageLedger(viewId: ViewId) {
  const { startedAt } = await ensureUsageLedger(viewId);
  const names = (await fs.readdir(folder(viewId))).filter(name => /^[a-f0-9]{64}\.json$/.test(name));
  const entries = await Promise.all(names.map(async name => JSON.parse(await fs.readFile(path.join(folder(viewId), name), "utf8")) as UsageEntry));
  return { startedAt, entries };
}
type ProviderResponse = { id?: string; model?: string; status?: string; usage?: unknown; output?: unknown[] };
const number = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
export function usageFromResponse(response: ProviderResponse, category: UsageCategory, at = new Date().toISOString()): UsageEntry {
  const usage = (response.usage || {}) as Record<string, unknown>;
  const input = number(usage.input_tokens), output = number(usage.output_tokens);
  const cached = Math.min(input ?? 0, number((usage.input_tokens_details as Record<string, unknown>)?.cached_tokens) ?? 0);
  const reasoning = number((usage.output_tokens_details as Record<string, unknown>)?.reasoning_tokens) ?? 0;
  const ticks = number(usage.cost_in_usd_ticks);
  let usd = ticks === null ? null : ticks / 1e10;
  let costSource: UsageEntry["costSource"] = usd === null ? "unknown" : "provider";
  // xAI list prices verified 2026-09-17. Reasoning is already included in
  // output_tokens, and cached tokens are a subset of input_tokens.
  if (usd === null && response.model?.startsWith("grok-4.5") && input !== null && output !== null) {
    const multiplier = input >= 200_000 ? 2 : 1;
    const searches = (response.output || []).filter(item => (item as { type?: string })?.type === "web_search_call").length;
    usd = ((input - cached) * 2 + cached * .3 + output * 6) / 1e6 * multiplier + searches * .005;
    costSource = "estimate";
  }
  return { id: response.id || randomUUID(), at, category, model: response.model || "grok-4.5", status: response.status || "unreported", input, output, cached, reasoning, usd, costSource };
}
export async function recordXaiUsage(response: ProviderResponse) {
  const context = usageContext.getStore(); if (!context) return;
  const entry = usageFromResponse(response, context.category);
  await ensureUsageLedger(context.viewId);
  const id = createHash("sha256").update(entry.id).digest("hex");
  await putOnce(path.join(folder(context.viewId), id + ".json"), entry);
}
export async function meteredXaiResponse<T extends ProviderResponse>(request: PromiseLike<T>): Promise<T> {
  let response: T;
  try { response = await request; }
  catch (error) { await recordXaiUsage({ status: "unreported" }); throw error; }
  await recordXaiUsage(response);
  return response;
}

/** Keep token coverage if the optional Anthropic fallback is configured.
 * No guessed price for a model without a verified rate: the UI flags it. */
export async function meteredAnthropicResponse<T extends { id: string; model: string; usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null } }>(request: PromiseLike<T>, model: string): Promise<T> {
  let response: T;
  try { response = await request; }
  catch (error) { await recordXaiUsage({ model, status: "unreported" }); throw error; }
  const usage = response.usage;
  await recordXaiUsage({ id: response.id, model: response.model, status: "completed", usage: {
    input_tokens: usage.input_tokens + (usage.cache_read_input_tokens || 0) + (usage.cache_creation_input_tokens || 0),
    output_tokens: usage.output_tokens,
    input_tokens_details: { cached_tokens: usage.cache_read_input_tokens || 0 },
  } });
  return response;
}
