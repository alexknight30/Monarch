import type { ChatAttachmentMeta } from "@/lib/chat-attachments";
import { readViewIdFromDocument } from "@/lib/views";

export type ChatTurnAction = {
  tool: string;
  summary: string;
  key?: string;
};

/**
 * A diagram from this turn that's been promoted to an artifact.
 * `blockIndex` is the position of the ```diagram fence within the message.
 */
export type SavedDiagram = {
  blockIndex: number;
  slug: string;
};

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
  /** Planner mutations the model ran for this assistant turn. */
  actions?: ChatTurnAction[];
  /** Keeps the save button idempotent across reloads. */
  savedDiagrams?: SavedDiagram[];
  /** File metadata and view-scoped IDs for retrieving persisted attachment bytes. */
  attachments?: ChatAttachmentMeta[];
};

export type ChatThread = {
  id: string;
  title: string;
  messages: ChatTurn[];
  updatedAt: number;
  /** True once the model has named this thread (vs a provisional first-prompt title). */
  titleGenerated?: boolean;
  /** Course this thread was started from, when opened from a course page. */
  courseSlug?: string;
  courseCode?: string;
  courseTitle?: string;
};

/**
 * Threads are scoped to the active admin view, so switching views gives you
 * that persona's history rather than a shared pile.
 */
function storageKey() {
  return `monarch.chat.threads.${readViewIdFromDocument()}`;
}

function activeChatKey() {
  return `monarch.chat.active.${readViewIdFromDocument()}`;
}

function canUseStorage() {
  return typeof window !== "undefined";
}
const memoryCache=new Map<string,ChatThread[]>();
const EMPTY_THREADS:ChatThread[]=[];
const pending=new Map<string,{viewId:string;thread:ChatThread}>();
let syncTimer:ReturnType<typeof setTimeout>|undefined;
let syncing:Promise<void>|null=null;
export const CHAT_SYNC_EVENT="monarch:chat-sync";
export const CHAT_HISTORY_EVENT="monarch:chat-history";
export const CHAT_LIST_EVENT="monarch:chat-list";
function announce(status:string){if(typeof window!=="undefined")window.dispatchEvent(new CustomEvent(CHAT_SYNC_EVENT,{detail:status}));}
function writeCache(key:string,threads:ChatThread[]){
  memoryCache.set(key,threads);
  try{window.localStorage.setItem(key,JSON.stringify(threads));}catch{announce("Browser draft storage is full. Keep this page open until saved to disk.");}
  window.dispatchEvent(new Event(CHAT_LIST_EVENT));
}
export function flushChatHistory():Promise<void>{
  if(syncTimer){clearTimeout(syncTimer);syncTimer=undefined;}
  if(syncing)return syncing;
  syncing=(async()=>{
    while(pending.size){
      const [key,entry]=pending.entries().next().value!;
      pending.delete(key);
      try{
        const response=await fetch(`/api/${entry.viewId}/chats`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(entry.thread)});
        if(!response.ok){const data=await response.json();throw new Error(data.error||"Conversation could not be saved to disk.");}
      }catch(cause){if(!pending.has(key))pending.set(key,entry);announce(cause instanceof Error?cause.message:"Conversation is only saved in this browser. Reconnect to sync.");return;}
    }
    announce("Saved to disk");
  })().finally(()=>{syncing=null;});
  return syncing;
}
function queueDiskSave(viewId:string,thread:ChatThread){pending.set(viewId+":"+thread.id,{viewId,thread});announce("Saving conversation…");if(syncTimer)clearTimeout(syncTimer);syncTimer=setTimeout(()=>void flushChatHistory(),500);}
/** Merge disk history with newer browser drafts, then migrate unsynced local conversations. */
export async function hydrateChatHistory(){
  if(typeof window==="undefined")return;
  const viewId=readViewIdFromDocument();const key=`monarch.chat.threads.${viewId}`;
  try{
    const response=await fetch(`/api/${viewId}/chats`);const data=await response.json();if(!response.ok)throw new Error(data.error||"Could not load saved conversations.");
    if(readViewIdFromDocument()!==viewId)return;
    const local=listChatThreads();const remote=(data.threads||[]) as ChatThread[];
    const merged=new Map(remote.map(thread=>[thread.id,thread]));
    for(const thread of local){const saved=merged.get(thread.id);if(!saved||thread.updatedAt>saved.updatedAt){merged.set(thread.id,thread);queueDiskSave(viewId,thread);}}
    writeCache(key,[...merged.values()].sort((a,b)=>b.updatedAt-a.updatedAt));
    window.dispatchEvent(new Event(CHAT_HISTORY_EVENT));
    if(!pending.size)announce("Saved to disk");
  }catch(cause){announce(cause instanceof Error?cause.message:"Disk history is unavailable; using browser drafts.");}
}

