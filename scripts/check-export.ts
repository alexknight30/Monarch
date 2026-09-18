import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import JSZip from "jszip";
import { exportPowerPoint } from "../src/lib/slides";
import { htmlToPlainText } from "../src/lib/documents";
async function main() {
  assert.equal(htmlToPlainText('<p>First paragraph</p><p>Second<br>line</p>'), "First paragraph\n\nSecond\nline");
  assert.equal(htmlToPlainText('<p>Equation: <span data-type="inline-math" data-latex="E=mc^2"></span></p>'), "Equation: $E=mc^2$");
  const dir = await mkdtemp(path.join(tmpdir(), "monarch-export-check-"));
  const name = path.join(dir, "study-slides");
  await exportPowerPoint([
    { id: "one", title: "Cell respiration", bodyHtml: "<p>Glucose releases energy.</p>", notes: "Explain the role of ATP." },
    { id: "two", title: "Diagram", bodyHtml: "", background: "#eeeeff", elements: [
      { id: "text", type: "text", text: "Energy transfer", x: 100, y: 50, width: 600, height: 90, fontSize: 36, color: "#123456", fill: "transparent", bold: true },
      { id: "shape", type: "ellipse", x: 200, y: 200, width: 200, height: 200, fontSize: 24, color: "#000000", fill: "#abcdef" },
    ] },
  ], name);
  const zip = await JSZip.loadAsync(await readFile(name + ".pptx"));
  const first = await zip.file("ppt/slides/slide1.xml")!.async("string");
  const second = await zip.file("ppt/slides/slide2.xml")!.async("string");
  const notes = await zip.file("ppt/notesSlides/notesSlide1.xml")!.async("string");
  assert.ok(first.includes("Cell respiration") && first.includes("Glucose releases energy."));
  assert.ok(second.includes("Energy transfer") && second.includes("ellipse") && second.includes("EEEEFF"));
  assert.ok(notes.includes("Explain the role of ATP."));
  console.log("PASS: editable PowerPoint text, shapes, backgrounds and speaker notes; document text and equation preservation");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
