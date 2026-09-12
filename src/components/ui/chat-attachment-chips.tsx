"use client";

import { X } from "lucide-react";
import {
  formatAttachmentSize,
  type ChatAttachmentMeta,
} from "@/lib/chat-attachments";
import { File01Icon } from "@/components/ui/file-01";

type ChatAttachmentChipsProps = {
  attachments: ChatAttachmentMeta[];
  compact?: boolean;
  onRemove?: (index: number) => void;
};

export function ChatAttachmentChips({
  attachments,
  compact = false,
  onRemove,
}: ChatAttachmentChipsProps) {
  if (attachments.length === 0) return null;

  return (
    <ul className={`flex flex-wrap ${compact ? "gap-1.5" : "gap-2"}`}>
      {attachments.map((file, index) => (
        <li key={`${file.name}-${file.size}-${index}`}>
          <span
            className={`inline-flex max-w-[240px] items-center gap-1.5 rounded-full bg-[#F1F1EF] text-[#3D3D3D] ${
              compact ? "py-0.5 pr-1.5 pl-1.5" : "py-1 pr-2 pl-2"
            }`}
          >
            <File01Icon size={compact ? 13 : 15} className="shrink-0 text-[#5E5E5E]" />
            <span className="min-w-0 truncate text-[12px] leading-4">
              {file.name}
            </span>
            <span className="shrink-0 text-[11px] leading-4 text-[#8A8A8A]">
              {formatAttachmentSize(file.size)}
            </span>
            {onRemove ? (
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                title="Remove file"
                onClick={(event) => {
                  event.stopPropagation();
                  onRemove(index);
                }}
                className="flex size-4 shrink-0 items-center justify-center rounded-full text-[#8A8A8A] transition hover:bg-[#E6E6E4] hover:text-[#1A1A1A]"
              >
                <X size={11} />
              </button>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
