"use client";
import { DesignCopy } from "@/components/design/runtime";


import { useCallback, useMemo, useState } from "react";
import { useViewId } from "@/components/view-provider";
import type { AdminUser, AdminUserField } from "@/lib/mock-data";

const PAGE_SIZE = 10;

const COLUMNS: { key: AdminUserField; label: string; width: string }[] = [
  { key: "username", label: "Username", width: "w-60" },
  { key: "role", label: "Role", width: "w-[150px]" },
  { key: "email", label: "Email", width: "w-80" },
  { key: "courses", label: "Courses", width: "w-30" },
  { key: "lastUsed", label: "Last used", width: "w-60" },
  { key: "usage", label: "Usage", width: "w-[193px]" },
];

const SORTS = [
  { id: "name", label: "Name A–Z" },
  { id: "role", label: "Role" },
  { id: "usage", label: "Usage" },
] as const;

type SortId = (typeof SORTS)[number]["id"];

const th = {
  fill: "none",
  stroke: "#B4BAC5",
  strokeWidth: 1.5,
};

function ColumnIcon({ column }: { column: string }) {
  switch (column) {
    case "username":
      return (
        <svg width="13" height="13" viewBox="0 0 16 16" className="shrink-0">
          <circle cx="8" cy="5.5" r="2.75" {...th} />
          <path d="M2.75 14c0-2.5 2.35-4 5.25-4s5.25 1.5 5.25 4" {...th} strokeLinecap="round" />
        </svg>
      );
    case "role":
      return (
        <svg width="13" height="13" viewBox="0 0 16 16" className="shrink-0">
          <rect x="2" y="3.5" width="12" height="9" rx="1.5" {...th} />
          <path d="M6 3.5V2.5h4v1" {...th} strokeLinecap="round" />
        </svg>
      );
    case "email":
      return (
        <svg width="13" height="13" viewBox="0 0 16 16" className="shrink-0">
          <rect x="2" y="3.5" width="12" height="9" rx="1.5" {...th} />
          <path d="M2.5 4.5L8 8.5l5.5-4" {...th} strokeLinecap="round" />
        </svg>
      );
    case "courses":
      return (
        <svg width="13" height="13" viewBox="0 0 16 16" className="shrink-0">
          <path d="M3 2.5h6.5A2.5 2.5 0 0 1 12 5v8.5H5.5A2.5 2.5 0 0 1 3 11z" {...th} strokeLinejoin="round" />
          <path d="M3 11h9" {...th} strokeLinecap="round" />
        </svg>
      );
    case "lastUsed":
      return (
        <svg width="13" height="13" viewBox="0 0 16 16" className="shrink-0">
          <circle cx="8" cy="8" r="6" {...th} />
          <path d="M8 4.5V8L10 10" {...th} strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg width="13" height="13" viewBox="0 0 16 16" className="shrink-0">
          <path d="M3 13V9M8 13V4M13 13v-6" {...th} strokeLinecap="round" />
        </svg>
      );
  }
}

function compareText(a: string, b: string) {
  const aEmpty = !a.trim();
  const bEmpty = !b.trim();
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;
  return a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });
}

function usageValue(value: string) {
  const parsed = Number.parseFloat(value.replace(/%/g, "").trim());
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

function sortUsers(users: AdminUser[], sort: SortId) {
  const sorted = [...users];
  if (sort === "usage") {
    sorted.sort((a, b) => usageValue(b.usage) - usageValue(a.usage) || compareText(a.username, b.username));
    return sorted;
  }
  const field = sort === "role" ? "role" : "username";
  sorted.sort((a, b) => compareText(a[field], b[field]) || compareText(a.username, b.username));
  return sorted;
}

function pageWindow(current: number, total: number) {
  if (total <= 3) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 2) return [1, 2, 3];
  if (current >= total - 1) return [total - 2, total - 1, total];
  return [current - 1, current, current + 1];
}

