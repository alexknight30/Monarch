"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AIChatInput } from "@/components/ui/ai-chat-input";

type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

const FOLLOW_UP_PLACEHOLDERS = ["Ask a follow-up…"];

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
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get("q")?.trim() ?? "";

  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  // Guards against the initial prompt firing twice under React Strict Mode.
  const sentInitial = useRef(false);

  const send = useCallback(async (text: string, history: ChatTurn[]) => {
    const nextMessages: ChatTurn[] = [
      ...history,
      { role: "user", content: text },
    ];

    setMessages(nextMessages);
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, messages: nextMessages }),
      });

      const data = (await res.json()) as {
        message?: ChatTurn;
        error?: string;
      };

      if (!res.ok) throw new Error(data.error || "Chat request failed.");
      if (!data.message?.content) throw new Error("Empty response from model.");

      const reply = data.message.content;
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fire the prompt carried over from the home composer.
  useEffect(() => {
    if (!initialPrompt || sentInitial.current) return;
    sentInitial.current = true;
    void send(initialPrompt, []);
  }, [initialPrompt, send]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const title = messages[0]?.content ?? "New chat";

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      {/* Top bar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#F0F0F0] px-[22px]">
        <div className="flex min-w-0 items-center gap-[7px]">
          <span className="truncate text-[13px] leading-4 font-medium text-[#1A1A1A]">
            {title}
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
        <button
          type="button"
          className="flex h-[30px] shrink-0 items-center rounded-md border border-[#E6E6E6] px-3 text-xs leading-4 font-medium text-[#3D3D3D] transition-colors hover:bg-[#FAFAFA]"
        >
          Share
        </button>
      </div>

      {/* Thread */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col items-center px-6 pt-10 pb-6">
          <div className="flex w-full max-w-[732px] flex-col gap-[34px]">
            {messages.map((msg, i) =>
              msg.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[520px] rounded-2xl bg-[#F5F5F5] px-4 py-[11px]">
                    <p className="text-[15px] leading-[23px] whitespace-pre-wrap text-[#0A0A0A]">
                      {msg.content}
                    </p>
                  </div>
                </div>
              ) : (
                <div key={i} className="flex flex-col items-start gap-3.5">
                  <LumisMark />
                  <p className="max-w-[640px] text-[15px] leading-[25px] whitespace-pre-wrap text-[#0A0A0A]">
                    {msg.content}
                  </p>
                </div>
              ),
            )}

            {isLoading && (
              <div className="flex flex-col items-start gap-3.5">
                <LumisMark />
                <p className="text-[15px] leading-[25px] text-[#8A8A8A]">
                  Thinking…
                </p>
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
      </div>

      {/* Composer dock */}
      <div className="shrink-0 px-6 pt-2 pb-[26px]">
        <div className="mx-auto w-full max-w-[732px]">
          <AIChatInput
            autoFocus
            disabled={isLoading}
            placeholders={FOLLOW_UP_PLACEHOLDERS}
            onSubmit={(value) => void send(value, messages)}
          />
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex-1 bg-white" />}>
      <ChatScreen />
    </Suspense>
  );
}
