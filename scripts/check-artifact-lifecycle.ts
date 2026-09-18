import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import type { ArtifactKind } from "../src/lib/mock-data";

async function main() {
  process.env.MONARCH_DATA_ROOT=await mkdtemp(path.join(tmpdir(),"monarch-lifecycle-check-"));
  const db=await import("../src/lib/local-db");const lifecycle=await import("../src/lib/artifact-lifecycle");
  const course=await db.createCourse("test-one",{title:"Biology",code:"BIO 100"});
  const fixtures:{kind:ArtifactKind;content:Record<string,unknown>;field:string}[]=[
    {kind:"document",field:"bodyHtml",content:{bodyHtml:"<p>Essay</p>",thread:[{role:"user",content:"Question"}],comments:[{id:"c1",text:"Revise",quote:"Essay",createdAt:"2026-09-17"}]}},
    {kind:"notes",field:"bodyHtml",content:{bodyHtml:"<p>Class notes</p>"}},
    {kind:"diagram",field:"snapshot",content:{snapshot:{store:{},schema:{schemaVersion:2,sequences:{}}}}},
    {kind:"flashcards",field:"cards",content:{cards:[{id:"c1",front:"Question",back:"Answer"}],study:{known:["c1"]}}},
    {kind:"lesson",field:"blocks",content:{blocks:[{id:"b1",type:"text",text:"Introduction"}],progress:{b1:{complete:true,answer:"My answer"}}}},
    {kind:"practice-test",field:"items",content:{items:[{id:"q1",prompt:"Question",answer:"Answer"}],attempts:[{id:"a1",answers:{q1:"Old answer"}}]}},
    {kind:"reading",field:"annotations",content:{bodyText:"Reading",annotations:[{id:"n1",quote:"Reading",note:"My note"}]}},
    {kind:"slides",field:"slides",content:{slides:[{id:"s1",title:"Slide",bodyHtml:"<p>Details</p>",notes:"Speaker notes"}]}},
  ];
  for(const fixture of fixtures) {
    const source=await db.createArtifactWithContent("test-one",{title:`Source ${fixture.kind}`,kind:fixture.kind,courseId:course.id},fixture.content);
    const copied=await lifecycle.duplicateArtifact("test-one",source.id);
    assert.notEqual(copied.id,source.id);assert.equal(copied.kind,source.kind);assert.equal(copied.courseId,course.id);
    assert.deepEqual((copied as unknown as Record<string,unknown>)[fixture.field],fixture.content[fixture.field]);
    if(copied.kind==="document"||copied.kind==="notes")assert.deepEqual(copied.thread,[]);
    if(copied.kind==="practice-test")assert.deepEqual(copied.attempts,[]);
    if(copied.kind==="lesson")assert.deepEqual(copied.progress,{});
    if(copied.kind==="flashcards")assert.equal(copied.study,undefined);
  }
  const first=await db.createArtifact("test-one",{title:"Connected A",courseId:course.id});
  const second=await db.createArtifact("test-one",{title:"Connected B",courseId:course.id});
  await db.linkObjects("test-one",{kind:"artifact",id:first.id},{kind:"artifact",id:second.id});
  const task=await db.createPlannerIssue("test-one",{title:"Keep this task",artifactId:first.id,artifact:first.title});
  await db.linkObjects("test-one",{kind:"artifact",id:first.id},{kind:"task",id:task.id});
  const linkedCopy=await lifecycle.duplicateArtifact("test-one",first.id);
  assert.equal((await db.listLinksFor("test-one",{kind:"artifact",id:linkedCopy.id})).length,2);
  await lifecycle.trashArtifact("test-one",first.id);
  assert.equal(await db.getArtifact("test-one",first.id),null);
  assert.equal((await db.getPlannerIssue("test-one",task.key))?.artifactId,undefined);
  const newSameName=await db.createArtifact("test-one",{title:first.title});assert.notEqual(newSameName.id,first.id);
  await assert.rejects(db.patchArtifact("test-one",first.id,{bodyHtml:"Late write"}),/not found/);
  await lifecycle.trashArtifact("test-one",second.id);
  await lifecycle.restoreArtifact("test-one",first.id);
  await lifecycle.restoreArtifact("test-one",second.id);
  const restoredLinks=await db.listLinksFor("test-one",{kind:"artifact",id:first.id});assert.equal(restoredLinks.length,2);
  assert.equal((await db.getPlannerIssue("test-one",task.key))?.artifactId,first.id);
  await lifecycle.trashArtifact("test-one",first.id);
  await db.updatePlannerIssue("test-one",task.key,{artifactId:second.id,artifact:second.title});
  await lifecycle.restoreArtifact("test-one",first.id);
  assert.equal((await db.getPlannerIssue("test-one",task.key))?.artifactId,second.id);
  assert.equal((await db.readViewStore("test-one")).trash.length,0);
  console.log("PASS: all eight artifact copies preserve content and reset study/chat state; trash preserves linked work; restore reconnects links/tasks without overwriting new choices; trashed IDs stay reserved and reject late writes");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
