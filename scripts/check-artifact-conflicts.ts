import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

async function main() {
  process.env.MONARCH_DATA_ROOT=await mkdtemp(path.join(tmpdir(),"monarch-conflicts-"));
  const db=await import("../src/lib/local-db");
  const {ArtifactConflict}=await import("../src/lib/artifact-conflict");
  const original=await db.createArtifactWithContent("test-one",{title:"Draft",kind:"document"},{bodyHtml:"<p>Original</p>"});
  const base=original as unknown as Record<string,unknown>;
  await db.patchArtifact("test-one",original.id,{bodyHtml:"<p>Tab A</p>"},base);
  await assert.rejects(db.patchArtifact("test-one",original.id,{bodyHtml:"<p>Tab B</p>"},base),error=>{
    assert.ok(error instanceof ArtifactConflict);assert.deepEqual(error.fields,["bodyHtml"]);
    assert.equal((error.artifact as typeof original & {bodyHtml:string}).bodyHtml,"<p>Tab A</p>");return true;
  });
  const merged=await db.patchArtifact("test-one",original.id,{title:"New title"},base);
  assert.equal(merged.title,"New title");assert.equal((merged as typeof original & {bodyHtml:string}).bodyHtml,"<p>Tab A</p>");
  // A retried request whose value already landed is successful, even with its old base.
  await db.patchArtifact("test-one",original.id,{bodyHtml:"<p>Tab A</p>"},base);
  const current=await db.getArtifact("test-one",original.id);
  const concurrentBase=current as unknown as Record<string,unknown>;
  const attempts=await Promise.allSettled([
    db.patchArtifact("test-one",original.id,{bodyHtml:"<p>First</p>"},concurrentBase),
    db.patchArtifact("test-one",original.id,{bodyHtml:"<p>Second</p>"},concurrentBase),
  ]);
  assert.equal(attempts.filter(attempt=>attempt.status==="fulfilled").length,1);
  const rejected=attempts.find(attempt=>attempt.status==="rejected") as PromiseRejectedResult;
  assert.ok(rejected.reason instanceof ArtifactConflict);
  const reviewed=rejected.reason.artifact as Record<string,unknown>;
  await db.patchArtifact("test-one",original.id,{bodyHtml:"<p>Reviewed choice</p>"},reviewed);
  await assert.rejects(db.patchArtifact("test-one",original.id,{bodyHtml:"<p>New stale choice</p>"},reviewed),ArtifactConflict);
  const {executeHarnessTool}=await import("../src/lib/harness/tools");
  const ctx:import("../src/lib/harness/tools").ToolContext={viewId:"test-one",documentSlug:original.slug};
  await assert.rejects(executeHarnessTool(ctx,"update_document",{body_html:"<p>Unread edit</p>"}),/Read the document/);
  await executeHarnessTool(ctx,"read_object",{id:original.id});
  await db.patchArtifact("test-one",original.id,{bodyHtml:"<p>Student keeps typing</p>"});
  await assert.rejects(executeHarnessTool(ctx,"update_document",{body_html:"<p>Stale model edit</p>"}),ArtifactConflict);
  await executeHarnessTool(ctx,"read_object",{id:original.id});
  await executeHarnessTool(ctx,"update_document",{body_html:"<p>Fresh model edit</p>"});
  const cards=await db.createArtifactWithContent("test-one",{title:"Cards",kind:"flashcards"},{cards:[{id:"a",front:"Original",back:"Answer"}]});
  const edit={id:cards.id,content_json:JSON.stringify({cards:[{id:"a",front:"Model change",back:"Answer"}]})};
  await assert.rejects(executeHarnessTool(ctx,"update_study_artifact",edit),/Read the artifact/);
  await executeHarnessTool(ctx,"read_object",{id:cards.id});
  await db.patchArtifact("test-one",cards.id,{cards:[{id:"a",front:"Student change",back:"Answer"}]});
  await assert.rejects(executeHarnessTool(ctx,"update_study_artifact",edit),ArtifactConflict);
  await executeHarnessTool(ctx,"read_object",{id:cards.id});
  await executeHarnessTool(ctx,"update_study_artifact",edit);
  console.log("PASS: stale same-field edits rejected with saved content; independent fields merge; identical retries succeed; simultaneous writers cannot both win; reviewed saves remain protected from new races");
  console.log("PASS: document and study tools must read before editing and cannot overwrite newer student changes");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