/** Last open chat for this view — used to resume when returning Home. */
export function getActiveChatId(): string | null {
  if (!canUseStorage()) return null;
  try {
    const id = window.localStorage.getItem(activeChatKey());
    return id?.trim() || null;
  } catch {
    return null;
  }
}

export function setActiveChatId(id: string | null): void {
  if (!canUseStorage()) return;
  try {
  if (!id) {
    window.localStorage.removeItem(activeChatKey());
    window.dispatchEvent(new Event(CHAT_LIST_EVENT));
    return;
  }
  window.localStorage.setItem(activeChatKey(), id);
  window.dispatchEvent(new Event(CHAT_LIST_EVENT));
  } catch { /* Conversation content is independently saved to disk. */ }
}

export function listChatThreads(): ChatThread[] {
  if (!canUseStorage()) return EMPTY_THREADS;
  const cached=memoryCache.get(storageKey());if(cached)return cached;
  try {
    const raw = window.localStorage.getItem(storageKey());
    if (!raw) {memoryCache.set(storageKey(),EMPTY_THREADS);return EMPTY_THREADS;}
    const parsed = JSON.parse(raw) as ChatThread[];
    if (!Array.isArray(parsed)) return EMPTY_THREADS;
    const threads=parsed
      .filter(
        (t) =>
          t &&
          typeof t.id === "string" &&
          typeof t.title === "string" &&
          Array.isArray(t.messages),
      )
      .sort((a, b) => b.updatedAt - a.updatedAt);
    memoryCache.set(storageKey(),threads);
    return threads;
  } catch {
    return EMPTY_THREADS;
  }
}

export function getChatThread(id: string): ChatThread | null {
  return listChatThreads().find((t) => t.id === id) ?? null;
}

export function saveChatThread(thread: ChatThread): void {
  if (!canUseStorage()) return;
  const others = listChatThreads().filter((t) => t.id !== thread.id);
  const next = [thread, ...others].sort((a, b) => b.updatedAt - a.updatedAt);
  writeCache(storageKey(),next);
  queueDiskSave(readViewIdFromDocument(),thread);
}

/** Persist a model-generated title for a thread. */
export function renameChatThread(id: string, title: string): void {
  const existing = getChatThread(id);
  if (!existing) return;
  saveChatThread({
    ...existing,
    title: title.trim() || existing.title,
    titleGenerated: true,
    updatedAt: Date.now(),
  });
}

export function createThreadId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `thread_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function titleFromMessages(messages: ChatTurn[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  const text = firstUser?.content?.trim();
  if (text) return text.length > 60 ? `${text.slice(0, 57)}…` : text;
  const fileName = firstUser?.attachments?.[0]?.name?.trim();
  if (fileName) return fileName;
  return "New chat";
}

export function snippetFromMessages(messages: ChatTurn[]): string {
  const last = [...messages].reverse().find((m) => m.content.trim());
  if (!last) return "No messages yet";
  const text = last.content.trim().replace(/\s+/g, " ");
  return text.length > 80 ? `${text.slice(0, 77)}…` : text;
}

export function formatThreadWhen(updatedAt: number): string {
  const diff = Date.now() - updatedAt;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "Just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;

  return new Date(updatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
