import assert from "node:assert/strict";

async function main(){
  const storage=new Map<string,string>();
  const events=new EventTarget();
  Object.assign(globalThis,{window:{localStorage:{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value),removeItem:(key:string)=>storage.delete(key)},dispatchEvent:events.dispatchEvent.bind(events)},document:{cookie:"monarch.view=test-one"}});
  const disk=new Map<string,unknown>();
  globalThis.fetch=(async(_url:unknown,init?:RequestInit)=>{
    if(init?.method==="POST") {const thread=JSON.parse(String(init.body));disk.set(thread.id,thread);return Response.json({thread});}
    return Response.json({threads:[...disk.values()]});
  }) as typeof fetch;
  const history=await import("../src/lib/chat-history");
  let updates=0;events.addEventListener(history.CHAT_LIST_EVENT,()=>updates++);
  assert.equal(history.listChatThreads(),history.listChatThreads(),"Unchanged snapshots must be stable for React external-store subscriptions");
  const thread={id:"synthetic-thread",title:"Synthetic chat",updatedAt:1,messages:[{role:"user" as const,content:"Question"}]};
  history.saveChatThread(thread);
  assert.equal(updates,1);assert.equal(history.listChatThreads(),history.listChatThreads());
  history.setActiveChatId(thread.id);assert.equal(history.getActiveChatId(),thread.id);assert.equal(updates,2);
  await history.flushChatHistory();assert.deepEqual(disk.get(thread.id),thread);
  await history.hydrateChatHistory();assert.equal(history.getChatThread(thread.id)?.title,"Synthetic chat");
  history.renameChatThread(thread.id,"Renamed");await history.flushChatHistory();assert.equal((disk.get(thread.id) as {title:string}).title,"Renamed");
  history.setActiveChatId(null);assert.equal(history.getActiveChatId(),null);
  console.log("PASS: chat-list snapshots are stable; save, rename, hydration and active-chat changes notify subscribers; disk copies preserve the thread");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
