import assert from "node:assert/strict";
import { mkdtemp,readFile,readdir } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";

async function main() {
  const root=await mkdtemp(path.join(tmpdir(),"monarch-task-source-check-"));process.env.MONARCH_DATA_ROOT=root;
  const db=await import("../src/lib/local-db");const {createTaskWithSource}=await import("../src/lib/task-source");
  const course=await db.createCourse("test-one",{code:"BIO 100",title:"Biology"});
  const id=crypto.randomUUID();const input={title:"Read instructions",course:course.code,dueAt:"2026-10-05",tagIds:["assignment" as const]};
  const file=new File(["Synthetic instructions: explain mitosis."],"instructions.txt",{type:"text/plain"});
  const [one,two]=await Promise.all([createTaskWithSource("test-one",input,file,id),createTaskWithSource("test-one",input,file,id)]);
  assert.equal(one.id,two.id);
  let store=await db.readViewStore("test-one");assert.equal(store.planner.length,1);assert.equal(store.artifacts.length,1);assert.equal(store.documents.length,1);assert.equal(store.links.length,1);
  assert.equal(store.planner[0].artifactId,store.artifacts[0].id);assert.equal(store.artifacts[0].courseId,course.id);assert.equal(store.planner[0].dueAt,"2026-10-05");
  assert.equal(await readFile(store.documents[0].storedPath,"utf8"),"Synthetic instructions: explain mitosis.");
  assert.equal((await readdir(path.join(root,"test-one/uploads"))).length,1);
  await assert.rejects(createTaskWithSource("test-one",{...input,dueAt:"2026-02-30"},file,crypto.randomUUID()),/does not exist/);
  store=await db.readViewStore("test-one");assert.equal(store.planner.length,1);assert.equal(store.artifacts.length,1);assert.equal(store.documents.length,1);assert.equal(store.links.length,1);
  assert.equal((await readdir(path.join(root,"test-one/uploads"))).length,1);
  const existing=await db.createArtifact("test-one",{title:"Essay"});
  const withExisting=await createTaskWithSource("test-one",{...input,title:"Review essay",artifactId:existing.id,artifact:existing.title},file,crypto.randomUUID());
  assert.equal(withExisting.artifactId,existing.id);assert.equal((await db.listLinksFor("test-one",{kind:"task",id:withExisting.id})).length,1);
  console.log("PASS: task attachment preserves original and creates linked reading in correct course; concurrent retry is idempotent; invalid task rolls back records and new files; existing artifact selection is preserved");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
