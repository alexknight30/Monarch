"use client";
import { DesignCopy } from "@/components/design/runtime";


import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChatHistoryPane } from "@/components/chat-history-pane";
import { AIChatInput } from "@/components/ui/ai-chat-input";
import { HistoryIcon } from "@/components/ui/history";
import {
  getActiveChatId,
  getChatThread,
  setActiveChatId,
} from "@/lib/chat-history";
import { QUICK_ACTIONS } from "@/lib/mock-data";
import { setPendingChat } from "@/lib/pending-chat";
import { useViewDataset } from "@/components/view-provider";
import { useActiveChatId,useChatThreads } from "@/lib/use-chat-threads";
import { useHydrated } from "@/lib/use-hydrated";

const iconProps = {
  fill: "none",
  stroke: "#1A1A1A",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function ActionIcon({ name }: { name: (typeof QUICK_ACTIONS)[number]["icon"] }) {
  switch (name) {
    case "doc":
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" className="shrink-0">
          <path d="M5.5 3h9L19 7.5V21H5.5z" {...iconProps} />
          <path d="M14 3v5h5M9 13h6M9 16.5h4" {...iconProps} />
        </svg>
      );
    case "list":
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" className="shrink-0">
          <path d="M3.5 6.5h17M3.5 12h11M3.5 17.5h8M17.5 13.5v7M14 17h7" {...iconProps} />
        </svg>
      );
    case "network":
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" className="shrink-0">
          <circle cx="6" cy="7" r="3" {...iconProps} />
          <circle cx="18" cy="17" r="3" {...iconProps} />
          <path d="M6 10v4a3 3 0 0 0 3 3h6" {...iconProps} />
        </svg>
      );
    case "clock":
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" className="shrink-0">
          <circle cx="12" cy="13.5" r="7.5" {...iconProps} />
          <path d="M12 9.5v4l2.5 1.5M9.5 2.5h5" {...iconProps} />
        </svg>
      );
    case "upload":
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" className="shrink-0">
          <rect x="3" y="3" width="18" height="18" {...iconProps} />
          <path d="M3 14h4l1.5 2.5h7L17 14h4" {...iconProps} />
        </svg>
      );
  }
}

const HOME_PILLS = QUICK_ACTIONS.filter((action) =>
  ["New study guide", "Practice quiz", "Office hours"].includes(action.label),
);

const HOME_PILL_PROMPTS: Record<string, string> = {
  "New study guide": "Make me a study guide",
  "Practice quiz": "Create a practice quiz",
  "Office hours": "When are office hours?",
};

function HomeScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Logo uses /?home=1 so we always show the landing, even from an open chat.
  const forceLanding = searchParams.get("home") === "1";
  const { user } = useViewDataset();
  const [historyOpen, setHistoryOpen] = useState(false);
  const threads=useChatThreads();
  const activeId=useActiveChatId();
  const ready=useHydrated();

  // Resume the last chat when using the Chat nav item — not the logo.
  useEffect(() => {
    if (forceLanding) {
      setActiveChatId(null);
      router.replace("/");
      return;
    }

    const id = getActiveChatId();
    if (id && getChatThread(id)) {
      router.replace(`/chat?id=${encodeURIComponent(id)}`);
      return;
    }
    if (id) setActiveChatId(null);
  }, [forceLanding, router]);

  if (!ready) {
    return <div data-design-id="m-66355d49a9f8" className="flex-1 bg-white" />;
  }

  return (
    <div data-design-id="m-988ac891a10c" className="flex h-full min-h-0 flex-1 bg-white">
      <div data-design-id="m-f48c182f4e06" className="relative min-w-0 flex-1 overflow-y-auto">
        {!historyOpen ? (
          <button data-design-id="m-837d8128d13a"
            type="button"
            aria-label="Chat history"
            onClick={() => {
              setHistoryOpen(true);
            }}
            className="absolute top-10 right-7 z-10 flex size-11 cursor-pointer items-center justify-center rounded-md text-[#1A1A1A] transition-colors hover:bg-[#FAFAFA]"
          >
            <HistoryIcon size={20} />
          </button>
        ) : null}

        <div data-design-id="m-2d3de0f9097f" className="flex min-h-full flex-col items-center pt-[156px] pb-14">
          <div data-design-id="m-aa0ac7f179a4" className="flex flex-col items-center gap-3.5">
            <div data-design-id="m-8aae3e6e0b84" className="flex items-baseline gap-3">
              <h1 data-design-id="m-faab3d50eb6d" className="[font-family:var(--font-neuton),Georgia,serif] text-[55px] leading-[64px] tracking-[-0.015em] text-[#1A1A1A]"><DesignCopy id="m-faab3d50eb6d">
                Good afternoon,
              </DesignCopy></h1>
              <span data-design-id="m-9f218fc5ba55" className="[font-family:var(--font-neuton),Georgia,serif] text-[55px] leading-[64px] tracking-[-0.015em] text-[#B3AFA5]">
                {user.firstName}
              </span>
            </div>
            <p data-design-id="m-13284c7e657b" className="text-xl leading-5 text-[#6B675F]"><DesignCopy id="m-13284c7e657b">
              What are we working on today?
            </DesignCopy></p>
          </div>

          <div data-design-id="m-55bca46b6918" className="mt-auto flex w-[732px] flex-col items-center">
            <AIChatInput
              onSubmit={(value, meta) => {
                if (meta?.files?.length||meta?.study||meta?.research) {
                  setPendingChat({
                    text: value,
                    skill: meta.skill,
                    files: meta.files||[],
                    study:meta.study,
                    research:meta.research,
                  });
                  router.push("/chat");
                  return;
                }
                const params = new URLSearchParams();
                if (value) params.set("q", value);
                if (meta?.skill) params.set("skill", meta.skill.command);
                router.push(`/chat?${params.toString()}`);
              }}
              expandedRow={
                <div data-design-id="m-092210bc15c0" className="flex items-center gap-2">
                  {HOME_PILLS.map((action) => (
                    <button data-design-id="m-773e7e17f2be" data-design-key={action.label}
                      key={action.label}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        const prompt =
                          HOME_PILL_PROMPTS[action.label] ?? action.label;
                        router.push(
                          `/chat?q=${encodeURIComponent(prompt)}`,
                        );
                      }}
                      className="flex h-[34px] cursor-pointer items-center gap-[7px] rounded-full border border-[#E6E6E6] bg-white px-3.5 transition-colors hover:bg-[#FAFAFA]"
                    >
                      <ActionIcon name={action.icon} />
                      <span data-design-id="m-0fe0ad2329ff" className="text-[13px] leading-4 text-[#1A1A1A]">
                        {action.label}
                      </span>
                    </button>
                  ))}
                </div>
              }
            />
          </div>
        </div>
      </div>

      {historyOpen ? (
        <ChatHistoryPane
          threads={threads}
          activeId={activeId}
          onSelect={(id) => {
            setActiveChatId(id);
            setHistoryOpen(false);
            router.push(`/chat?id=${encodeURIComponent(id)}`);
          }}
          onClose={() => setHistoryOpen(false)}
          onNewChat={() => {
            setActiveChatId(null);
            setHistoryOpen(false);
            router.push("/chat");
          }}
        />
      ) : null}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div data-design-id="m-e478d55f5f6d" className="flex-1 bg-white" />}>
      <HomeScreen />
    </Suspense>
  );
}
