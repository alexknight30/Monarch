"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChatHistoryPane,
  HistoryButton,
} from "@/components/chat-history-pane";
import { AIChatInput } from "@/components/ui/ai-chat-input";
import { MermaidDiagram } from "@/components/ui/mermaid-diagram";
import { ShiningText } from "@/components/ui/shining-text";
import { ThinkingMark } from "@/components/ui/thinking-mark";
import {
  createThreadId,
  getChatThread,
  listChatThreads,
  renameChatThread,
  saveChatThread,
  setActiveChatId,
  titleFromMessages,
  type ChatThread,
  type ChatTurn,
} from "@/lib/chat-history";
import { getSkillByCommand, type Skill } from "@/lib/skills";
import { useViewDataset } from "@/components/view-provider";

const FOLLOW_UP_PLACEHOLDERS = ["Ask a follow-up…"];

/** Highlight a leading `/skill` chip in user messages. */
function renderUserMessage(text: string) {
  const match = /^(\/[a-z][a-z0-9_-]*)(\s+.*)?$/i.exec(text.trim());
  if (!match) return text;
  return (
    <>
      <span className="rounded-full bg-blue-600/10 px-2 py-0.5 font-mono text-[13px] text-blue-700 outline outline-blue-600/40">
        {match[1]}
      </span>
      {match[2] ? <span>{match[2]}</span> : null}
    </>
  );
}

/** Turn `**bold**` / `*italic*` markers into styled text and strip the asterisks. */
function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    const bold = /^\*\*([^*]+)\*\*$/.exec(part);
    if (bold) {
      return (
        <strong key={i} className="font-semibold">
          {bold[1]}
        </strong>
      );
    }
    const italic = /^\*([^*]+)\*$/.exec(part);
    if (italic) {
      return (
        <em key={i} className="italic">
          {italic[1]}
        </em>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

/** Render markdown lines, mermaid fences, and `- item` bullet lists. */
function renderMessageContent(text: string) {
  const lines = text.split("\n");
  const elements: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const fence = /^```(\w*)\s*$/.exec(lines[i]);
    if (fence) {
      const lang = fence[1].toLowerCase();
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        body.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      const code = body.join("\n");
      if (lang === "mermaid") {
        elements.push(
          <MermaidDiagram key={`mmd-${elements.length}`} chart={code} />,
        );
      } else {
        elements.push(
          <pre
            key={`code-${elements.length}`}
            className="my-2 overflow-x-auto rounded-lg bg-[#F7F7F5] px-3 py-2 text-[13px] leading-5 text-[#0A0A0A]"
          >
            {code}
          </pre>,
        );
      }
      continue;
    }

    if (/^\s*-\s+/.test(lines[i])) {
      const items: string[] = [];
      while (i < lines.length) {
        const match = /^\s*-\s+(.*)$/.exec(lines[i]);
        if (!match) break;
        items.push(match[1]);
        i += 1;
      }
      elements.push(
        <ul
          key={`ul-${elements.length}`}
          className="my-1 list-disc space-y-1 pl-5 marker:text-[#0A0A0A]"
        >
          {items.map((item, j) => (
            <li key={j} className="pl-0.5 leading-[25px]">
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    const chunk: string[] = [];
    while (
      i < lines.length &&
      !/^\s*-\s+/.test(lines[i]) &&
      !/^```/.test(lines[i])
    ) {
      chunk.push(lines[i]);
      i += 1;
    }
    const chunkText = chunk.join("\n");
    if (chunkText.length > 0) {
      elements.push(
        <span
          key={`text-${elements.length}`}
          className="whitespace-pre-wrap"
        >
          {renderInlineMarkdown(chunkText)}
        </span>,
      );
    }
  }

  return <div className="flex flex-col">{elements}</div>;
}

function LumisMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 100 100" className="shrink-0">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.5 0H89.5C95.299 0 100 4.701 100 10.5V89.5C100 95.299 95.299 100 89.5 100H10.5C4.701 100 0 95.299 0 89.5V10.5C0 4.701 4.701 0 10.5 0ZM24 46V79.5C24 80.881 25.119 82 26.5 82H73.5C74.881 82 76 80.881 76 79.5V46C76 31.641 64.359 20 50 20C35.641 20 24 31.641 24 46Z"
        fill="#1F1E1C"
      />
    </svg>
  );
}

function ChatScreen() {
  const { user } = useViewDataset();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get("q")?.trim() ?? "";
  const initialSkillCommand = searchParams.get("skill")?.trim() ?? "";
  const threadParam = searchParams.get("id")?.trim() ?? "";

  const [threadId, setThreadId] = useState<string | null>(null);
  const [threadTitle, setThreadTitle] = useState("New chat");
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [threads, setThreads] = useState<ChatThread[]>([]);

  const endRef = useRef<HTMLDivElement>(null);
  const threadScrollRef = useRef<HTMLDivElement>(null);
  // Guards against the initial prompt firing twice under React Strict Mode.
  const sentInitial = useRef(false);
  /** Locally selected thread — wins over a stale ?id= while the router catches up. */
  const activeThreadRef = useRef<string | null>(null);
  /** In-flight model title requests for this session. */
  const titleRequestIds = useRef(new Set<string>());
  const titleGeneratedRef = useRef(false);

  const refreshThreads = useCallback(() => {
    setThreads(listChatThreads());
  }, []);

  // Cold-load a thread from ?id=. Skip when we already navigated here locally.
  useEffect(() => {
    // New chat: ignore a stale ?id= until the URL has cleared.
    if (activeThreadRef.current === "__new__") {
      if (!threadParam) activeThreadRef.current = null;
      return;
    }

    if (!threadParam) return;

    if (activeThreadRef.current === threadParam) {
      sentInitial.current = true;
      return;
    }

    // Local navigation in progress; URL is still on the previous thread.
    if (activeThreadRef.current && activeThreadRef.current !== threadParam) {
      return;
    }

    const existing = getChatThread(threadParam);
    if (!existing) return;

    sentInitial.current = true;
    activeThreadRef.current = existing.id;
    titleGeneratedRef.current = Boolean(existing.titleGenerated);
    setThreadId(existing.id);
    setThreadTitle(existing.title);
    setMessages(existing.messages);
    setError(null);
  }, [threadParam]);

  // Persist the active thread whenever messages / title change.
  useEffect(() => {
    if (!threadId || messages.length === 0) return;

    const previous = getChatThread(threadId);
    saveChatThread({
      id: threadId,
      title: threadTitle,
      messages,
      updatedAt: Date.now(),
      titleGenerated:
        titleGeneratedRef.current || Boolean(previous?.titleGenerated),
    });
    setActiveChatId(threadId);
    refreshThreads();
  }, [threadId, threadTitle, messages, refreshThreads]);

  // Keep resume pointer in sync when opening an existing thread from ?id=.
  useEffect(() => {
    if (threadId) setActiveChatId(threadId);
  }, [threadId]);

  useEffect(() => {
    refreshThreads();
  }, [refreshThreads]);

  const generateTitle = useCallback(
    async (id: string, userMessage: string, reply: string) => {
      if (titleGeneratedRef.current || titleRequestIds.current.has(id)) return;
      titleRequestIds.current.add(id);

      try {
        const res = await fetch("/api/chat/title", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: userMessage, reply }),
        });
        const data = (await res.json()) as { title?: string };
        if (!res.ok || !data.title) {
          titleRequestIds.current.delete(id);
          return;
        }

        titleGeneratedRef.current = true;
        setThreadTitle(data.title);
        renameChatThread(id, data.title);
        refreshThreads();
      } catch {
        titleRequestIds.current.delete(id);
        // Keep the provisional title if naming fails.
      }
    },
    [refreshThreads],
  );

  const send = useCallback(
    async (
      text: string,
      history: ChatTurn[],
      existingId: string | null,
      skill?: Skill | null,
    ) => {
      const displayText = skill
        ? text
          ? `/${skill.command} ${text}`
          : `/${skill.command}`
        : text;

      const nextMessages: ChatTurn[] = [
        ...history,
        { role: "user", content: displayText },
      ];

      const id = existingId ?? createThreadId();
      const isNewThread = !existingId;
      if (isNewThread) {
        titleGeneratedRef.current = false;
        activeThreadRef.current = id;
        setThreadId(id);
        setThreadTitle(titleFromMessages(nextMessages));
        router.replace(`/chat?id=${encodeURIComponent(id)}`);
      }

      setMessages(nextMessages);
      setError(null);
      setIsLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: displayText,
            messages: nextMessages,
            skill: skill
              ? {
                  command: skill.command,
                  prompt: skill.prompt,
                }
              : undefined,
          }),
        });

        const data = (await res.json()) as {
          message?: ChatTurn;
          actions?: ChatTurn["actions"];
          error?: string;
        };

        if (!res.ok) throw new Error(data.error || "Chat request failed.");
        if (!data.message?.content) throw new Error("Empty response from model.");

        const reply = data.message.content;
        const actions = data.actions?.length ? data.actions : undefined;
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: reply, ...(actions ? { actions } : {}) },
        ]);

        if (!titleGeneratedRef.current) {
          void generateTitle(id, displayText, reply);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setIsLoading(false);
      }
    },
    [router, generateTitle],
  );

  // Fire the prompt carried over from the home composer.
  useEffect(() => {
    if (sentInitial.current || threadParam) return;
    if (!initialPrompt && !initialSkillCommand) return;
    sentInitial.current = true;
    const skill = initialSkillCommand
      ? getSkillByCommand(initialSkillCommand)
      : null;
    void send(initialPrompt, [], null, skill);
  }, [initialPrompt, initialSkillCommand, threadParam, send]);

  // Backfill model titles for threads that still use the raw prompt.
  useEffect(() => {
    if (!threadId || titleGeneratedRef.current || isLoading) return;
    const firstUser = messages.find((m) => m.role === "user")?.content;
    const firstAssistant = messages.find((m) => m.role === "assistant")?.content;
    if (!firstUser || !firstAssistant) return;
    void generateTitle(threadId, firstUser, firstAssistant);
  }, [threadId, messages, isLoading, generateTitle]);

  // Scroll inside the thread pane only — never the page (that crops the composer).
  useEffect(() => {
    const pane = threadScrollRef.current;
    if (!pane) return;
    pane.scrollTo({ top: pane.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const openThread = (id: string) => {
    const existing = getChatThread(id);
    if (!existing) return;

    sentInitial.current = true;
    activeThreadRef.current = existing.id;
    titleGeneratedRef.current = Boolean(existing.titleGenerated);
    setThreadId(existing.id);
    setThreadTitle(existing.title);
    setMessages(existing.messages);
    setError(null);
    setHistoryOpen(false);
    setActiveChatId(existing.id);
    router.replace(`/chat?id=${encodeURIComponent(id)}`);
  };

  const startNewChat = () => {
    sentInitial.current = true;
    // Sentinel so a stale ?id= can't reload the previous thread mid-navigation.
    activeThreadRef.current = "__new__";
    titleGeneratedRef.current = false;
    titleRequestIds.current.clear();
    setThreadId(null);
    setThreadTitle("New chat");
    setMessages([]);
    setError(null);
    setIsLoading(false);
    setHistoryOpen(false);
    setActiveChatId(null);
    router.replace("/chat");
  };

  const lastAssistantIndex = messages.reduce(
    (acc, msg, i) => (msg.role === "assistant" ? i : acc),
    -1,
  );

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden bg-white">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#F0F0F0] px-[22px]">
          <div className="flex min-w-0 items-center gap-[7px]">
            <span className="truncate text-[13px] leading-4 font-medium text-[#1A1A1A]">
              {threadTitle}
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" className="shrink-0">
              <path
                d="M6 9.5l6 6 6-6"
                fill="none"
                stroke="#A0A0A0"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {!historyOpen && (
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={startNewChat}
                className="flex h-[30px] items-center gap-1.5 rounded-md border border-[#E6E6E6] px-3 text-xs leading-4 font-medium text-[#3D3D3D] transition-colors hover:bg-[#FAFAFA]"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" className="shrink-0">
                  <path
                    d="M12 5v14M5 12h14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                  />
                </svg>
                New chat
              </button>
              <HistoryButton
                onClick={() => {
                  refreshThreads();
                  setHistoryOpen(true);
                }}
              />
            </div>
          )}
        </div>

        {/* Thread — only this region scrolls; composer stays pinned. */}
        <div
          ref={threadScrollRef}
          className="min-h-0 flex-1 overflow-y-auto"
        >
          {messages.length === 0 && !isLoading && !error ? (
            <div className="flex h-full items-center justify-center px-6">
              <div className="flex items-baseline gap-3">
                <h1 className="font-display text-[40px] leading-[48px] tracking-[-0.015em] text-[#0A0A0A]">
                  Good afternoon,
                </h1>
                <span className="font-display text-[40px] leading-[48px] tracking-[-0.015em] text-[#A0A0A0]">
                  {user.firstName}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center px-6 pt-10 pb-8">
              <div className="flex w-full max-w-[732px] flex-col gap-[34px]">
                {messages.map((msg, i) =>
                  msg.role === "user" ? (
                    <div key={i} className="flex justify-end">
                      <div className="max-w-[520px] rounded-2xl bg-[#F5F5F5] px-4 py-[11px]">
                        <p className="text-[15px] leading-[23px] whitespace-pre-wrap text-[#0A0A0A]">
                          {renderUserMessage(msg.content)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div key={i} className="flex flex-col items-start gap-3.5">
                      {msg.actions?.length ? (
                        <div className="flex flex-wrap gap-1.5">
                          {msg.actions.map((action, j) => (
                            <span
                              key={`${action.tool}-${action.key ?? j}`}
                              className="rounded-full bg-[#F1F1EF] px-2.5 py-1 text-[12px] leading-4 text-[#5E5E5E]"
                            >
                              {action.summary}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <div className="max-w-[640px] text-[15px] leading-[25px] text-[#0A0A0A]">
                        {renderMessageContent(msg.content)}
                      </div>
                      {!isLoading && i === lastAssistantIndex && <LumisMark />}
                    </div>
                  ),
                )}

                {isLoading && (
                  <div className="flex items-center gap-2.5">
                    <ThinkingMark />
                    <ShiningText text="Thinking…" />
                  </div>
                )}

                {error && (
                  <p className="text-[15px] leading-[25px] text-[#B42318]">
                    {error}
                  </p>
                )}

                <div ref={endRef} />
              </div>
            </div>
          )}
        </div>

        {/* Composer dock */}
        <div className="shrink-0 px-6 pt-2 pb-[26px]">
          <div className="mx-auto w-full max-w-[732px]">
            <AIChatInput
              autoFocus
              disabled={isLoading}
              staticPlaceholder
              placeholders={FOLLOW_UP_PLACEHOLDERS}
              onSubmit={(value, meta) =>
                void send(value, messages, threadId, meta?.skill ?? null)
              }
            />
          </div>
        </div>
      </div>

      {historyOpen && (
        <ChatHistoryPane
          threads={threads}
          activeId={threadId}
          onSelect={openThread}
          onClose={() => setHistoryOpen(false)}
          onNewChat={startNewChat}
        />
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={<div className="h-full min-h-0 flex-1 bg-white" />}
    >
      <ChatScreen />
    </Suspense>
  );
}
