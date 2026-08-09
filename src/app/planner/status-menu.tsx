"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { STATUS_LABEL, type PlannerStatus } from "@/lib/planner";

/** Linear-style order in the picker. */
const MENU_STATUSES: PlannerStatus[] = ["backlog", "todo", "in-progress", "done"];

export function StatusIcon({
  status,
  size = 14,
}: {
  status: PlannerStatus;
  size?: number;
}) {
  const common = "block shrink-0";

  if (status === "done") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" className={common}>
        <circle cx="8" cy="8" r="6" fill="#0A0A0A" />
        <path
          d="M5.2 8.2l2 2 3.6-4"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (status === "in-progress") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" className={common}>
        <circle cx="8" cy="8" r="6" fill="none" stroke="#0A0A0A" strokeWidth="1.5" />
        <path d="M8 8V2A6 6 0 0 1 8 14z" fill="#0A0A0A" />
      </svg>
    );
  }

  if (status === "backlog") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" className={common}>
        <circle
          cx="8"
          cy="8"
          r="6"
          fill="none"
          stroke="#B4B4B0"
          strokeWidth="1.5"
          strokeDasharray="2.2 2.2"
        />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={common}>
      <circle cx="8" cy="8" r="6" fill="none" stroke="#9A9A98" strokeWidth="1.5" />
    </svg>
  );
}

type StatusMenuProps = {
  current: PlannerStatus;
  anchorRect: DOMRect;
  onSelect: (status: PlannerStatus) => void;
  onClose: () => void;
};

export default function StatusMenu({
  current,
  anchorRect,
  onSelect,
  onClose,
}: StatusMenuProps) {
  const labelId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(
      0,
      MENU_STATUSES.findIndex((s) => s === current),
    ),
  );

  const filtered = MENU_STATUSES.filter((status) =>
    STATUS_LABEL[status].toLowerCase().includes(query.trim().toLowerCase()),
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => inputRef.current?.focus(), 10);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    setActiveIndex((i) => {
      if (filtered.length === 0) return 0;
      return Math.min(i, filtered.length - 1);
    });
  }, [filtered.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (filtered.length ? (i + 1) % filtered.length : 0));
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) =>
          filtered.length ? (i - 1 + filtered.length) % filtered.length : 0,
        );
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        const pick = filtered[activeIndex];
        if (pick) onSelect(pick);
        return;
      }

      const digit = Number(e.key);
      if (digit >= 1 && digit <= MENU_STATUSES.length && !query) {
        e.preventDefault();
        onSelect(MENU_STATUSES[digit - 1]);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, filtered, onClose, onSelect, query]);

  // Keep the menu on-screen if the anchor is near the bottom edge.
  const [pos, setPos] = useState({ top: 0, left: 0 });
  useLayoutEffect(() => {
    const width = 240;
    const estimatedHeight = 210;
    const gap = 6;
    let top = anchorRect.bottom + gap;
    let left = anchorRect.left;
    if (top + estimatedHeight > window.innerHeight - 8) {
      top = Math.max(8, anchorRect.top - estimatedHeight - gap);
    }
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - width - 8);
    }
    setPos({ top, left });
  }, [anchorRect]);

  if (!mounted) return null;

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Dismiss status menu"
        className="fixed inset-0 z-50 cursor-default"
        onClick={onClose}
      />
      <div
        role="listbox"
        aria-labelledby={labelId}
        style={{ top: pos.top, left: pos.left }}
        className="fixed z-[60] w-[240px] overflow-hidden rounded-xl border border-[#E8E8E6] bg-white shadow-[0_12px_40px_rgba(0,0,0,0.12)]"
      >
        <div className="flex h-10 items-center gap-2 border-b border-[#F0F0F0] px-3">
          <input
            ref={inputRef}
            id={labelId}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="Change status..."
            className="min-w-0 flex-1 bg-transparent text-[13px] leading-4 text-[#0A0A0A] outline-none placeholder:text-[#9A9A98]"
          />
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border border-[#E6E6E6] text-[11px] leading-none text-[#9A9A98]">
            S
          </span>
        </div>

        <div className="flex flex-col p-1.5">
          {filtered.length === 0 ? (
            <p className="px-2 py-2 text-[13px] leading-4 text-[#9A9A98]">No status found</p>
          ) : (
            filtered.map((status, index) => {
              const selected = status === current;
              const active = index === activeIndex;
              const shortcut = MENU_STATUSES.indexOf(status) + 1;
              return (
                <button
                  key={status}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => onSelect(status)}
                  className={`flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-left text-[13px] leading-4 transition-colors ${
                    active ? "bg-[#F1F1EF] text-[#0A0A0A]" : "text-[#0A0A0A]"
                  }`}
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                    <StatusIcon status={status} size={14} />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{STATUS_LABEL[status]}</span>
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                    {selected ? (
                      <svg width="14" height="14" viewBox="0 0 16 16" className="block">
                        <path
                          d="M3.5 8.2l3 3 6-6.5"
                          fill="none"
                          stroke="#0A0A0A"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : null}
                  </span>
                  <span className="flex w-3 shrink-0 items-center justify-end text-[12px] leading-none text-[#9A9A98] tabular-nums">
                    {shortcut}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}
