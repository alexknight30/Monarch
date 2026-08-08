import { ADMIN_USERS } from "@/lib/mock-data";

const COLUMNS = [
  { key: "username", label: "Username", width: "w-60" },
  { key: "role", label: "Role", width: "w-[150px]" },
  { key: "email", label: "Email", width: "w-80" },
  { key: "courses", label: "Courses", width: "w-30" },
  { key: "lastUsed", label: "Last used", width: "w-60" },
  { key: "usage", label: "Usage", width: "w-[193px]" },
] as const;

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

export default function AdminPage() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4 px-14 pt-7 pb-5">
      {/* Toolbar */}
      <div className="flex h-[34px] w-[1263px] shrink-0 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 shrink-0 items-center gap-0.5 rounded-[18px] border border-[#E5E7EC] bg-white px-[5px]">
            <button type="button" aria-label="Previous day" className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[13px] hover:bg-[#F5F6F8]">
              <svg width="15" height="15" viewBox="0 0 16 16" className="shrink-0">
                <path d="M9.8 3.6L5.4 8L9.8 12.4" fill="none" stroke="#6E7686" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="px-1 text-[13.5px] font-semibold leading-[18px] text-[#15181E]">Fri, Aug 7</span>
            <button type="button" aria-label="Next day" className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[13px] hover:bg-[#F5F6F8]">
              <svg width="15" height="15" viewBox="0 0 16 16" className="shrink-0">
                <path d="M6.2 3.6L10.6 8L6.2 12.4" fill="none" stroke="#6E7686" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <button type="button" aria-label="Pick a date" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[18px] border border-[#E5E7EC] bg-white hover:bg-[#FAFBFC]">
            <svg width="16" height="16" viewBox="0 0 16 16" className="shrink-0">
              <rect x="2.2" y="3.4" width="11.6" height="10.4" rx="2" fill="none" stroke="#15181E" strokeWidth="1.5" />
              <path d="M5.4 1.8V4.2M10.6 1.8V4.2M2.2 6.6H13.8" fill="none" stroke="#15181E" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" aria-label="Add user" className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[15px] border border-[#E5E7EC] bg-white hover:bg-[#FAFBFC]">
            <svg width="16" height="16" viewBox="0 0 16 16" className="shrink-0">
              <path d="M8 3.2V12.8M3.2 8H12.8" fill="none" stroke="#15181E" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <button type="button" className="flex h-[30px] items-center gap-[7px] rounded-[7px] border border-[#E5E7EC] bg-white pr-[9px] pl-[11px] hover:bg-[#FAFBFC]">
            <svg width="13" height="13" viewBox="0 0 16 16" className="shrink-0">
              <path d="M3 6L6 3L9 6M6 3V13M13 10L10 13L7 10M10 13V3" fill="none" stroke="#15181E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[12.5px] leading-4 text-[#15181E]">Sort</span>
            <svg width="13" height="13" viewBox="0 0 16 16" className="shrink-0">
              <path d="M4 6.5L8 10.5L12 6.5" fill="none" stroke="#9AA1AE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex min-h-0 w-[1263px] flex-col overflow-clip rounded-[9px] border border-[#E5E7EC] bg-white">
        <div className="flex h-[42px] shrink-0 items-center border-b border-[#E5E7EC] bg-[#FBFBFC]">
          {COLUMNS.map((col, i) => (
            <div
              key={col.key}
              className={`flex h-[26px] shrink-0 items-center gap-1.5 px-3.5 ${col.width} ${
                i < COLUMNS.length - 1 ? "border-r border-[#E5E7EC]" : ""
              }`}
            >
              <ColumnIcon column={col.key} />
              <span className="text-[11.5px] font-medium leading-[14px] text-[#15181E]">{col.label}</span>
            </div>
          ))}
        </div>

        <div className="flex min-h-0 flex-col overflow-y-auto">
          {ADMIN_USERS.map((user) => (
            <div
              key={user.username}
              className="flex h-[52px] shrink-0 items-center border-b border-[#EFF0F3] last:border-b-0 hover:bg-[#FBFBFC]"
            >
              {COLUMNS.map((col, i) => (
                <div
                  key={col.key}
                  className={`flex h-[34px] shrink-0 items-center px-3.5 ${col.width} ${
                    i < COLUMNS.length - 1 ? "border-r border-[#EFF0F3]" : ""
                  }`}
                >
                  <span
                    className={`text-[12.5px] leading-4 text-[#15181E] ${
                      col.key === "username" ? "font-medium" : ""
                    }`}
                  >
                    {user[col.key]}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex w-[1263px] shrink-0 items-center justify-end">
        <div className="flex items-center gap-1">
          <button type="button" disabled className="flex h-8 items-center gap-1.5 rounded-lg pr-3 pl-2.5 opacity-40">
            <svg width="14" height="14" viewBox="0 0 16 16" className="shrink-0">
              <path d="M10 3.5L5.5 8L10 12.5" fill="none" stroke="#15181E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[12.5px] font-medium leading-4 text-[#15181E]">Previous</span>
          </button>
          {[1, 2, 3].map((page) => (
            <button
              key={page}
              type="button"
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[12.5px] leading-4 ${
                page === 1
                  ? "bg-[#15181E] font-semibold text-white"
                  : "bg-white font-medium text-[#15181E] hover:bg-[#F5F6F8]"
              }`}
            >
              {page}
            </button>
          ))}
          <button type="button" className="flex h-8 items-center gap-1.5 rounded-lg pr-2.5 pl-3 hover:bg-[#F5F6F8]">
            <span className="text-[12.5px] font-medium leading-4 text-[#15181E]">Next</span>
            <svg width="14" height="14" viewBox="0 0 16 16" className="shrink-0">
              <path d="M6 3.5L10.5 8L6 12.5" fill="none" stroke="#15181E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
