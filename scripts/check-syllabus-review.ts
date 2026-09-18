import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import type { Proposal } from "../src/lib/source-documents";
import { syncReviewedAssignments, validateReviewedProposal } from "../src/lib/syllabus/review";

async function main() {
  process.env.MONARCH_DATA_ROOT = await mkdtemp(path.join(tmpdir(),"monarch-review-check-"));
  const db = await import("../src/lib/local-db");
  const document=await db.createSourceDocument("test-one",{filename:"synthetic.pdf",mime:"application/pdf",sizeBytes:0,storedPath:"/tmp/synthetic.pdf"});
  const run=await db.createIngestRun("test-one",document.id);
  await db.updateIngestRun("test-one",run.id,{status:"proposed"});
  const proposal: Proposal={runId:run.id,documentId:document.id,
    course:{id:"bio",slug:"bio",code:"BIO 100",title:"Biology",description:"",instructor:"",term:"Fall 2026",schedule:"TBD"},
    assignments:[{id:"a1",courseSlug:"bio",title:"Corrected paper",type:"paper",dueAt:"2026-10-15T18:00",weight:25,status:"upcoming"}],
    calendarEvents:[{id:"e1",courseId:"bio",courseSlug:"bio",assignmentId:"a1",title:"Old title",kind:"deadline",timing:"deadline",tagIds:["assignment"],startsAt:"2026-10-01",endsAt:"2026-10-01",generatedBy:"syllabus"}],
    tasks:[{id:"t1",key:"t1",title:"Draft",status:"todo",assignmentId:"a1",dueAt:"2026-10-01",children:[{id:"t2",key:"t2",title:"Read sources",status:"todo",assignmentId:"a1",dueAt:"2026-10-01"}]}],warnings:[]};
  const synced=syncReviewedAssignments(proposal);
  assert.equal(synced.calendarEvents[0].id,"e1");assert.equal(synced.calendarEvents[0].title,"Corrected paper");assert.equal(synced.calendarEvents[0].startsAt,"2026-10-15T18:00");
  assert.equal(synced.tasks[0].children?.[0].dueAt,"2026-10-15T18:00");
  assert.equal(proposal.calendarEvents[0].startsAt,"2026-10-01");
  validateReviewedProposal(synced);
  const cleared=syncReviewedAssignments({...synced,assignments:[{...synced.assignments[0],dueAt:null}]});
  assert.equal(cleared.calendarEvents.length,0);assert.equal(cleared.tasks[0].dueAt,undefined);
  const invalid={...proposal,assignments:[{...proposal.assignments[0],dueAt:"2026-02-30"}]};
  await assert.rejects(db.applyIngestProposal("test-one",invalid),/does not exist/);
  assert.equal((await db.readViewStore("test-one")).assignments.length,0);
  await db.applyIngestProposal("test-one",proposal);
  const store=await db.readViewStore("test-one");
  assert.equal(store.assignments[0].dueAt,"2026-10-15T18:00");assert.equal(store.calendar[0].startsAt,"2026-10-15T18:00");assert.equal(store.planner[0].children?.[0].dueAt,"2026-10-15T18:00");
  assert.equal(store.calendar[0].assignmentId,store.assignments[0].id);assert.equal(store.planner[0].assignmentId,store.assignments[0].id);
  console.log("PASS: reviewed dates/titles sync to deadlines and nested tasks; clearing dates removes deadlines; invalid import rolls back; server reconciles stale proposal fields");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
