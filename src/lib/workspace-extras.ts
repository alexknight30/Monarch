import { readViewStore } from "./local-db";
import { withWorkspaceTransaction, writeWorkspaceCollections } from "./workspace-store";
import { PROFILE_FIELDS, type StudentProfile } from "./profile";
import type { ChatThread } from "./chat-history";
import type { ViewId } from "./views";
export async function saveProfile(viewId:ViewId,patch:Record<string,unknown>) {
  const seed=await readViewStore(viewId);
  return withWorkspaceTransaction(viewId,seed,async()=>{
    const store=await readViewStore(viewId);const profile:StudentProfile={...store.profile};
    for(const key of PROFILE_FIELDS) if(patch[key]!==undefined) {if(typeof patch[key]!=="string"||patch[key].length>500)throw new Error("Profile fields must contain up to 500 characters.");profile[key]=patch[key].trim();}
    await writeWorkspaceCollections(viewId,seed,{profile});return profile;
  });
}
export async function saveStoredChat(viewId:ViewId,value:unknown) {
  if(!value||typeof value!=="object")throw new Error("Invalid conversation.");
  const thread=value as ChatThread;
  if(typeof thread.id!=="string"||!thread.id||thread.id.length>100||typeof thread.title!=="string"||thread.title.length>500||!Number.isFinite(thread.updatedAt)||!Array.isArray(thread.messages)||thread.messages.length>4000)throw new Error("Invalid conversation.");
  if(thread.messages.some(t=>!t||!["user","assistant"].includes(t.role)||typeof t.content!=="string"))throw new Error("Invalid conversation messages.");
  if(JSON.stringify(thread).length>10_000_000)throw new Error("This conversation is too large to save. Start another conversation.");
  const seed=await readViewStore(viewId);
  return withWorkspaceTransaction(viewId,seed,async()=>{
    const store=await readViewStore(viewId);const existing=store.chats.find(t=>t.id===thread.id);
    if(existing&&existing.updatedAt>thread.updatedAt)return existing;
    await writeWorkspaceCollections(viewId,seed,{chats:[thread,...store.chats.filter(t=>t.id!==thread.id)]});return thread;
  });
}
