"use client";

import { useRouter } from "next/navigation";
import { AIChatInput } from "@/components/ui/ai-chat-input";
import { CURRENT_USER, HOME_STATS, QUICK_ACTIONS } from "@/lib/mock-data";

const iconProps = {
  fill: "none",
  stroke: "#3D3D3D",
  strokeWidth: 1.7,
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
          <rect x="3" y="3" width="18" height="18" rx="4" {...iconProps} />
          <path d="M3 14h4l1.5 2.5h7L17 14h4" {...iconProps} />
        </svg>
      );
  }
}

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="flex flex-1 flex-col items-center pt-[88px] pb-16">
      {/* Greeting */}
      <div className="flex flex-col items-center gap-3.5">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-[40px] leading-[48px] tracking-[-0.015em] text-[#0A0A0A]">
            Good afternoon,
          </h1>
          <span className="font-display text-[40px] leading-[48px] tracking-[-0.015em] text-[#A0A0A0]">
            {CURRENT_USER.firstName}
          </span>
        </div>
        <p className="text-sm leading-5 text-[#6B6B6B]">What are we working on today?</p>
      </div>

      {/* Carousel dots */}
      <div className="flex items-center gap-[7px] pt-[26px] pb-10">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`h-0.5 w-[17px] shrink-0 rounded-sm ${i === 3 ? "bg-[#9A9A9A]" : "bg-[#E2E2E2]"}`}
          />
        ))}
      </div>

      {/* Composer */}
      <div className="w-[732px]">
        <AIChatInput
          onSubmit={(value) =>
            router.push(`/chat?q=${encodeURIComponent(value)}`)
          }
        />
      </div>

      {/* Quick actions */}
      <div className="flex items-center justify-center gap-3 pt-11">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            type="button"
            className="flex h-[34px] items-center gap-[7px] rounded-md border border-[#E6E6E6] bg-white px-3 transition-colors hover:bg-[#FAFAFA]"
          >
            <ActionIcon name={action.icon} />
            <span className="text-[13px] leading-4 text-[#1A1A1A]">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid w-[732px] grid-cols-3 gap-3 pt-12">
        {HOME_STATS.map((stat) => (
          <div
            key={stat.label}
            className="flex h-25 flex-col justify-between rounded-md border border-[#E6E6E6] bg-white p-[15px]"
          >
            <span className="text-[13px] leading-4 text-[#5E5E5E]">{stat.label}</span>
            <div className="flex items-baseline gap-1.5">
              <span
                className={`shrink-0 text-[22px] font-medium leading-7 tracking-[-0.02em] ${
                  stat.muted ? "text-[#C4C4C4]" : "text-[#0A0A0A]"
                }`}
              >
                {stat.value}
              </span>
              <span className="text-xs leading-4 text-[#7A7A7A]">{stat.note}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
