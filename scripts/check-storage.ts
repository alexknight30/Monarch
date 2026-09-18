import { mkdtemp, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";

async function main() {
  const root = await mkdtemp(path.join(tmpdir(), "monarch-store-check-"));
  process.env.MONARCH_DATA_ROOT = root;
  const db = await import("../src/lib/local-db");
  await mkdir(path.join(root, "test-one"));
  const legacy = JSON.stringify([{ id: "existing", slug: "existing", code: "TEST 100", title: "Original course", term: "Fall 2026", instructor: "Teacher", description: "Keep", schedule: "TBD" }]);
  await writeFile(path.join(root, "test-one/courses.json"), legacy);
  await Promise.all(Array.from({ length: 30 }, (_, i) => db.createPlannerIssue("test-one", { title: `Concurrent task ${i}` })));
  let store = await db.readViewStore("test-one");
  assert.equal(store.planner.length, 30);
  assert.equal(new Set(store.planner.map((task) => task.key)).size, 30);
  assert.equal(store.courses.find((course) => course.id === "existing")?.title, "Original course");
  assert.equal(await readFile(path.join(root, "test-one/courses.json"), "utf8"), legacy);
  console.log("PASS: 30 concurrent saves; unique task IDs; legacy migration preserves original files");
  const artifact = await db.createArtifact("test-one", { title: "Test document" });
  await Promise.all([
    db.patchArtifact("test-one", artifact.id, { title: "Updated title" }),
    db.patchArtifact("test-one", artifact.id, { description: "Updated description" }),
  ]);
  const saved = await db.getArtifact("test-one", artifact.id);
  assert.equal(saved?.title, "Updated title");
  assert.equal(saved?.description, "Updated description");
  console.log("PASS: overlapping artifact edits preserve both fields");
  const conversation = [{role:"user",content:"Check my reasoning",attachments:[{id:"saved-file",name:"prompt.txt",mime:"text/plain",size:10}]},{role:"assistant",content:"Partial feedback kept after stopping"}];
  await Promise.all([
    db.patchArtifact("test-one",artifact.id,{bodyHtml:"<p>My newer draft</p>"}),
    db.patchArtifact("test-one",artifact.id,{thread:conversation}),
  ]);
  const draftWithChat=await db.getArtifact("test-one",artifact.id);
  assert.ok(draftWithChat?.kind === "document");
  assert.equal(draftWithChat.bodyHtml,"<p>My newer draft</p>");assert.deepEqual(draftWithChat.thread,conversation);
  console.log("PASS: concurrent document typing and chat saves preserve both draft and conversation attachment references");
  const { withWorkspaceTransaction, writeWorkspaceCollections } = await import("../src/lib/workspace-store");
  const seed = await db.readViewStore("test-one");
  await assert.rejects(withWorkspaceTransaction("test-one", seed, async () => {
    await writeWorkspaceCollections("test-one", seed, { planner: [] });
    throw new Error("Simulated failed import");
  }));
  store = await db.readViewStore("test-one");
  assert.equal(store.planner.length, 30);
  console.log("PASS: failed transaction leaves previous workspace intact");
  const { materializeProposal } = await import("../src/lib/syllabus/materialize");
  void materializeProposal;
  for (let i = 0; i < 2; i++) {
    const doc = await db.createSourceDocument("test-one", { filename: `syllabus-${i}.pdf`, mime: "application/pdf", sizeBytes: 10, storedPath: "/tmp/example.pdf" });
    const run = await db.createIngestRun("test-one", doc.id);
    await db.updateIngestRun("test-one", run.id, { status: "proposed" });
    const proposal = {
      runId: run.id, documentId: doc.id,
      course: { id: "course", slug: "course", code: `COURSE ${i}`, title: "Course", instructor: "Teacher", description: "Test", schedule: "TBD", term: "Fall 2026", sourceDocumentId: doc.id },
      assignments: [{ id: "ASG-1", courseSlug: "course", title: "Reading", type: "reading" as const, dueAt: "2026-09-25", weight: null, status: "upcoming" as const }],
      calendarEvents: [], tasks: [{ id: "ING-1", key: "ING-1", title: "Read", status: "todo" as const, assignmentId: "ASG-1", courseId: "course", tagIds: [] }], warnings: [],
    };
    await db.applyIngestProposal("test-one", proposal);
    await db.applyIngestProposal("test-one", proposal);
  }
  store = await db.readViewStore("test-one");
  assert.equal(store.assignments.length, 2);
  assert.equal(new Set(store.assignments.map((a) => a.id)).size, 2);
  assert.equal(store.planner.length, 32);
  assert.equal(store.courses.filter((c) => c.code.startsWith("COURSE")).length, 2);
  console.log("PASS: two-course imports have unique assignment IDs; repeated application is idempotent");
  const fixtures = [
    { kind: "flashcards" as const, data: { cards: [{ id: "c1", front: "Question", back: "Answer" }], study: { known: ["c1"], starred: ["c1"], reverse: true } } },
    { kind: "practice-test" as const, data: { items: [{ id: "q1", prompt: "Why?", answer: "Because", explanation: "Reasoning" }], attempts: [{ id: "a1", startedAt: "2026-09-17", answers: { q1: "My reasoning" }, marks: {}, questions: [{ id: "q1", prompt: "Why?", answer: "Because" }] }] } },
    { kind: "lesson" as const, data: { blocks: [{ id: "b1", type: "prompt", prompt: "Explain" }], progress: { b1: { answer: "My explanation", complete: true } } } },
    { kind: "reading" as const, data: { bodyText: "A passage to annotate.", annotations: [{ id: "n1", quote: "passage", note: "Important", start: 2, end: 9 }] } },
    { kind: "slides" as const, data: { slides: [{ id: "s1", title: "Title", bodyHtml: "", notes: "Speaker note", background: "#ffffff", elements: [{ id: "e1", type: "text", x: 64, y: 48, width: 800, height: 100, text: "Slide content", color: "#000000", fill: "transparent", fontSize: 32 }] }] } },
    { kind: "document" as const, data: { bodyHtml: "<p>Essay draft</p>", comments: [{ id: "d1", quote: "Essay", text: "Revise", createdAt: "2026-09-17" }] } },
    { kind: "notes" as const, data: { bodyHtml: "<p>Class notes</p>", thread: [{ role: "user", content: "Remember this question" }] } },
  ];
  for (const fixture of fixtures) {
    const created = await db.createArtifactWithContent("test-one", { title: `Persistence ${fixture.kind}`, kind: fixture.kind }, fixture.data);
    // Rename through another save, then read through the normalization boundary again.
    await db.patchArtifact("test-one", created.id, { title: `${created.title} renamed` });
    const loaded = await db.getArtifact("test-one", created.id);
    for (const [key, value] of Object.entries(fixture.data)) assert.deepEqual((loaded as unknown as Record<string, unknown>)[key], value, `${fixture.kind}.${key} survives normalization and subsequent saves`);
  }
  console.log("PASS: all seven study editors preserve content, comments, progress and attempts across saves and reloads");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
