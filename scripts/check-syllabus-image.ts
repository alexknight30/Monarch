import assert from "node:assert/strict";
import {mkdtemp,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import sharp from "sharp";
import {prepareSyllabusInput} from "../src/lib/syllabus/provider";
import {runCourseAgent} from "../src/lib/syllabus/agents";
async function main(){
  const root=await mkdtemp(path.join(tmpdir(),"monarch-syllabus-image-"));
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="480"><rect width="1200" height="480" fill="white"/><g fill="black" font-family="Arial" font-size="32"><text x="40" y="70">CHEM 101 - Introductory Chemistry</text><text x="40" y="130">Synthetic syllabus. Instructor: Dr. Example.</text><text x="40" y="190">Fall 2026. September 21 through December 11, 2026.</text><text x="40" y="250">Class: Monday and Wednesday 09:00-10:00, Room 12.</text><text x="40" y="310">Office hours: Tuesday 13:00-14:00, Room 14.</text></g></svg>';
  const file=path.join(root,"syllabus.png");await writeFile(file,await sharp(Buffer.from(svg)).png().toBuffer());
  const result=await runCourseAgent(await prepareSyllabusInput({storedPath:file,filename:"syllabus.png",mime:"image/png"}));
  assert.equal(result.code,"CHEM 101");assert.equal(result.termStartsAt,"2026-09-21");assert.ok(result.meetings.some(item=>item.days.includes(1)&&item.start==="09:00"));
  console.log("PASS: Grok reads a synthetic PNG syllabus through native image input and extracts course, term dates and meeting times");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
