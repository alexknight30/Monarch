import assert from "node:assert/strict";
import {mkdtemp} from "node:fs/promises";
import path from "node:path";
import {tmpdir} from "node:os";

async function main(){
  process.env.MONARCH_DATA_ROOT=await mkdtemp(path.join(tmpdir(),"monarch-research-smoke-"));
  const {runHarness}=await import("../src/lib/harness/loop");
  let text="";
  const result=await runHarness({viewId:"test-one",research:true,study:true,messages:[{role:"user",content:"Use web search to find NASA's explanation of Earth's seasons. Give me two sentences and a source link, then a short practice question."}]},chunk=>{text+=chunk;});
  assert.equal(result.model.model,"grok-4.5");assert.ok(text.includes("nasa.gov"));assert.ok(text.length>80);
  console.log("PASS: the research/study harness returns a sourced NASA explanation using exactly Grok 4.5");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
