import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

async function main() {
  const root = await mkdtemp(path.join(tmpdir(), "monarch-extras-check-"));
  process.env.MONARCH_DATA_ROOT = root;
  const db = await import("../src/lib/local-db");
  const extras = await import("../src/lib/workspace-extras");
  const course = await db.createCourse("test-one", {code:"BIO 100",title:"Biology"});
  const snapshot = path.join(root,"test-one/workspace.json");
  const old = JSON.parse(await readFile(snapshot,"utf8"));
  delete old.profile; delete old.chats;
  await writeFile(snapshot,JSON.stringify(old));
  assert.deepEqual((await db.readViewStore("test-one")).chats,[]);
  await Promise.all([
    extras.saveProfile("test-one",{fullName:" Test Student "}),
    extras.saveProfile("test-one",{school:"Test College"}),
    ...Array.from({length:8},(_,i)=>extras.saveStoredChat("test-one",{id:`chat-${i}`,title:`Chat ${i}`,updatedAt:100+i,messages:[{role:"user",content:"Synthetic question"},{role:"assistant",content:"Synthetic reply",actions:[{tool:"read_object",summary:"Read notes"}]}]})),
  ]);
  let store = await db.readViewStore("test-one");
  assert.equal(store.profile.fullName,"Test Student");assert.equal(store.profile.school,"Test College");assert.equal(store.chats.length,8);
  const latest = {...store.chats[0],updatedAt:1000,title:"Saved title",messages:[{role:"user" as const,content:"Attachment follow-up",attachments:[{id:"file-test",name:"test.txt",mime:"text/plain",size:20}]}]};
  await extras.saveStoredChat("test-one",latest);
  const ignored = await extras.saveStoredChat("test-one",{...latest,title:"Stale tab",updatedAt:500});
  assert.equal(ignored.title,"Saved title");
  store=await db.readViewStore("test-one");
  assert.deepEqual(store.chats.find(t=>t.id===latest.id),latest);
  assert.equal((await db.readViewStore("alex-seager")).chats.length,0);
  await assert.rejects(extras.saveStoredChat("test-one",{...latest,messages:[{role:"system",content:"Invalid role"}]}),/Invalid conversation/);
  await assert.rejects(extras.saveProfile("test-one",{school:123}),/Profile fields/);
  console.log("PASS: old snapshot migration, concurrent profile/chat saves, attachments, stale-write rejection and view isolation");
  const task = await db.createPlannerIssue("test-one",{title:"Study cells",courseId:course.id,dueAt:"2026-10-05T16:00"});
  assert.equal(task.dueAt,"2026-10-05T16:00");
  await db.updatePlannerIssue("test-one",task.key,{courseId:"unassigned",dueAt:"2026-10-06"});
  let loaded = (await db.getPlannerIssue("test-one",task.key))!;
  assert.equal(loaded.courseId,"unassigned");assert.equal(loaded.courseSlug,"unassigned");assert.equal(loaded.dueAt,"2026-10-06");
  await db.updatePlannerIssue("test-one",task.key,{course:course.code,dueAt:null});
  loaded=(await db.getPlannerIssue("test-one",task.key))!;
  assert.equal(loaded.courseId,course.id);assert.equal(loaded.dueAt,undefined);assert.equal(loaded.due,undefined);
  await assert.rejects(db.updatePlannerIssue("test-one",task.key,{dueAt:"2026-02-30"}),/does not exist/);
  await assert.rejects(db.createPlannerIssue("test-one",{title:"Invalid course",courseId:"missing"}),/existing course/);
  const child=await db.createSubtask("test-one",task.key,{title:"Nested work"});
  const artifact=await db.createArtifact("test-one",{title:"Notes"});
  await db.linkObjects("test-one",{kind:"task",id:child.id},{kind:"artifact",id:artifact.id});
  await db.deletePlannerIssue("test-one",task.key);
  store=await db.readViewStore("test-one");
  assert.equal(store.planner.length,0);assert.equal(store.links.length,0);assert.ok(store.artifacts.some(a=>a.id===artifact.id));
  console.log("PASS: real task dates, persistent course reassignment, date clearing, nested link cleanup and preserved artifacts");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
