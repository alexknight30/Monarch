"use client";
import { DesignCopy } from "@/components/design/runtime";


import {
  formatThreadWhen,
  snippetFromMessages,
  type ChatThread,
} from "@/lib/chat-history";

export function ChatHistoryPane({
  threads,
  activeId,
  onSelect,
  onClose,
  onNewChat,
}: {
  threads: ChatThread[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
  onNewChat: () => void;
}) {
  return (
    <div data-design-id="m-de40ff8690e2" className="flex w-[340px] shrink-0 flex-col border-l border-[#EAEAEA] bg-white">
      <div data-design-id="m-f09ebccbfcdb" className="flex h-14 shrink-0 items-center justify-between border-b border-[#F0F0F0] px-4">
        <button data-design-id="m-08b4fc986ac2"
          type="button"
          onClick={onNewChat}
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
        <button data-design-id="m-e61f562de597"
          type="button"
          onClick={onClose}
          aria-label="Close history"
          className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-[#F5F5F5]"
        >
          <svg width="15" height="15" viewBox="0 0 24 24">
            <path
              d="M6 6l12 12M18 6L6 18"
              fill="none"
              stroke="#6B6B6B"
              strokeWidth="1.9"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div data-design-id="m-e1bc4e26e814" className="min-h-0 flex-1 overflow-y-auto">
        {threads.length === 0 ? (
          <div data-design-id="m-cf40f3c20a82" className="flex flex-col items-center gap-2 px-6 pt-16 text-center">
            <p data-design-id="m-a198b96e7acb" className="text-sm leading-5 text-[#6B6B6B]"><DesignCopy id="m-a198b96e7acb">No chats yet</DesignCopy></p>
            <p data-design-id="m-7f11eabe26b8" className="text-[13px] leading-[18px] text-[#A0A0A0]"><DesignCopy id="m-7f11eabe26b8">
              Start a conversation and it will show up here.
            </DesignCopy></p>
          </div>
        ) : (
          <div data-design-id="m-ab6076b45bef" className="flex flex-col px-2 py-2">
            {threads.map((thread) => {
              const active = thread.id === activeId;
              return (
                <button data-design-id="m-72ee11fd4e97" data-design-key={thread.id}
                  key={thread.id}
                  type="button"
                  onClick={() => onSelect(thread.id)}
                  className={`flex w-full flex-col gap-1 rounded-lg px-3 py-3 text-left transition-colors ${
                    active ? "bg-[#F5F5F5]" : "hover:bg-[#FAFAFA]"
                  }`}
                >
                  <div data-design-id="m-b2b79ce59b54" className="flex items-start justify-between gap-3">
                    <span data-design-id="m-29daa9189c59" className="truncate text-sm leading-5 font-medium text-[#0A0A0A]">
                      {thread.title}
                    </span>
                    <span data-design-id="m-7c2354cbdaa5" className="shrink-0 text-[11px] leading-4 text-[#9A9A98]">
                      {formatThreadWhen(thread.updatedAt)}
                    </span>
                  </div>
                  <span data-design-id="m-cb12116ef9c7" className="truncate text-[13px] leading-[18px] text-[#7A7A7A]">
                    {snippetFromMessages(thread.messages)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function HistoryButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button data-design-id="m-a2a53ec2eace"
      type="button"
      onClick={onClick}
      className="flex h-[30px] items-center gap-1.5 rounded-md border border-[#E6E6E6] px-3 text-xs leading-4 font-medium text-[#3D3D3D] transition-colors hover:bg-[#FAFAFA]"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" className="shrink-0">
        <path
          d="M3 12a9 9 0 1 0 9-9"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M3 4v5h5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 7v5l3 2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      History
    </button>
  );
}
