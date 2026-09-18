import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { b64Vecs } from "@tldraw/tlschema";
import { normalizeFlashcardStudy } from "../src/lib/flashcard-study";
import { migrateWhiteboard, isWhiteboardDocument } from "../src/lib/whiteboard";
import { artifactBodyText, normalizeArtifacts } from "../src/lib/objects/normalize";
import { StudyMarkdown } from "../src/components/ui/study-markdown";
import FlashcardsArtifactPage from "../src/app/artifacts/flashcards-artifact-page";
import type { DiagramArtifact } from "../src/lib/mock-data";
import type { FlashcardsArtifact } from "../src/lib/mock-data";

Object.assign(globalThis, { React });
assert.deepEqual(normalizeFlashcardStudy(undefined), { known: [], starred: [], reverse: false });
assert.deepEqual(normalizeFlashcardStudy({ known: ["one", "one", 42], starred: null, reverse: "false" }), { known: ["one"], starred: [], reverse: false });
assert.deepEqual(normalizeFlashcardStudy({ known: null, starred: ["two"], reverse: true }), { known: [], starred: ["two"], reverse: true });
const markup = renderToStaticMarkup(<StudyMarkdown text={'# Main heading\nIntro with **bold** and *emphasis*.\n\n## Details\n- First\n- Second\n\n3. Third\n4. Fourth\n\n$$\nx^2\n$$\n\n```js\nconst literal = "**text**";\n```\n\n<script>alert(1)</script>'} />);
assert.ok(markup.includes("<h2")); assert.ok(markup.includes("<strong")); assert.ok(markup.includes("<em>"));
assert.ok(markup.includes("<ul")); assert.ok(markup.includes('start="3"')); assert.ok(markup.includes("katex"));
assert.ok(markup.includes("&lt;script&gt;")); assert.ok(!markup.includes("<script>"));
assert.ok(!markup.includes("## Details")); assert.ok(!markup.includes("**bold**"));
const original = {
  id: "synthetic-diagram", slug: "synthetic-diagram", kind: "diagram", title: "Migration fixture", courseId: "unassigned", tagIds: [], description: "", updated: "Now",
  createdBy: "Test", visibility: "Private", instructions: null, context: [], scheduled: [], chats: [],
  spec: { title: "Fixture", layout: "process", detail: 1, nodes: [{ id: "a", label: "First" }, { id: "b", label: "Second" }] },
} as DiagramArtifact;
const fromSpec = migrateWhiteboard(original);
for (const cards of [[], [{ id: "card-1", front: "Question", back: "Answer" }]]) {
  const cardArtifact = { ...original, kind: "flashcards", cards, study: { known: null, starred: null } } as unknown as FlashcardsArtifact;
  const rendered = renderToStaticMarkup(<FlashcardsArtifactPage artifact={cardArtifact} />);
  assert.ok(rendered.includes(cards.length ? "Show back of flashcard" : "Add cards in Edit deck"));
  assert.ok(rendered.includes("Unpin linked objects sidebar"));
}
assert.equal(fromSpec.pages[0].elements.filter(e => e.type === "arrow").length, 1);
assert.ok(isWhiteboardDocument(fromSpec));
const records = [
  { id: "page:a", typeName: "page", name: "First page", index: "a1" },
  { id: "page:b", typeName: "page", name: "Second page", index: "a2" },
  { id: "shape:group", typeName: "shape", type: "group", parentId: "page:a", x: 100, y: 50 },
  { id: "shape:box", typeName: "shape", type: "geo", parentId: "shape:group", x: 20, y: 30, props: { w: 200, h: 100, geo: "rectangle", richText: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Inside group" }] }] } } },
  { id: "shape:ink", typeName: "shape", type: "draw", parentId: "page:b", x: 0, y: 0, props: { segments: [{ path: b64Vecs.encodePoints([{ x: 0, y: 0 }, { x: 25, y: 35 }, { x: 60, y: 10 }], 2), dim: 2 }] } },
  { id: "shape:arrow", typeName: "shape", type: "arrow", parentId: "page:a", x: 0, y: 0, props: { start: { x: 0, y: 0 }, end: { x: 400, y: 200 } } },
  { id: "binding:start", typeName: "binding", type: "arrow", fromId: "shape:arrow", toId: "shape:box", props: { terminal: "start", normalizedAnchor: { x: 1, y: .5 } } },
  { id: "asset:image", typeName: "asset", props: { src: "/api/test-one/assets/synthetic", mimeType: "image/png" } },
  { id: "shape:image", typeName: "shape", type: "image", parentId: "page:b", x: 50, y: 50, props: { w: 100, h: 100, assetId: "asset:image" } },
  { id: "shape:video", typeName: "shape", type: "video", parentId: "page:b", props: { w: 200, h: 100 } },
];
const fixture = { ...original, snapshot: { store: Object.fromEntries(records.map(record => [record.id, record])), schema: {} } } as unknown as DiagramArtifact;
const before = JSON.stringify(fixture.snapshot);
const converted = migrateWhiteboard(fixture);
assert.equal(JSON.stringify(fixture.snapshot), before, "Migration must leave the original snapshot intact");
assert.equal(converted.pages.length, 2);
const box = converted.pages[0].elements.find(e => e.id === "shape:box")!;
assert.equal(box.x, 120); assert.equal(box.y, 80); assert.deepEqual(box.groupIds, ["shape:group"]);
const arrow = converted.pages[0].elements.find(e => e.id === "shape:arrow")!;
assert.equal(arrow.x, 320); assert.equal(arrow.y, 130);
const ink = converted.pages[1].elements.find(e => e.id === "shape:ink")!;
assert.equal(ink.type, "freedraw"); assert.ok("points" in ink && ink.points.length === 3);
assert.ok(converted.pages[1].files["asset:image"]);
assert.ok(converted.migrationNotes?.some(note => note.includes("video")));
const normalized = normalizeArtifacts([{ ...fixture, whiteboard: converted }], [])[0];
assert.equal(normalized.kind, "diagram"); assert.ok(artifactBodyText(normalized).includes("Inside group"));
assert.ok(isWhiteboardDocument(converted)); assert.ok(!isWhiteboardDocument({ version: 1, pages: [] }));
assert.ok(!isWhiteboardDocument({ version: 1, pages: [{ id: "x", name: "x", elements: [{ id: "x", type: "text", x: null, y: 0 }], files: {} }] }));
assert.ok(!isWhiteboardDocument({ version: 1, pages: [{ ...converted.pages[0], files: { missing: { id: "missing", mimeType: "image/png" } } }] }), "A missing image URL must reject before reaching the editor");
assert.ok(!isWhiteboardDocument({ version: 1, pages: [{ ...converted.pages[0], files: [] }] }));
assert.ok(!isWhiteboardDocument({ version: 1, pages: [{ ...converted.pages[0], elements: [box, box] }] }), "Duplicate element IDs cannot safely round-trip");
assert.ok(!isWhiteboardDocument({ version: 1, pages: [{ ...converted.pages[0], elements: [{ ...box, type: "unsupported" }] }] }));
console.log("PASS: incomplete flashcard state; safe lesson Markdown/math; legacy diagram conversion, pages, groups, pen strokes, bound connectors, image records, original preservation and AI-readable text");
