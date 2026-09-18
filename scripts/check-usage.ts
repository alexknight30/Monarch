import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { usageFromResponse, usageContext, recordXaiUsage, readUsageLedger, withUsageCategory, meteredAnthropicResponse } from "../src/lib/usage-store";
import { summarizeUsage } from "../src/lib/usage-summary";
import { xaiText, xaiToolResult, streamXai } from "../src/lib/harness/xai";

async function main() {
  const root = await fs.mkdtemp("/private/tmp/monarch-usage-");
  const oldRoot = process.env.MONARCH_DATA_ROOT, oldKey = process.env.XAI_API_KEY, oldFetch = globalThis.fetch;
  process.env.MONARCH_DATA_ROOT = root;
  process.env.XAI_API_KEY = "synthetic-test-key";
  const usage = { input_tokens: 1000, output_tokens: 100, input_tokens_details: { cached_tokens: 500 }, output_tokens_details: { reasoning_tokens: 40 } };
  const base = { model: "grok-4.5", status: "completed", usage };
  const close = (a: number | null, b: number) => assert.ok(a !== null && Math.abs(a - b) < 1e-10, `${a} != ${b}`);
  try {
    close(usageFromResponse(base, "chat").usd, .00175);
    close(usageFromResponse({ ...base, usage: { ...usage, cost_in_usd_ticks: 123456789 } }, "chat").usd, .0123456789);
    close(usageFromResponse({ ...base, usage: { ...usage, cost_in_usd_ticks: 0 } }, "chat").usd, 0);
    close(usageFromResponse({ ...base, usage: { input_tokens: 200000, output_tokens: 100 } }, "chat").usd, .8012);
    assert.equal(usageFromResponse({ model: "unknown-model", usage }, "chat").usd, null);
    assert.equal(usageFromResponse({ status: "unreported" }, "chat").input, null);
    const entries = [
      { ...usageFromResponse(base, "chat", "2026-09-01T10:00:00Z"), usd: 1 },
      { ...usageFromResponse(base, "special", "2026-09-02T10:00:00Z"), usd: 2 },
      { ...usageFromResponse(base, "setup", "2026-09-03T10:00:00Z"), usd: 3 },
    ];
    const summary = summarizeUsage(entries, "2026-09-01T09:00:00Z", "2026-09", new Date("2026-09-03T12:00:00Z"));
    assert.equal(summary.total.tokens, 3300); // cached and reasoning are not double-counted
    assert.equal(summary.breakdown.special.usd, 2);
    assert.equal(summary.breakdown.setup.usd, 3);
    assert.equal(summary.days[0].total.usd, 1);
    assert.equal(summary.forecast, 60);
    assert.equal(summary.trend.at(-1)?.predicted, 60);
    assert.equal(summary.trend[3].actual, null);
    assert.equal(summarizeUsage(entries, "2026-09-01T09:00:00Z", "2026-09", new Date("2026-09-02T12:00:00Z")).forecast, null);
    assert.equal(summarizeUsage(entries, "2026-09-01T09:00:00Z", "2026-09", new Date("2026-09-06T12:00:00Z")).forecast, 30); // zero-spend days included
    assert.equal(summarizeUsage([...entries, usageFromResponse({}, "chat", "2026-09-03T11:00:00Z")], "2026-09-01T09:00:00Z", "2026-09", new Date("2026-09-03T12:00:00Z")).forecast, null);
    assert.equal(summarizeUsage(entries, "2026-09-01T09:00:00Z", "2026-08").total.calls, 0);
    assert.equal(summarizeUsage([], "2024-02-01T00:00:00Z", "2024-02").days.length, 29);
    assert.equal(summarizeUsage([], "2026-09-01T00:00:00Z", "0000-01").days.length, 31);
    assert.throws(() => summarizeUsage([], "2026-09-01", "2026-13"));

    await usageContext.run({ viewId: "test-one", category: "chat" }, async () => {
      await Promise.all(Array.from({ length: 20 }, (_, i) => recordXaiUsage({ ...base, id: `concurrent-${i}` })));
      await Promise.all(Array.from({ length: 10 }, () => recordXaiUsage({ ...base, id: "same-response" })));
      await withUsageCategory("special", () => recordXaiUsage({ ...base, id: "nested-special" }));
      await recordXaiUsage({ ...base, id: "parent-chat" });
    });
    let ledger = await readUsageLedger("test-one");
    assert.equal(ledger.entries.length, 23);
    assert.equal(ledger.entries.find(e => e.id === "nested-special")?.category, "special");
    assert.equal(ledger.entries.find(e => e.id === "parent-chat")?.category, "chat");
    assert.equal((await readUsageLedger("alex-knight")).entries.length, 0);
    assert.equal((await readUsageLedger("test-one")).startedAt, ledger.startedAt);

    let mode = "text";
    globalThis.fetch = async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      assert.equal(body.model, "grok-4.5");
      const response = { ...base, id: `mock-${mode}`, object: "response", output: mode === "tool" ? [{ type: "function_call", call_id: "call-test", name: "create_test", arguments: '{"ok":true}' }] : [{ type: "message", role: "assistant", content: [{ type: "output_text", text: "Test reply", annotations: [] }] }] };
      if (!body.stream) return Response.json(response);
      const events: Record<string, unknown>[] = [{ type: "response.created", response: { ...response, usage: null } }, { type: "response.output_text.delta", delta: "Test reply" }];
      if (mode !== "interrupted") events.push({ type: "response.completed", response });
      return new Response(events.map(event => `data: ${JSON.stringify(event)}\n\n`).join("") + "data: [DONE]\n\n", { headers: { "Content-Type": "text/event-stream" } });
    };
    await usageContext.run({ viewId: "test-one", category: "chat" }, async () => {
      assert.equal(await xaiText("test", "test"), "Test reply");
      mode = "tool";
      assert.deepEqual(await xaiToolResult("test", [{ role: "user", content: "test" }], { name: "create_test", input_schema: { type: "object" } }), { ok: true });
      mode = "stream";
      assert.equal((await streamXai({ instructions: "test", input: [{ role: "user", content: "test" }] })).text, "Test reply");
      mode = "interrupted";
      await assert.rejects(streamXai({ instructions: "test", input: [{ role: "user", content: "test" }] }), /connection ended/);
    });
    await usageContext.run({ viewId: "test-one", category: "setup" }, () => { mode = "setup"; return xaiText("test", "test"); });
    await usageContext.run({ viewId: "test-one", category: "chat" }, () => meteredAnthropicResponse(Promise.resolve({ id: "fallback", model: "claude-fallback", usage: { input_tokens: 10, output_tokens: 20, cache_read_input_tokens: 100, cache_creation_input_tokens: 40 } }), "claude-fallback"));
    ledger = await readUsageLedger("test-one");
    assert.equal(ledger.entries.find(e => e.id === "mock-tool")?.category, "special");
    assert.equal(ledger.entries.find(e => e.id === "mock-stream")?.input, 1000);
    assert.equal(ledger.entries.find(e => e.id === "mock-setup")?.category, "setup");
    assert.equal(ledger.entries.find(e => e.id === "mock-interrupted")?.usd, null);
    assert.equal(ledger.entries.find(e => e.id === "fallback")?.input, 150);
    assert.equal(ledger.entries.find(e => e.id === "fallback")?.usd, null);
    assert.equal(ledger.entries.length, 29);
    console.log("Usage checks passed: pricing, cached tokens, forecast, interrupted streams, provider integration, categories, concurrency, deduplication, view isolation.");
  } finally {
    globalThis.fetch = oldFetch;
    if (oldRoot === undefined) delete process.env.MONARCH_DATA_ROOT; else process.env.MONARCH_DATA_ROOT = oldRoot;
    if (oldKey === undefined) delete process.env.XAI_API_KEY; else process.env.XAI_API_KEY = oldKey;
    await fs.rm(root, { recursive: true, force: true });
  }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
