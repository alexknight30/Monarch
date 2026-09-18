import assert from "node:assert/strict";
const root="http://127.0.0.1:3100/api/test-one";
const headers={cookie:"monarch.view=test-one","Content-Type":"application/json"};
async function post(url:string,body:unknown){return fetch(url,{method:"POST",headers,body:JSON.stringify(body)});}
async function main(){
  const created=await post(root+"/artifacts",{title:"Synthetic tutor API lesson",kind:"lesson"});assert.equal(created.status,201);const {artifact}=await created.json();
  const url=root+"/artifacts/"+artifact.id;
  const edited=await fetch(url,{method:"PATCH",headers,body:JSON.stringify({blocks:[{id:"q1",type:"prompt",prompt:"Why does a plant need light?"}]})});assert.equal(edited.status,200);
  const invalid=await post(url+"/tutor",{});assert.equal(invalid.status,400);
  const blank=await post(url+"/tutor",{blockId:"q1",question:"Why does a plant need light?",answer:""});assert.equal(blank.status,400);
  const changed=await post(url+"/tutor",{blockId:"q1",question:"Old question",answer:"My attempt"});assert.equal(changed.status,400);assert.match((await changed.json()).error,/question changed/);
  const missing=await post(url+"/tutor",{blockId:"missing",question:"Question",answer:"Answer"});assert.equal(missing.status,404);
  const wrongView=await post("http://127.0.0.1:3100/api/mock-one/artifacts/"+artifact.id+"/tutor",{blockId:"q1",question:"Why does a plant need light?",answer:"Energy"});assert.equal(wrongView.status,403);
  const malformedImport=await post(root+"/ingest",null);assert.equal(malformedImport.status,400);
  console.log("PASS: tutor routes validate inputs and question versions, enforce workspace isolation and reject missing blocks; malformed syllabus requests reject cleanly");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
