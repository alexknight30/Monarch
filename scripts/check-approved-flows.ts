import assert from "node:assert/strict";
import {mkdtemp,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import {jsPDF} from "jspdf";

async function main(){
  process.env.MONARCH_DATA_ROOT=await mkdtemp(path.join(tmpdir(),"monarch-approved-flows-"));
  const db=await import("../src/lib/local-db");
  const {lessonTutorContext,tutorLesson}=await import("../src/lib/lesson-tutor");
  const course=await db.createCourse("test-one",{title:"Biology",code:"BIO 150"});
  const lesson=await db.createArtifactWithContent("test-one",{title:"Energy lesson",kind:"lesson",courseId:course.id},{blocks:[{id:"q1",type:"prompt",prompt:"Why do plants need light?"}]});
  const source=await db.createArtifactWithContent("test-one",{title:"Linked class reading",kind:"reading",courseId:course.id},{bodyText:"Chloroplasts capture light energy to produce sugars through photosynthesis."});
  await db.createArtifactWithContent("test-one",{title:"Unlinked private note",kind:"reading"},{bodyText:"UNLINKED_PRIVATE_MARKER"});
  await db.linkObjects("test-one",{kind:"artifact",id:source.id},{kind:"artifact",id:lesson.id});
  const store=await db.readViewStore("test-one");
  const answer="Light supplies energy used to make sugars.";
  const context=lessonTutorContext(store,lesson.id,"q1","Why do plants need light?",answer);
  assert.equal(context.sources[0].id,source.id);assert.equal(context.sources.length,1);assert.ok(!JSON.stringify(context).includes("UNLINKED_PRIVATE_MARKER"));
  assert.throws(()=>lessonTutorContext(store,lesson.id,"q1","Changed question",answer),/question changed/);
  assert.throws(()=>lessonTutorContext(store,lesson.id,"q1","Why do plants need light?",""),/reasoning first/);
  console.log("PASS: lesson context includes bidirectionally linked sources, excludes unrelated artifacts, rejects changed questions and empty answers");
  if(!process.argv.includes("--live"))return;
  const feedback=await tutorLesson("test-one",lesson.id,"q1","Why do plants need light?",answer);
  assert.ok(feedback.feedback.length>30);assert.equal(feedback.answer,answer);assert.equal(feedback.sources[0].id,source.id);
  assert.deepEqual((await db.getArtifact("test-one",lesson.id) as typeof lesson & {progress?:unknown}).progress,{});
  console.log("PASS: live Grok lesson feedback uses approved linked context and leaves student progress unchanged until the client saves it");
  const pdf=new jsPDF();pdf.setFontSize(12);pdf.text([
    "BIO 150 - Introduction to Biology","Synthetic syllabus for integration testing","Instructor: Dr. Example","Fall Semester 2026","Term begins September 21, 2026 and ends October 9, 2026.",
    "Class: Monday and Wednesday, 10:00-10:50 AM, Room 101.","Office hours: Tuesday, 1:00-2:00 PM, Room 102.",
    "Cell Essay: due October 2, 2026 at 5:00 PM. Weight: 25%.","Final Exam: October 9, 2026 at 10:00 AM. Weight: 75%.","AI may explain concepts but may not write submitted assignments.",
  ],10,20);
  const bytes=Buffer.from(pdf.output("arraybuffer"));const file=path.join(process.env.MONARCH_DATA_ROOT,"synthetic-syllabus.pdf");await writeFile(file,bytes);
  const doc=await db.createSourceDocument("test-one",{filename:"synthetic-syllabus.pdf",mime:"application/pdf",sizeBytes:bytes.length,storedPath:file,kind:"syllabus"});
  await db.updateSourceDocument("test-one",doc.id,{fileApiId:"legacy-anthropic-id-must-not-be-reused"});
  const {runSyllabusIngest}=await import("../src/lib/syllabus/orchestrator");
  const proposal=await runSyllabusIngest("test-one",doc.id);
  assert.equal(proposal.course.code,"BIO 150");assert.equal(proposal.course.termStartsAt,"2026-09-21");
  const essay=proposal.assignments.find(item=>/cell essay/i.test(item.title));assert.ok(essay);assert.ok(essay.dueAt?.startsWith("2026-10-02T17:00"));assert.equal(essay.weight,25);
  assert.ok(proposal.calendarEvents.length>0);assert.equal((await db.readViewStore("test-one")).assignments.length,0,"Review is required before applying");
  await db.applyIngestProposal("test-one",proposal);
  assert.ok((await db.readViewStore("test-one")).assignments.some(item=>/cell essay/i.test(item.title)));
  console.log("PASS: live Grok PDF syllabus extraction preserves course facts, dates and weights; ignores legacy provider IDs; produces a reviewable proposal and applies it successfully");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
