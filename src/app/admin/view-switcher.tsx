"use client";

import { useState } from "react";
import { applyView } from "@/components/view-provider";
import { VIEWS, type ViewId } from "@/lib/views";

/** Dropdown + confirm. Picking alone does nothing until you open the app. */
export default function ViewSwitcher({ activeId }: { activeId: ViewId }) {
  const [selected, setSelected] = useState<ViewId>(activeId);

  return (
    <>
      <label
        htmlFor="view-select"
        className="block text-[13px] leading-4 text-[#5E5E5E]"
      >
        Switch view
      </label>

      <div className="flex items-center gap-2.5 pt-2.5">
        <div className="relative min-w-0 flex-1">
          <select
            id="view-select"
            value={selected}
            onChange={(e) => setSelected(e.target.value as ViewId)}
            className="h-10 w-full appearance-none rounded-lg border border-[#E6E6E6] bg-white pr-9 pl-3.5 text-sm leading-[18px] text-[#0A0A0A] transition-colors hover:bg-[#FAFAFA] focus:border-[#D6D6D2] focus:outline-none"
          >
            {VIEWS.map((view) => (
              <option key={view.id} value={view.id}>
                {view.label}
              </option>
            ))}
          </select>
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2"
          >
            <path
              d="M6 9.5l6 6 6-6"
              fill="none"
              stroke="#5E5E5E"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <button
          type="button"
          onClick={() => applyView(selected)}
          className="flex h-10 shrink-0 items-center justify-center rounded-lg bg-[#141414] px-5 text-sm leading-[18px] font-medium text-white transition-colors hover:bg-[#000000]"
        >
          Open app
        </button>
      </div>
    </>
  );
}
