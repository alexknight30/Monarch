"use client";
import { DesignCopy } from "@/components/design/runtime";


import { useEffect, useRef, useState } from "react";
import { AIChatInput, type ChatSubmitMeta } from "@/components/ui/ai-chat-input";
import { ShiningText } from "@/components/ui/shining-text";
import { ThinkingMark } from "@/components/ui/thinking-mark";
import { StudyInline } from "@/components/ui/study-inline";
import { buildChatRequest, contentForApi } from "@/lib/chat-attachments";
import { consumeChatSse } from "@/lib/chat-sse";
import {
  htmlToPlainText,
  type DocChatTurn,
  type DocumentRecord,
} from "@/lib/documents";
import {
  completeBlockCount,
  StreamingBlocks,
} from "@/components/ui/streaming-blocks";

const SUGGESTIONS = ["Add a citation", "Tighten this"];

function Avatar() {
  return (
    <svg width="15" height="15" viewBox="0 0 27 27" className="shrink-0">
      <rect x="0" y="0" width="27" height="27" rx="4" fill="#0A0A0A" />
      <rect x="9" y="9" width="9" height="9" rx="1.5" fill="#FFFFFF" />
    </svg>
  );
}

export default function DocChatPanel({
  doc,
  turns,
  onTurnsChange,
  bodyHtml,
  selection,
  onClose,
  onDocumentUpdate,
}: {
  doc: DocumentRecord;
  turns: DocChatTurn[];
  onTurnsChange: (turns: DocChatTurn[]) => void;
  bodyHtml: string;
  selection: string;
  onClose: () => void;
  onDocumentUpdate?: (html: string) => void;
}) {
  const turnsRef = useRef(turns);
  const requestRef = useRef<AbortController | null>(null);
  const [proposedHtml, setProposedHtml] = useState<string | null>(null);
  const lastRequest = useRef<{text:string;meta?:ChatSubmitMeta;history:DocChatTurn[]} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const bodyHtmlRef = useRef(bodyHtml);
  const selectionRef = useRef(selection);
  useEffect(()=>{turnsRef.current=turns;},[turns]);
  useEffect(()=>()=>{requestRef.current?.abort();requestRef.current=null;},[]);
  function setTurns(value:DocChatTurn[] | ((previous:DocChatTurn[])=>DocChatTurn[])) {
    const next=typeof value === "function" ? value(turnsRef.current) : value;
    turnsRef.current=next;onTurnsChange(next);
  }

  useEffect(() => {
    bodyHtmlRef.current = bodyHtml;
  }, [bodyHtml]);

  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [turns, isLoading]);

  async function send(text: string, meta?: ChatSubmitMeta, history=turnsRef.current) {
    const trimmed = text.trim();
    if ((!trimmed && !meta?.skill && !meta?.files?.length) || requestRef.current) return;
    const controller=new AbortController();requestRef.current=controller;
    lastRequest.current={text,meta,history};

    const fileLabel = meta?.files?.length
      ? meta.files.map((file) => file.name).join(", ")
      : "";
    const display = trimmed || (fileLabel ? `Attached ${fileLabel}` : meta?.skill ? `/${meta.skill.command}` : "");
    const next: DocChatTurn[] = display
      ? [...history, { role: "user", content: display, attachments: meta?.files?.map(file=>({name:file.name,mime:file.type,size:file.size})) }]
      : history;
    if (display) setTurns(next);
    setError(null);
    setIsLoading(true);

    const html = bodyHtmlRef.current;
    const bodyText = htmlToPlainText(html);
    const sel = selectionRef.current.trim();
    const acceptDocument = (updated:string) => {
      if(bodyHtmlRef.current!==html) {
        setProposedHtml(updated);
        // A model edit may have reached the server after the student's newer autosave.
        onDocumentUpdate?.(bodyHtmlRef.current);
      } else onDocumentUpdate?.(updated);
    };

    try {
      const res = await fetch(
        "/api/chat",
        { ...buildChatRequest(
          {
            message: contentForApi({
              content: trimmed,
              attachments: meta?.files?.map((file) => ({
                name: file.name,
                mime: file.type,
                size: file.size,
              })),
            }),
            messages: next.map((t) => ({ role: t.role, content: contentForApi(t), attachments:t.attachments })),
            study:meta?.study,
            research:meta?.research,
            ...(meta?.skill
              ? {
                  skill: {
                    command: meta.skill.command,
                    prompt: meta.skill.prompt,
                    toolName: meta.skill.toolName,
                  },
                }
              : {}),
            document: {
              slug: doc.id,
              title: doc.title,
              bodyHtml: html,
              bodyText,
              ...(sel ? { selection: sel } : {}),
            },
          },
          meta?.files,
        ), signal:controller.signal },
      );

      const contentType = res.headers.get("content-type") ?? "";
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Chat request failed.");
      }

      if (contentType.includes("text/event-stream")) {
        let assembled = "";
        let documentHtml: string | undefined;
        await consumeChatSse(res, {
          onAttachments: (attachments) => {
            if(requestRef.current!==controller||controller.signal.aborted)return;
            setTurns(previous=>previous.map((turn,index)=>index===next.length-1?{...turn,attachments}:turn));
          },
          onDelta: (chunk) => {
            if(requestRef.current!==controller||controller.signal.aborted)return;
            assembled += chunk;
            setTurns((prev) => {
              const last = prev.at(-1);
              if (last?.role === "assistant") {
                return [...prev.slice(0, -1), { ...last, content: assembled }];
              }
              return [...prev, { role: "assistant", content: assembled }];
            });
          },
          onDone: (meta) => {
            if(requestRef.current!==controller||controller.signal.aborted)return;
            if (meta.documentChanged && meta.documentHtml) {
              documentHtml = meta.documentHtml;
            }
          },
        });
        if(requestRef.current!==controller||controller.signal.aborted)return;
        if (!assembled.trim()) throw new Error("Empty response from model.");
        if (documentHtml) acceptDocument(documentHtml);
      } else {
        const data = (await res.json()) as {
          message?: { content?: string };
          error?: string;
          documentChanged?: boolean;
          documentHtml?: string;
        };
        if(requestRef.current!==controller||controller.signal.aborted)return;
        if (!data.message?.content) throw new Error("Empty response from model.");

        setTurns((prev) => [
          ...prev,
          { role: "assistant", content: data.message!.content! },
        ]);

        if (data.documentChanged && data.documentHtml) {
          acceptDocument(data.documentHtml);
        }
      }
    } catch (err) {
      if(requestRef.current===controller)setError(controller.signal.aborted?"Response stopped. Your conversation has been kept.":err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      if(requestRef.current===controller){requestRef.current=null;setIsLoading(false);}
    }
  }

  return (
    <aside data-design-id="m-36f9e8f9174e" className="absolute top-20 right-6 bottom-6 z-30 flex w-[364px] flex-col overflow-hidden rounded-2xl border border-[#ECECEC] bg-white shadow-[0_12px_40px_rgba(0,0,0,0.10)]">
      <div data-design-id="m-943c28c3ce36" className="flex h-13 shrink-0 items-center justify-between border-b border-[#F2F2F2] pr-3 pl-[18px]">
        <span data-design-id="m-46d4e8336ff5" className="text-[13px] leading-4 font-medium text-[#1A1A1A]"><DesignCopy id="m-46d4e8336ff5">
          Ask Monarch
        </DesignCopy></span>
        <button data-design-id="m-982b79e0c5a9"
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-[#F5F5F5]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path
              d="M5.5 5.5l13 13M18.5 5.5l-13 13"
              fill="none"
              stroke="#8A8A8A"
              strokeWidth={1.7}
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div data-design-id="m-a5fcc737eb34"
        ref={threadRef}
        className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-[18px] py-5"
      >
        {selection.trim() ? (
          <div data-design-id="m-9e1abfcdaf65" className="flex shrink-0 flex-col gap-1.5 rounded-r-md border-l-2 border-[#C9C2AB] bg-[#FAF9F5] px-3 py-2.5">
            <span data-design-id="m-4a108ae17b44" className="text-[11px] leading-[14px] font-semibold tracking-[0.06em] text-[#6B6B6B]"><DesignCopy id="m-4a108ae17b44">
              SELECTED
            </DesignCopy></span>
            <span data-design-id="m-44253a21c210" className="font-display text-sm leading-[21px] text-[#4A4A4A]">
              {selection.length > 64 ? `${selection.slice(0, 64)}…` : selection}
            </span>
          </div>
        ) : null}

        {turns.map((turn, i) =>
          turn.role === "user" ? (
            <div data-design-id="m-f683d527c5a4" key={i} className="flex shrink-0 justify-end">
              <div data-design-id="m-538171ee29f3" className="max-w-[250px] rounded-2xl bg-[#F4F4F4] px-3.5 py-2.5">
                <span data-design-id="m-f457af75367b" className="text-sm leading-[21px] text-[#1A1A1A]">
                  {turn.content}
                </span>
                {!!turn.attachments?.length && <div data-design-id="m-072922ec5459" className="mt-2 flex flex-wrap gap-1">{turn.attachments.map((file,index)=><span data-design-id="m-47de5a477681" key={file.id||index} className="rounded border border-stone-200 px-2 py-1 text-[11px]">{file.name}</span>)}</div>}
              </div>
            </div>
          ) : (
            <div data-design-id="m-9e4bb11b838a" key={i} className="flex shrink-0 flex-col gap-3">
              <Avatar />
              <StreamingBlocks
                text={turn.content}
                streaming={isLoading && i === turns.length - 1}
                renderBlock={(block) => (
                  <p data-design-id="m-0f61a157760f" className="whitespace-pre-wrap text-sm leading-[22px] text-[#1A1A1A]">
                    <StudyInline text={block}/>
                  </p>
                )}
              />
              {turn.sources?.length ? (
                <div data-design-id="m-a358235fa29e" className="flex flex-col">
                  {turn.sources.map((source) => (
                    <div data-design-id="m-ba46f691ceaf" data-design-key={source} key={source} className="flex h-[34px] items-center gap-2.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" className="shrink-0">
                        <path
                          d="M5.5 3h9L19 7.5V21H5.5z"
                          fill="none"
                          stroke="#A0A0A0"
                          strokeWidth={1.7}
                          strokeLinejoin="round"
                        />
                        <path
                          d="M14 3v5h5"
                          fill="none"
                          stroke="#A0A0A0"
                          strokeWidth={1.7}
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span data-design-id="m-06ad74cb51bf" className="flex-1 text-[13px] leading-[18px] text-[#3D3D3D]">
                        {source}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ),
        )}

        {isLoading &&
        (turns.at(-1)?.role !== "assistant" ||
          completeBlockCount(turns.at(-1)?.content ?? "", true) === 0) ? (
          <div data-design-id="m-e720bf513b3e" className="flex shrink-0 items-center gap-2.5">
            <ThinkingMark size={18} />
            <ShiningText text="Thinking" className="!text-sm" />
          </div>
        ) : null}
        {error ? (
          <span data-design-id="m-34595f6cd5d5" className="shrink-0 text-[13px] leading-[18px] text-[#B42318]">
            {error}
          </span>
        ) : null}
      </div>

      <div data-design-id="m-759ffd48c36b" className="flex shrink-0 flex-col gap-2.5 border-t border-[#F2F2F2] px-3 pt-3 pb-3.5">
        {proposedHtml && <div data-design-id="m-0b1a127ed549" role="status" className="rounded-lg bg-amber-50 p-3 text-xs leading-5">You edited while Monarch was responding. Your writing has been kept.<div data-design-id="m-7af1f86a7968" className="mt-2 flex gap-3"><button data-design-id="m-ad1c20dcf28e" className="underline" onClick={()=>{onDocumentUpdate?.(proposedHtml);setProposedHtml(null);}}><DesignCopy id="m-ad1c20dcf28e">Use Monarch’s version</DesignCopy></button><button data-design-id="m-2da234d504eb" className="underline" onClick={()=>setProposedHtml(null)}><DesignCopy id="m-2da234d504eb">Keep mine</DesignCopy></button></div></div>}
        {isLoading && <button data-design-id="m-bdab9081a481" className="self-end text-xs underline" onClick={()=>requestRef.current?.abort()}><DesignCopy id="m-bdab9081a481">Stop response</DesignCopy></button>}
        {error && !isLoading && <button data-design-id="m-865134b3044b" className="self-end text-xs underline" onClick={()=>{
          const last=lastRequest.current;
          const attached=turnsRef.current.findLast(t=>t.role==="user")?.attachments;
          if(last?.meta?.files?.length && !attached?.some(a=>a.id))void send(last.text,last.meta,last.history);
          else void send("Continue the interrupted response. Check the current document before repeating changes.");
        }}><DesignCopy id="m-865134b3044b">Continue response</DesignCopy></button>}
        <div data-design-id="m-71f38ab95468" className="flex shrink-0 flex-wrap items-center gap-1.5">
          {SUGGESTIONS.map((suggestion) => (
            <button data-design-id="m-1df540c91057" data-design-key={suggestion}
              key={suggestion}
              type="button"
              onClick={() => void send(suggestion)}
              disabled={isLoading}
              className="flex h-[26px] shrink-0 items-center rounded-full border border-[#EAEAEA] px-2.5 text-xs leading-4 text-[#4A4A4A] transition-colors hover:bg-[#F7F7F7] disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>
        <AIChatInput
          size="compact"
          staticPlaceholder
          placeholders={["Ask about this draft…"]}
          disabled={isLoading}
          onSubmit={(value, meta) => void send(value, meta)}
        />
      </div>
    </aside>
  );
}
