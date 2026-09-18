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
import { Button } from "@/components/ui/button";
import { StudyInline } from "@/components/ui/study-inline";
import { AIChatInput } from "@/components/ui/ai-chat-input";
import { ChatAttachmentChips } from "@/components/ui/chat-attachment-chips";
import { PlusSignIcon } from "@/components/ui/plus-sign";
import { DiagramCard } from "@/components/ui/diagram-card";
import { MermaidDiagram } from "@/components/ui/mermaid-diagram";
import { ShiningText } from "@/components/ui/shining-text";
import { ThinkingMark } from "@/components/ui/thinking-mark";
import {
  createThreadId,
  hydrateChatHistory,
  flushChatHistory,
  CHAT_SYNC_EVENT,
  CHAT_HISTORY_EVENT,
  getChatThread,
  renameChatThread,
  saveChatThread,
  setActiveChatId,
  titleFromMessages,
  type ChatTurn,
  type SavedDiagram,
} from "@/lib/chat-history";
import {
  parseDiagramBlock,
  replaceDiagramBlock,
  type DiagramDetail,
  type DiagramSpec,
} from "@/lib/diagram";
import {
  buildChatRequest,
  contentForApi,
  metaFromFile,
} from "@/lib/chat-attachments";
import { consumeChatSse } from "@/lib/chat-sse";
import { takePendingChat } from "@/lib/pending-chat";
import { getSkillByCommand, type Skill } from "@/lib/skills";
import {
  completeBlockCount,
  splitContentBlocks,
  StreamingBlocks,
} from "@/components/ui/streaming-blocks";
import { useViewDataset, useViewId } from "@/components/view-provider";
import { reportCopy } from "@/lib/integrity";
import { useChatThreads } from "@/lib/use-chat-threads";

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

function renderInlineMarkdown(text: string) {
  return <StudyInline text={text}/>;
}

/**
 * Diagram wiring for an assistant turn. Passed down so the card can report
 * intent without knowing about routes or thread storage.
 */
type DiagramHandlers = {
  savedDiagrams?: SavedDiagram[];
  onSave?: (blockIndex: number, spec: DiagramSpec) => Promise<void>;
  onChangeDetail?: (
    blockIndex: number,
    spec: DiagramSpec,
    detail: DiagramDetail,
  ) => Promise<void>;
};

/** Prose stays at reading width; diagrams get the full thread column. */
const PROSE = "max-w-[640px]";

/** Render markdown lines, diagram/mermaid fences, and `- item` bullet lists. */
function renderMessageContent(text: string, handlers?: DiagramHandlers) {
  const lines = text.split("\n");
  const elements: ReactNode[] = [];
  // Counts ```diagram fences in document order — must stay in step with
  // replaceDiagramBlock in lib/diagram.ts, which scans the same way.
  let diagramIndex = 0;
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

      if (lang === "diagram") {
        const blockIndex = diagramIndex;
        diagramIndex += 1;
        const spec = parseDiagramBlock(code);
        if (spec) {
          const saved = handlers?.savedDiagrams?.find(
            (d) => d.blockIndex === blockIndex,
          );
          const onSave = handlers?.onSave;
          const onChangeDetail = handlers?.onChangeDetail;
          elements.push(
            <DiagramCard
              key={`dgm-${elements.length}`}
              spec={spec}
              savedSlug={saved?.slug ?? null}
              onSave={onSave ? () => onSave(blockIndex, spec) : undefined}
              onChangeDetail={
                onChangeDetail
                  ? (detail) => onChangeDetail(blockIndex, spec, detail)
                  : undefined
              }
            />,
          );
          continue;
        }
        // Unparseable spec — fall through and show the raw block.
      }

      if (lang === "mermaid") {
        elements.push(
          <MermaidDiagram key={`mmd-${elements.length}`} chart={code} />,
        );
      } else {
        elements.push(
          <pre
            key={`code-${elements.length}`}
            className={`my-2 overflow-x-auto rounded-lg bg-[#F7F7F5] px-3 py-2 text-[13px] leading-5 text-[#0A0A0A] ${PROSE}`}
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
          className={`my-1 list-disc space-y-1 pl-5 marker:text-[#0A0A0A] ${PROSE}`}
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
          className={`whitespace-pre-wrap ${PROSE}`}
        >
          {renderInlineMarkdown(chunkText)}
        </span>,
      );
    }
  }

  return <div className="flex w-full flex-col">{elements}</div>;
}

