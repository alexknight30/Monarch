"use client";

import type { RefObject } from "react";
import { Cancel01Icon } from "@/components/ui/cancel-01";
import { IconButton } from "@/components/ui/icon-button";
import { Search01Icon } from "@/components/ui/search-01";

export function ToolbarSearch({
  open,
  query,
  placeholder,
  inputRef,
  onOpen,
  onClose,
  onQueryChange,
}: {
  open: boolean;
  query: string;
  placeholder: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onOpen: () => void;
  onClose: () => void;
  onQueryChange: (value: string) => void;
}) {
  if (!open) {
    return (
      <button data-design-id="m-a43228269830"
        type="button"
        aria-label="Search"
        onClick={onOpen}
        className="flex h-[30px] w-[30px] items-center justify-center rounded-md border border-[#E6E6E6] text-[#3D3D3D] transition-colors hover:bg-[#FAFAFA]"
      >
        <Search01Icon size={15} />
      </button>
    );
  }

  return (
    <div data-design-id="m-0f66eefaf529" className="flex h-[30px] w-[220px] items-center gap-2 rounded-md border border-[#E6E6E6] bg-white px-2.5">
      <Search01Icon size={15} className="shrink-0 text-[#3D3D3D]" />
      <input data-design-id="m-4bb45478ea56"
        ref={inputRef}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            if (query) onQueryChange("");
            else onClose();
          }
        }}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm leading-[18px] text-[#0A0A0A] outline-none placeholder:text-[#6B6B6B]"
      />
      <IconButton data-design-id="m-17e5427e6563" data-design-key="m-17e5427e6563"
        icon={Cancel01Icon}
        label="Close search"
        size="s"
        onClick={onClose}
      />
    </div>
  );
}
