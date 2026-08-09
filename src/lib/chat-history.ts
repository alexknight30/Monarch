export type ChatTurnAction = {
  tool: string;
  summary: string;
  key?: string;
};

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
  /** Planner mutations the model ran for this assistant turn. */
  actions?: ChatTurnAction[];
};

export type ChatThread = {
  id: string;
  title: string;
  messages: ChatTurn[];
  updatedAt: number;
  /** True once the model has named this thread (vs a provisional first-prompt title). */
  titleGenerated?: boolean;
};

import { readViewIdFromDocument } from "@/lib/views";

/**
 * Threads are scoped to the active admin view, so switching views gives you
 * that persona's history rather than a shared pile.
 */
function storageKey() {
  return `lumis.chat.threads.${readViewIdFromDocument()}`;
}

function activeChatKey() {
  return `lumis.chat.active.${readViewIdFromDocument()}`;
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
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
  if (!id) {
    window.localStorage.removeItem(activeChatKey());
    return;
  }
  window.localStorage.setItem(activeChatKey(), id);
}

export function listChatThreads(): ChatThread[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(storageKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatThread[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (t) =>
          t &&
          typeof t.id === "string" &&
          typeof t.title === "string" &&
          Array.isArray(t.messages),
      )
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export function getChatThread(id: string): ChatThread | null {
  return listChatThreads().find((t) => t.id === id) ?? null;
}

export function saveChatThread(thread: ChatThread): void {
  if (!canUseStorage()) return;
  const others = listChatThreads().filter((t) => t.id !== thread.id);
  const next = [thread, ...others].sort((a, b) => b.updatedAt - a.updatedAt);
  window.localStorage.setItem(storageKey(), JSON.stringify(next));
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
  const firstUser = messages.find((m) => m.role === "user")?.content?.trim();
  if (!firstUser) return "New chat";
  return firstUser.length > 60 ? `${firstUser.slice(0, 57)}…` : firstUser;
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