function handlersForBlock(
  handlers: DiagramHandlers | undefined,
  priorBlocks: string[],
): DiagramHandlers | undefined {
  if (!handlers) return undefined;
  const offset = priorBlocks.reduce(
    (count, block) =>
      count + (block.match(/^```diagram\s*$/m) ? 1 : 0),
    0,
  );
  return {
    savedDiagrams: handlers.savedDiagrams
      ?.filter((diagram) => diagram.blockIndex >= offset)
      .map((diagram) => ({
        ...diagram,
        blockIndex: diagram.blockIndex - offset,
      })),
    onSave: handlers.onSave
      ? (blockIndex, spec) => handlers.onSave!(blockIndex + offset, spec)
      : undefined,
    onChangeDetail: handlers.onChangeDetail
      ? (blockIndex, spec, detail) =>
          handlers.onChangeDetail!(blockIndex + offset, spec, detail)
      : undefined,
  };
}

function MonarchMark() {
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
  const viewId = useViewId();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get("q")?.trim() ?? "";
  const initialSkillCommand = searchParams.get("skill")?.trim() ?? "";
  const threadParam = searchParams.get("id")?.trim() ?? "";
  const courseSlugParam = searchParams.get("course")?.trim() ?? "";
  const courseCodeParam = searchParams.get("code")?.trim() ?? "";
  const courseTitleParam = searchParams.get("title")?.trim() ?? "";

  const [threadId, setThreadId] = useState<string | null>(null);
  const [threadTitle, setThreadTitle] = useState("New chat");
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus,setSyncStatus]=useState("");
  const [composerVersion, setComposerVersion] = useState(0);
  const requestRef=useRef<AbortController|null>(null);
  const lastRequest=useRef<{text:string;history:ChatTurn[];id:string;skill?:Skill|null;files?:File[];modes?:{study?:boolean;research?:boolean}} | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const threads=useChatThreads();
  const [course, setCourse] = useState<{
    slug: string;
    code: string;
    title: string;
  } | null>(() =>
    courseSlugParam
      ? {
          slug: courseSlugParam,
          code: courseCodeParam || courseSlugParam,
          title: courseTitleParam,
        }
      : null,
  );

  const endRef = useRef<HTMLDivElement>(null);
  const threadScrollRef = useRef<HTMLDivElement>(null);
  // Guards against the initial prompt firing twice under React Strict Mode.
  const sentInitial = useRef(false);
  /** Locally selected thread — wins over a stale ?id= while the router catches up. */
  const activeThreadRef = useRef<string | null>(null);
  /** In-flight model title requests for this session. */
  const titleRequestIds = useRef(new Set<string>());
  const titleGeneratedRef = useRef(false);

  useEffect(()=>{
    const status=(event:Event)=>setSyncStatus((event as CustomEvent<string>).detail);
    const updated=()=>{
      if(!threadParam||requestRef.current||(activeThreadRef.current&&activeThreadRef.current!==threadParam))return;
      const saved=getChatThread(threadParam);if(!saved)return;
      activeThreadRef.current=saved.id;sentInitial.current=true;titleGeneratedRef.current=!!saved.titleGenerated;
      setThreadId(saved.id);setThreadTitle(saved.title);setMessages(saved.messages);
      setCourse(saved.courseSlug?{slug:saved.courseSlug,code:saved.courseCode||saved.courseSlug,title:saved.courseTitle||""}:null);
    };
    window.addEventListener(CHAT_SYNC_EVENT,status);window.addEventListener(CHAT_HISTORY_EVENT,updated);
    void hydrateChatHistory();
    return ()=>{window.removeEventListener(CHAT_SYNC_EVENT,status);window.removeEventListener(CHAT_HISTORY_EVENT,updated);};
  },[threadParam]);
  useEffect(()=>()=>{requestRef.current?.abort();void flushChatHistory();},[]);

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
    // Hydrate an external browser-storage record once for this URL, after SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThreadId(existing.id);
    setThreadTitle(existing.title);
    setMessages(existing.messages);
    setError(null);
    setCourse(
      existing.courseSlug
        ? {
            slug: existing.courseSlug,
            code: existing.courseCode || existing.courseSlug,
            title: existing.courseTitle || "",
          }
        : null,
    );
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
      ...(course
        ? {
            courseSlug: course.slug,
            courseCode: course.code,
            courseTitle: course.title,
          }
        : {}),
    });
    setActiveChatId(threadId);
  }, [threadId, threadTitle, messages, course]);

  // Keep resume pointer in sync when opening an existing thread from ?id=.
  useEffect(() => {
    if (threadId) setActiveChatId(threadId);
  }, [threadId]);

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

        renameChatThread(id, data.title);
        if(activeThreadRef.current!==id)return;
        titleGeneratedRef.current = true;
        setThreadTitle(data.title);
      } catch {
        titleRequestIds.current.delete(id);
        // Keep the provisional title if naming fails.
      }
    },
    [],
  );

  const send = useCallback(
    async (
      text: string,
      history: ChatTurn[],
      existingId: string | null,
      skill?: Skill | null,
      files?: File[],
      modes?:{study?:boolean;research?:boolean},
    ) => {
      if(requestRef.current)return;
      const controller=new AbortController();requestRef.current=controller;
      const displayText = skill
        ? text
          ? `/${skill.command} ${text}`
          : `/${skill.command}`
        : text;
      const attachments = files?.length ? files.map(metaFromFile) : undefined;

      const nextMessages: ChatTurn[] = [
        ...history,
        {
          role: "user",
          content: displayText,
          ...(attachments ? { attachments } : {}),
        },
      ];

      const id = existingId ?? createThreadId();
      lastRequest.current={text,history,id,skill,files,modes};
      const isNewThread = !existingId;
      if (isNewThread) {
        titleGeneratedRef.current = false;
        activeThreadRef.current = id;
        setThreadId(id);
        setThreadTitle(titleFromMessages(nextMessages));
        const params = new URLSearchParams({ id });
        if (course?.slug) {
          params.set("course", course.slug);
          if (course.code) params.set("code", course.code);
          if (course.title) params.set("title", course.title);
        }
        router.replace(`/chat?${params.toString()}`);
      }

      setMessages(nextMessages);
      setError(null);
      setIsLoading(true);

      try {
        const res = await fetch(
          "/api/chat",
          { ...buildChatRequest(
            {
              message: contentForApi({
                content: displayText,
                attachments,
              }),
              study:modes?.study,
              research:modes?.research,
              messages: nextMessages.map((turn) => ({
                role: turn.role,
                content: contentForApi(turn),
                attachments: turn.attachments,
              })),
              skill: skill
                ? {
                    command: skill.command,
                    prompt: skill.prompt,
                    toolName: skill.toolName,
                  }
                : undefined,
              ...(course?.slug ? { courseSlug: course.slug } : {}),
            },
            files,
          ),signal:controller.signal },
        );

        const contentType = res.headers.get("content-type") ?? "";

        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error || "Chat request failed.");
        }

        if (contentType.includes("text/event-stream")) {
          let assembled = "";
          await consumeChatSse(res, {
            onAttachments: (saved) => {
              if(requestRef.current!==controller||controller.signal.aborted)return;
              setMessages((prev) => {
                const index = prev.findLastIndex((turn) => turn.role === "user");
                return prev.map((turn, i) => i === index ? { ...turn, attachments: saved } : turn);
              });
            },
            onDelta: (text) => {
              if(requestRef.current!==controller||controller.signal.aborted)return;
              assembled += text;
              setMessages((prev) => {
                const last = prev.at(-1);
                if (last?.role === "assistant") {
                  return [...prev.slice(0, -1), { ...last, content: assembled }];
                }
                return [...prev, { role: "assistant", content: assembled }];
              });
            },
            onDone: (meta) => {
              if(requestRef.current!==controller||controller.signal.aborted)return;
              if (meta.plannerChanged) router.refresh();
              if (meta.actions?.length) {
                setMessages((prev) => {
                  const last = prev.at(-1);
                  if (last?.role !== "assistant") return prev;
                  return [...prev.slice(0, -1), { ...last, actions: meta.actions }];
                });
              }
            },
          });
          if(requestRef.current!==controller||controller.signal.aborted)return;
          if (!assembled.trim()) throw new Error("Empty response from model.");
          if (!titleGeneratedRef.current) {
            void generateTitle(
              id,
              contentForApi({ content: displayText, attachments }),
              assembled,
            );
          }
        } else {
          const data = (await res.json()) as {
            message?: ChatTurn;
            actions?: ChatTurn["actions"];
            error?: string;
          };
          if(requestRef.current!==controller||controller.signal.aborted)return;

          if (!data.message?.content) throw new Error("Empty response from model.");

          const reply = data.message.content;
          const actions = data.actions?.length ? data.actions : undefined;
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: reply, ...(actions ? { actions } : {}) },
          ]);

          if (!titleGeneratedRef.current) {
            void generateTitle(
              id,
              contentForApi({ content: displayText, attachments }),
              reply,
            );
          }
        }
      } catch (err) {
        if(requestRef.current===controller)setError(controller.signal.aborted?"Response stopped. Your conversation has been kept.":err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        if(requestRef.current===controller){requestRef.current=null;setIsLoading(false);}
      }
    },
    [router, generateTitle, course],
  );

  // Fire the prompt carried over from the home composer.
  useEffect(() => {
    if (sentInitial.current || threadParam) return;
    // Consume the pending submission only after mount settles. Strict Mode's
    // setup/cleanup replay must not consume it and then abort its request.
    const timer = window.setTimeout(() => {
    if (sentInitial.current) return;
    const pending = takePendingChat();
    if (pending) {
      sentInitial.current = true;
      // This is the user's submitted home-composer request, carried across navigation.
      void send(
        pending.text,
        [],
        null,
        pending.skill ?? null,
        pending.files,
        {study:pending.study,research:pending.research},
      );
      return;
    }
    if (!initialPrompt && !initialSkillCommand) return;
    sentInitial.current = true;
    const skill = initialSkillCommand
      ? getSkillByCommand(initialSkillCommand)
      : null;
    void send(initialPrompt, [], null, skill);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialPrompt, initialSkillCommand, threadParam, send]);

  // Backfill model titles for threads that still use the raw prompt.
  useEffect(() => {
    if (!threadId || titleGeneratedRef.current || isLoading) return;
    const firstUser = messages.find((m) => m.role === "user")?.content;
    const firstAssistant = messages.find((m) => m.role === "assistant")?.content;
    if (!firstUser || !firstAssistant) return;
    // Starts an asynchronous provider request; its in-flight ID guard prevents duplicates.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void generateTitle(threadId, firstUser, firstAssistant);
  }, [threadId, messages, isLoading, generateTitle]);

  // Scroll inside the thread pane only — never the page (that crops the composer).
  useEffect(() => {
    const pane = threadScrollRef.current;
    if (!pane) return;
    pane.scrollTo({ top: pane.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const openThread = (id: string) => {
    requestRef.current?.abort();requestRef.current=null;setIsLoading(false);lastRequest.current=null;
    const existing = getChatThread(id);
    if (!existing) return;

    sentInitial.current = true;
    activeThreadRef.current = existing.id;
    titleGeneratedRef.current = Boolean(existing.titleGenerated);
    setThreadId(existing.id);
    setThreadTitle(existing.title);
    setMessages(existing.messages);
    setError(null);
    setCourse(
      existing.courseSlug
        ? {
            slug: existing.courseSlug,
            code: existing.courseCode || existing.courseSlug,
            title: existing.courseTitle || "",
          }
        : null,
    );
    setHistoryOpen(false);
    setActiveChatId(existing.id);
    const params = new URLSearchParams({ id });
    if (existing.courseSlug) {
      params.set("course", existing.courseSlug);
      if (existing.courseCode) params.set("code", existing.courseCode);
      if (existing.courseTitle) params.set("title", existing.courseTitle);
    }
    router.replace(`/chat?${params.toString()}`);
  };

  const startNewChat = () => {
    requestRef.current?.abort();requestRef.current=null;lastRequest.current=null;
    sentInitial.current = true;
    // Sentinel so a stale ?id= can't reload the previous thread mid-navigation.
    activeThreadRef.current = "__new__";
    titleGeneratedRef.current = false;
    titleRequestIds.current.clear();
    setThreadId(null);
    setThreadTitle("New chat");
    setMessages([]);
    setSyncStatus("");
    setComposerVersion(version => version + 1);
    setError(null);
    setIsLoading(false);
    setHistoryOpen(false);
    setCourse(null);
    setActiveChatId(null);
    router.replace("/chat");
  };

  const lastAssistantIndex = messages.reduce(
    (acc, msg, i) => (msg.role === "assistant" ? i : acc),
    -1,
  );

  useEffect(() => {
    const onCopy = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;
      const anchor = selection.anchorNode;
      if (!anchor) return;
      const el =
        anchor instanceof Element ? anchor : anchor.parentElement;
      const turn = el?.closest("[data-assistant-turn]");
      if (!turn) return;
      reportCopy(
        viewId,
        "chat",
        turn.getAttribute("data-assistant-turn") ?? undefined,
      );
    };
    document.addEventListener("copy", onCopy);
    return () => document.removeEventListener("copy", onCopy);
  }, [viewId]);

  /**
   * Promote a diagram to an artifact. The resulting slug is recorded on the turn
   * so the button stays in its saved state across reloads instead of offering a
   * duplicate save.
   */
  const saveDiagram = useCallback(
    async (messageIndex: number, blockIndex: number, spec: DiagramSpec) => {
      const res = await fetch(`/api/${viewId}/artifacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "diagram",
          title: spec.title,
          description: spec.caption,
          spec,
          source: {
            ...(threadId ? { threadId } : {}),
            threadTitle: threadTitle,
          },
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        artifact?: { slug: string };
        error?: string;
      };
      if (!res.ok || !data.artifact?.slug) {
        throw new Error(data.error || "Could not save this diagram.");
      }

      const slug = data.artifact.slug;
      setMessages((prev) =>
        prev.map((msg, i) => {
          if (i !== messageIndex) return msg;
          const rest = (msg.savedDiagrams ?? []).filter(
            (d) => d.blockIndex !== blockIndex,
          );
          return { ...msg, savedDiagrams: [...rest, { blockIndex, slug }] };
        }),
      );
    },
    [viewId, threadId, threadTitle],
  );

  /**
   * Re-render a diagram at a new depth via a real tool call, then swap the spec
   * back into the message so the change persists with the thread.
   */
  const changeDiagramDetail = useCallback(
    async (
      messageIndex: number,
      blockIndex: number,
      spec: DiagramSpec,
      detail: DiagramDetail,
    ) => {
      const source = messages[messageIndex]?.content ?? "";
      const res = await fetch("/api/chat/diagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spec,
          detail,
          // The caption gives the model the surrounding context without
          // shipping the whole thread.
          source: source.split("```")[0]?.trim() || undefined,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        spec?: DiagramSpec;
        error?: string;
      };
      if (!res.ok || !data.spec) {
        throw new Error(data.error || "Could not redraw this diagram.");
      }

      const next = data.spec;
      setMessages((prev) =>
        prev.map((msg, i) =>
          i === messageIndex
            ? {
                ...msg,
                content: replaceDiagramBlock(msg.content, blockIndex, next),
              }
            : msg,
        ),
      );
    },
    [messages],
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
              <Button variant="secondary" size="s" onClick={startNewChat}>
                <PlusSignIcon size={13} />
                New chat
              </Button>
              <HistoryButton
                onClick={() => {
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
              {course ? (
                <div className="flex flex-col items-center text-center">
                  <p className="text-[13px] leading-4 font-medium tracking-[0.02em] text-[#9A9A98]">
                    {course.code}
                  </p>
                  <h1 className="font-display pt-2 text-[40px] leading-[48px] tracking-[-0.015em] text-[#0A0A0A]">
                    {course.title || "New chat"}
                  </h1>
                </div>
              ) : (
                <div className="flex items-baseline gap-3">
                  <h1 className="font-display text-[40px] leading-[48px] tracking-[-0.015em] text-[#0A0A0A]">
                    Good afternoon,
                  </h1>
                  <span className="font-display text-[40px] leading-[48px] tracking-[-0.015em] text-[#A0A0A0]">
                    {user.firstName}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center px-6 pt-10 pb-8">
              <div className="flex w-full max-w-[732px] flex-col gap-[34px]">
                {messages.map((msg, i) =>
                  msg.role === "user" ? (
                    <div key={i} className="flex justify-end">
                      <div className="flex max-w-[520px] flex-col items-end gap-2">
                        {msg.attachments?.length ? (
                          <ChatAttachmentChips attachments={msg.attachments} />
                        ) : null}
                        {msg.content.trim() ? (
                          <div className="rounded-2xl bg-[#F5F5F5] px-4 py-[11px]">
                            <p className="text-[15px] leading-[23px] whitespace-pre-wrap text-[#0A0A0A]">
                              {renderUserMessage(msg.content)}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div
                      key={i}
                      data-assistant-turn={String(i)}
                      className="flex flex-col items-start gap-3.5"
                    >
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
                      <div className="w-full text-[15px] leading-[25px] text-[#0A0A0A]">
                        <StreamingBlocks
                          text={msg.content}
                          streaming={isLoading && i === lastAssistantIndex}
                          renderBlock={(block, index) =>
                            renderMessageContent(
                              block,
                              handlersForBlock(
                                {
                                  savedDiagrams: msg.savedDiagrams,
                                  onSave: (blockIndex, spec) =>
                                    saveDiagram(i, blockIndex, spec),
                                  onChangeDetail: (blockIndex, spec, detail) =>
                                    changeDiagramDetail(
                                      i,
                                      blockIndex,
                                      spec,
                                      detail,
                                    ),
                                },
                                splitContentBlocks(msg.content).slice(0, index),
                              ),
                            )
                          }
                        />
                      </div>
                      {!isLoading && i === lastAssistantIndex && <MonarchMark />}
                    </div>
                  ),
                )}

                {isLoading &&
                  (messages.at(-1)?.role !== "assistant" ||
                    completeBlockCount(messages.at(-1)?.content ?? "", true) ===
                      0) && (
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
            <div className="mb-2 flex items-center justify-between gap-3 text-xs text-stone-400">
              {messages.length > 0 && <button title="Retry saving conversation to disk" onClick={()=>void flushChatHistory()}>{syncStatus}</button>}
              {isLoading ? <button className="rounded-lg border border-stone-200 px-3 py-1.5 text-stone-700" onClick={()=>requestRef.current?.abort()}>Stop response</button> : error && messages.length>0 ? <button className="rounded-lg border border-stone-200 px-3 py-1.5 text-stone-700" onClick={()=>{
                const failed=lastRequest.current;
                if(failed?.files?.length && !messages.some(m=>m.attachments?.some(a=>a.id)))void send(failed.text,failed.history,failed.id,failed.skill,failed.files,failed.modes);
                else void send("Continue the interrupted response. Check the current workspace before repeating any changes.",messages,threadId,null,undefined,failed?.modes);
              }}>Continue response</button> : null}
            </div>
            {course ? (
              <div className="mb-2.5 flex">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F1F1EF] py-1 pr-1.5 pl-2.5 text-[12px] leading-4 text-[#3D3D3D]">
                  {course.code}
                  <button
                    type="button"
                    aria-label={`Remove ${course.code} context`}
                    onClick={() => setCourse(null)}
                    className="flex size-4 items-center justify-center rounded-full text-[#8A8A8A] hover:bg-[#E6E6E4] hover:text-[#1A1A1A]"
                  >
                    ×
                  </button>
                </span>
              </div>
            ) : null}
            <AIChatInput
              key={composerVersion}
              autoFocus
              disabled={isLoading}
              staticPlaceholder
              placeholders={
                course
                  ? [`Ask about ${course.code}…`]
                  : messages.length ? FOLLOW_UP_PLACEHOLDERS : ["What are you working on?"]
              }
              onSubmit={(value, meta) =>
                void send(
                  value,
                  messages,
                  threadId,
                  meta?.skill ?? null,
                  meta?.files,
                  {study:meta?.study,research:meta?.research},
                )
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
