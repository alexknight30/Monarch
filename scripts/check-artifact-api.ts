import assert from "node:assert/strict";
import { jsPDF } from "jspdf";
import JSZip from "jszip";

const origin = process.env.MONARCH_TEST_URL || "http://127.0.0.1:3100";
const headers = { Cookie: "monarch.view=test-one", "Content-Type": "application/json" };
async function request(route: string, method = "GET", body?: unknown) {
  const response = await fetch(origin + route, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, body: await response.json() };
}
async function main() {
  for (const kind of ["document", "notes", "diagram", "flashcards", "practice-test", "lesson", "reading", "slides"]) {
    const created = await request("/api/test-one/artifacts", "POST", { title: `API check ${kind} ${Date.now()}`, kind, source: "Synthetic study material." });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const route = `/api/test-one/artifacts/${created.body.artifact.slug}`;
    const edited = await request(route, "PATCH", { title: `Edited ${kind}`, description: "Saved through the API", tagIds: ["exam", "class"] });
    assert.equal(edited.status, 200);
    const loaded = await request(route);
    assert.equal(loaded.body.artifact.title, `Edited ${kind}`);
    assert.equal(loaded.body.artifact.description, "Saved through the API");
    assert.deepEqual(loaded.body.artifact.tagIds, ["exam"], "Class tag is only valid for tasks/events");
    assert.equal(loaded.body.artifact.kind, kind);
    const stale=await request(route,"PATCH",{title:"Stale title",_base:{title:created.body.artifact.title}});
    assert.equal(stale.status,409);assert.deepEqual(stale.body.conflictingFields,["title"]);assert.equal(stale.body.artifact.title,`Edited ${kind}`);
    const independent=await request(route,"PATCH",{instructions:"Independent edit",_base:{instructions:created.body.artifact.instructions??null}});
    assert.equal(independent.status,200);
    const malformed=await request(route,"PATCH",{title:"Invalid",_base:[]});assert.equal(malformed.status,400);
    const copy=await request(route+"/lifecycle","POST",{action:"duplicate"});assert.equal(copy.status,200);assert.equal(copy.body.artifact.kind,kind);assert.notEqual(copy.body.artifact.id,loaded.body.artifact.id);
    const trash=await request(route+"/lifecycle","POST",{action:"trash"});assert.equal(trash.status,200);
    assert.equal((await request(route)).status,404);
    const restored=await request(route+"/lifecycle","POST",{action:"restore"});assert.equal(restored.status,200);assert.equal(restored.body.artifact.title,`Edited ${kind}`);
  }
  console.log("PASS: all eight artifact types create, update and reload through their routes");
  console.log("PASS: all eight artifact types duplicate, move to Trash, disappear from active reads and restore through their routes");
  const mismatch = await request("/api/mock-one/artifacts"); assert.equal(mismatch.status, 403);
  const missing = await request("/api/test-one/artifacts/missing-artifact"); assert.equal(missing.status, 404);
  console.log("PASS: active workspace isolation and missing artifact handling");
  const pdf = new jsPDF(); pdf.text("Synthetic PDF reading: photosynthesis stores solar energy.", 10, 20);
  const word = new JSZip();
  word.file("[Content_Types].xml", '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  word.file("word/document.xml", '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Synthetic Word reading: mitochondria support cellular respiration.</w:t></w:r></w:p></w:body></w:document>');
  for (const [name, mime, bytes, expected] of [
    ["reading.txt", "text/plain", new TextEncoder().encode("Synthetic plain text reading."), "Synthetic plain text"],
    ["reading.pdf", "application/pdf", new Uint8Array(pdf.output("arraybuffer")), "photosynthesis"],
    ["reading.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", await word.generateAsync({ type: "uint8array" }), "mitochondria"],
  ] as const) {
    const form = new FormData(); form.append("file", new File([bytes as BlobPart], name, { type: mime }));
    const response = await fetch(origin + "/api/test-one/imports/text", { method: "POST", headers: { Cookie: "monarch.view=test-one" }, body: form });
    const imported = await response.json(); assert.equal(response.status, 201, JSON.stringify(imported)); assert.ok(imported.text.includes(expected));
    const original = await fetch(origin + `/api/test-one/documents/${imported.document.id}/file`, { headers: { Cookie: "monarch.view=test-one" } });
    assert.equal(original.status, 200); assert.deepEqual(new Uint8Array(await original.arrayBuffer()), bytes);
    const reading = await request("/api/test-one/artifacts", "POST", { title: `Imported ${name}`, kind: "reading", source: imported.text, sourceDocumentId: imported.document.id });
    assert.equal(reading.status, 201); assert.equal(reading.body.artifact.sourceDocumentId, imported.document.id);
  }
  console.log("PASS: PDF, DOCX and text extraction; original files preserved; reading source references survive creation");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
