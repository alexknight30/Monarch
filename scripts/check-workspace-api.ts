import assert from "node:assert/strict";

// Use the isolated development preview, never the student's normal server/data root.
const base = "http://127.0.0.1:3100/api/test-one";
async function request(route:string, method="GET", body?:unknown) {
  return fetch(base+route,{method,headers:{cookie:"monarch.view=test-one","Content-Type":"application/json"},...(body === undefined ? {} : {body:JSON.stringify(body)})});
}
async function main() {
  let response=await request("/profile","PATCH",{preferredName:"Synthetic Student",school:"Example College"});
  assert.equal(response.status,200);
  response=await request("/profile");assert.equal((await response.json()).profile.preferredName,"Synthetic Student");
  const thread={id:crypto.randomUUID(),title:"Recovery API test",updatedAt:Date.now(),messages:[{role:"user",content:"Synthetic text"},{role:"assistant",content:"Kept partial answer"}]};
  response=await request("/chats","POST",thread);assert.equal(response.status,200);
  response=await request("/chats");assert.deepEqual((await response.json()).threads.find((t:{id:string})=>t.id===thread.id),thread);
  response=await request("/chats","POST",{...thread,title:"Stale",updatedAt:1});assert.equal((await response.json()).thread.title,thread.title);
  response=await request("/chats","POST",{...thread,messages:[{role:"invalid",content:"bad"}]});assert.equal(response.status,400);
  response=await request("/workspace/export");assert.equal(response.status,200);assert.match(response.headers.get("content-disposition")||"",/attachment/);
  const exported=await response.json();assert.equal(exported.format,"monarch-workspace-records");assert.ok(exported.workspace.chats.some((t:{id:string})=>t.id===thread.id));assert.equal(exported.workspace.profile.school,"Example College");
  response=await fetch("http://127.0.0.1:3100/api/alex-seager/chats",{headers:{cookie:"monarch.view=test-one"}});assert.equal(response.status,403);
  response=await request("/workspace/backup");assert.equal(response.status,200);const bytes=await response.arrayBuffer();
  const restoreRequest=async(action:string,confirmation:string)=>{
    const form=new FormData();form.append("file",new File([bytes],"test.monarch.gz",{type:"application/gzip"}));form.append("action",action);form.append("confirmation",confirmation);
    return fetch(base+"/workspace/restore",{method:"POST",headers:{cookie:"monarch.view=test-one"},body:form});
  };
  response=await restoreRequest("preview","");assert.equal(response.status,200);assert.ok((await response.json()).preview.conversations>0);
  response=await restoreRequest("restore","");assert.equal(response.status,400);
  await request("/profile","PATCH",{school:"Temporary change"});
  response=await restoreRequest("restore","REPLACE");assert.equal(response.status,200);
  response=await request("/profile");assert.equal((await response.json()).profile.school,"Example College");
  console.log("PASS: profile/chat API persistence, stale-write handling, validation, records export and cross-view isolation");
  console.log("PASS: full backup download, restore preview, required replacement confirmation and actual restoration");
  const requestId=crypto.randomUUID();
  const createAttachedTask=()=>{const form=new FormData();form.append("task",JSON.stringify({title:"Synthetic attached task",dueAt:"2026-10-05",tagIds:["project"]}));form.append("file",new File(["Synthetic task instructions."],"task.txt",{type:"text/plain"}));form.append("requestId",requestId);return fetch(base+"/planner",{method:"POST",headers:{cookie:"monarch.view=test-one"},body:form});};
  response=await createAttachedTask();assert.equal(response.status,201);const created=(await response.json()).issue;
  response=await createAttachedTask();assert.equal(response.status,201);assert.equal((await response.json()).issue.id,created.id);
  response=await request(`/artifacts/${created.artifactId}`);assert.equal(response.status,200);assert.equal((await response.json()).artifact.bodyText,"Synthetic task instructions.");
  console.log("PASS: multipart task creation imports a readable source and repeated submission returns the same task");
  const meta=await (await request("/task-meta")).json();
  assert.ok(meta.artifacts.some((item:{id:string;title:string})=>item.id===created.artifactId&&item.title==="task.txt"));
  assert.ok(meta.assignments.every((item:{id:string;title:string})=>typeof item.id==="string"&&typeof item.title==="string"));
  console.log("PASS: task picker returns saved artifact and assignment records with stable IDs");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
