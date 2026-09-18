import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";

async function main() {
  process.env.MONARCH_DATA_ROOT = await mkdtemp(path.join(tmpdir(), "monarch-chat-check-"));
  const { runHarness } = await import("../src/lib/harness/loop");
  const { storeChatFiles, loadChatFileBlocks } = await import("../src/lib/chat-attachment-store");
  let text = "";
  const first = await runHarness({ viewId: "test-one", messages: [{ role: "user", content: "In one sentence, explain the difference between recall and recognition in memory." }] }, (part) => { text += part; });
  assert.equal(first.model.model, "grok-4.5");
  assert.ok(text.length > 20);
  console.log("PASS: live Grok 4.5 streaming explanation");

  text = "";
  const mutation = await runHarness({ viewId: "test-one", messages: [{ role: "user", content: "Create a planner task titled Read chapter on memory, due Sep 25. Use the planner tool and confirm when done." }] }, (part) => { text += part; });
  assert.ok(mutation.actions.some((action) => action.tool === "create_task"));
  const { readViewStore } = await import("../src/lib/local-db");
  const { planner } = await readViewStore("test-one");
  assert.ok(planner.some((task: { title: string }) => /chapter on memory/i.test(task.title)));
  assert.ok(text.trim());
  console.log("PASS: live tool call, stored task, tool result and final response");

  const metadata = await storeChatFiles("test-one", [new File(["Study note: the experimental recall code is MONARCH-7319. The class meets Wednesdays."], "study-note.txt", { type: "text/plain" })]);
  const blocks = await loadChatFileBlocks("test-one", metadata);
  text = "";
  await runHarness({ viewId: "test-one", messages: [
    { role: "user", content: [...blocks, { type: "text", text: "Read this note." }] },
    { role: "assistant", content: "I have read the study note." },
    { role: "user", content: "What exact experimental recall code was in my earlier attachment?" },
  ] }, (part) => { text += part; });
  assert.ok(text.includes("MONARCH-7319"));
  console.log("PASS: persisted attachment loaded for a follow-up request");
  console.log(`Isolated test data: ${process.env.MONARCH_DATA_ROOT}`);
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
