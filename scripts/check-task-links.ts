import assert from "node:assert/strict";
import {mkdtemp} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";

async function main(){
  process.env.MONARCH_DATA_ROOT=await mkdtemp(path.join(tmpdir(),"monarch-task-links-"));
  const db=await import("../src/lib/local-db");
  const academic=await import("../src/lib/academic-store");
  const course=await db.createCourse("test-one",{code:"BIO",title:"Biology"});
  const first=await db.createArtifact("test-one",{title:"Notes",kind:"notes",courseId:course.id});
  const second=await db.createArtifact("test-one",{title:"Notes",kind:"notes",courseId:course.id});
  const a=await academic.saveAssignment("test-one",null,{title:"Essay",courseSlug:course.slug,dueAt:"2026-10-01"});
  const b=await academic.saveAssignment("test-one",null,{title:"Essay",courseSlug:course.slug,dueAt:"2026-10-03"});
  const task=await db.createPlannerIssue("test-one",{title:"Revise",courseId:course.id,artifactId:second.id,assignmentId:b.id});
  assert.equal(task.artifactId,second.id);assert.equal(task.artifact,"Notes");assert.equal(task.assignmentId,b.id);
  await academic.saveAssignment("test-one",a.id,{dueAt:"2026-10-02"});
  assert.equal((await db.getPlannerIssue("test-one",task.key))?.dueAt,undefined);
  await academic.saveAssignment("test-one",b.id,{title:"Revised essay",dueAt:"2026-10-04"});
  let saved=await db.getPlannerIssue("test-one",task.key);
  assert.equal(saved?.assignment,"Revised essay");assert.equal(saved?.dueAt,"2026-10-04");
  await db.patchArtifact("test-one",second.id,{title:"Renamed notes"});
  assert.equal((await db.getPlannerIssue("test-one",task.key))?.artifact,"Renamed notes");
  await db.updatePlannerIssue("test-one",task.key,{artifactId:first.id,assignmentId:a.id});
  saved=await db.getPlannerIssue("test-one",task.key);assert.equal(saved?.artifactId,first.id);assert.equal(saved?.assignmentId,a.id);
  await db.updatePlannerIssue("test-one",task.key,{artifactId:null,assignmentId:null});
  saved=await db.getPlannerIssue("test-one",task.key);
  assert.equal(saved?.artifactId,undefined);assert.equal(saved?.artifact,undefined);assert.equal(saved?.assignmentId,undefined);assert.equal(saved?.assignment,undefined);
  await assert.rejects(db.createPlannerIssue("test-one",{title:"Bad",artifactId:"missing"}),/existing artifact/);
  await assert.rejects(db.updatePlannerIssue("test-one",task.key,{assignmentId:"missing"}),/existing assignment/);
  const ambiguous=await db.createArtifact("test-one",{title:"Notes",kind:"notes",courseId:course.id});
  assert.notEqual(ambiguous.id,first.id);
  const legacy=await db.createPlannerIssue("test-one",{title:"Legacy name",courseId:course.id,artifact:"Notes"});
  assert.equal((await db.getPlannerIssue("test-one",legacy.key))?.artifactId,undefined);
  console.log("PASS: duplicate titles select by ID; assignment changes affect only the correct task; artifact renames display correctly; removing selections clears IDs and names; invalid IDs reject and ambiguous legacy names do not link arbitrarily");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