export default function VisibilityClient({
  initialUsers,
}: {
  initialUsers: AdminUser[];
}) {
  const viewId = useViewId();
  const [users, setUsers] = useState(initialUsers);
  const [sort, setSort] = useState<SortId>("name");
  const [sortOpen, setSortOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);

  const sorted = useMemo(() => sortUsers(users, sort), [users, sort]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pages = pageWindow(currentPage, totalPages);
  const atFirst = currentPage <= 1;
  const atLast = currentPage >= totalPages;

  const saveField = useCallback(
    async (id: string, field: AdminUserField, value: string) => {
      const res = await fetch(`/api/${viewId}/users/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) return;
      const payload = (await res.json()) as { user: AdminUser };
      setUsers((current) =>
        current.map((user) => (user.id === payload.user.id ? payload.user : user)),
      );
    },
    [viewId],
  );

  const addUser = useCallback(async () => {
    if (adding) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/${viewId}/users`, { method: "POST" });
      if (!res.ok) return;
      const payload = (await res.json()) as { user: AdminUser };
      setUsers((current) => [...current, payload.user]);
      setPage(Math.max(1, Math.ceil((users.length + 1) / PAGE_SIZE)));
    } finally {
      setAdding(false);
    }
  }, [adding, users.length, viewId]);

  return (
    <div data-design-id="m-ab99ee2d9eb0" className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden px-14 pt-7 pb-5">
      <div data-design-id="m-82913cc04746" className="flex h-[34px] w-[1263px] shrink-0 items-center justify-end">
        <div data-design-id="m-b0812feefecf" className="flex items-center gap-2">
          <button data-design-id="m-0a2ffe3bc225"
            type="button"
            aria-label="Add user"
            disabled={adding}
            onClick={() => void addUser()}
            className="flex h-[30px] w-[30px] shrink-0 cursor-pointer items-center justify-center rounded-[15px] border border-[#E5E7EC] bg-white hover:bg-[#FAFBFC] disabled:cursor-wait disabled:opacity-50"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" className="shrink-0">
              <path d="M8 3.2V12.8M3.2 8H12.8" fill="none" stroke="#15181E" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <div data-design-id="m-d2017f6c452f" className="relative">
            <button data-design-id="m-fbec08a13561"
              type="button"
              aria-haspopup="menu"
              aria-expanded={sortOpen}
              onClick={() => setSortOpen((open) => !open)}
              className="flex h-[30px] cursor-pointer items-center gap-[7px] rounded-[7px] border border-[#E5E7EC] bg-white pr-[9px] pl-[11px] hover:bg-[#FAFBFC]"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" className="shrink-0">
                <path d="M3 6L6 3L9 6M6 3V13M13 10L10 13L7 10M10 13V3" fill="none" stroke="#15181E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span data-design-id="m-567dd8ed2c79" className="text-[12.5px] leading-4 text-[#15181E]"><DesignCopy id="m-567dd8ed2c79">Sort</DesignCopy></span>
              <svg width="13" height="13" viewBox="0 0 16 16" className="shrink-0">
                <path d="M4 6.5L8 10.5L12 6.5" fill="none" stroke="#9AA1AE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {sortOpen ? (
              <>
                <button data-design-id="m-f9db5be33ff8"
                  type="button"
                  aria-label="Close sort menu"
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setSortOpen(false)}
                />
                <div data-design-id="m-ace66149fb29"
                  role="menu"
                  className="absolute top-full right-0 z-20 mt-1 min-w-[168px] overflow-hidden rounded-lg border border-[#E8E8E6] bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
                >
                  {SORTS.map((option) => (
                    <button data-design-id="m-850ab6089382" data-design-key={option.id}
                      key={option.id}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setSort(option.id);
                        setPage(1);
                        setSortOpen(false);
                      }}
                      className={`flex w-full cursor-pointer items-center px-3 py-2 text-left text-[13px] leading-4 transition-colors ${
                        sort === option.id
                          ? "bg-[#F5F5F3] font-medium text-[#0A0A0A]"
                          : "text-[#0A0A0A] hover:bg-[#F7F7F5]"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div data-design-id="m-bb97da6a42e8" className="flex min-h-0 w-[1263px] flex-col overflow-clip rounded-[9px] border border-[#E5E7EC] bg-white">
        <div data-design-id="m-169104616d89" className="flex h-[42px] shrink-0 items-center border-b border-[#E5E7EC] bg-[#FBFBFC]">
          {COLUMNS.map((col, i) => (
            <div data-design-id="m-f3f66504053d" data-design-key={col.key}
              key={col.key}
              className={`flex h-[26px] shrink-0 items-center gap-1.5 px-3.5 ${col.width} ${
                i < COLUMNS.length - 1 ? "border-r border-[#E5E7EC]" : ""
              }`}
            >
              <ColumnIcon column={col.key} />
              <span data-design-id="m-b151369ad1ce" className="text-[11.5px] font-medium leading-[14px] text-[#15181E]">{col.label}</span>
            </div>
          ))}
        </div>

        <div data-design-id="m-cf4f455a4e26" className="flex min-h-0 flex-col overflow-y-auto">
          {visible.map((user) => (
            <div data-design-id="m-61ff35a60fd6" data-design-key={user.id}
              key={user.id}
              className="flex h-[52px] shrink-0 items-center border-b border-[#EFF0F3] last:border-b-0 hover:bg-[#FBFBFC]"
            >
              {COLUMNS.map((col, i) => (
                <div data-design-id="m-c5d0e8f00d46" data-design-key={col.key}
                  key={col.key}
                  className={`flex h-[34px] shrink-0 items-center px-3.5 ${col.width} ${
                    i < COLUMNS.length - 1 ? "border-r border-[#EFF0F3]" : ""
                  }`}
                >
                  <input data-design-id="m-1ec39228be0e"
                    value={user[col.key]}
                    placeholder="Add…"
                    aria-label={`${col.label} for ${user.username || "user"}`}
                    onChange={(event) => {
                      const value = event.target.value;
                      setUsers((current) =>
                        current.map((row) =>
                          row.id === user.id ? { ...row, [col.key]: value } : row,
                        ),
                      );
                    }}
                    onBlur={(event) => {
                      void saveField(user.id, col.key, event.target.value);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                    }}
                    className={`h-full w-full bg-transparent text-[12.5px] leading-4 text-[#15181E] outline-none placeholder:text-[#C4C7CE] ${
                      col.key === "username" ? "font-medium" : ""
                    }`}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div data-design-id="m-19633997d5e4" className="flex w-[1263px] shrink-0 items-center justify-end">
        <div data-design-id="m-cffcee1645f8" className="flex items-center gap-1">
          <button data-design-id="m-abd86825716d"
            type="button"
            disabled={atFirst}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg pr-3 pl-2.5 hover:bg-[#F5F6F8] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" className="shrink-0">
              <path d="M10 3.5L5.5 8L10 12.5" fill="none" stroke="#15181E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span data-design-id="m-9bef312a0d79" className="text-[12.5px] font-medium leading-4 text-[#15181E]"><DesignCopy id="m-9bef312a0d79">Previous</DesignCopy></span>
          </button>
          {pages.map((pageNumber) => (
            <button data-design-id="m-2f85d0df3e21" data-design-key={pageNumber}
              key={pageNumber}
              type="button"
              onClick={() => setPage(pageNumber)}
              className={`flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[12.5px] leading-4 ${
                pageNumber === currentPage
                  ? "bg-[#15181E] font-semibold text-white"
                  : "bg-white font-medium text-[#15181E] hover:bg-[#F5F6F8]"
              }`}
            >
              {pageNumber}
            </button>
          ))}
          <button data-design-id="m-acefd19336c0"
            type="button"
            disabled={atLast}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg pr-2.5 pl-3 hover:bg-[#F5F6F8] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <span data-design-id="m-8d9a0ff6d4fc" className="text-[12.5px] font-medium leading-4 text-[#15181E]"><DesignCopy id="m-8d9a0ff6d4fc">Next</DesignCopy></span>
            <svg width="14" height="14" viewBox="0 0 16 16" className="shrink-0">
              <path d="M6 3.5L10.5 8L6 12.5" fill="none" stroke="#15181E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
