import {
  IconAttach,
  IconMic,
  IconSend,
  IconGuide,
  IconSummarize,
  IconQuiz,
  IconClock,
  IconUpload,
  RailIcon,
} from "./icons";

/**
 * Static mock of the Monarch home screen, used as the video-player thumbnail.
 * Measurements come from src/app/page.tsx and
 * src/components/ui/ai-chat-input.tsx — 732px column, 68px composer.
 */

const QUICK_ACTIONS = [
  { label: "New study guide", Icon: IconGuide },
  { label: "Summarize reading", Icon: IconSummarize },
  { label: "Practice quiz", Icon: IconQuiz },
  { label: "Office hours", Icon: IconClock },
  { label: "Upload syllabus", Icon: IconUpload },
];

const STATS = [
  { label: "Assignments due", value: "4", meta: "this week" },
  { label: "Active courses", value: "5", meta: "Fall 2026" },
  { label: "Study streak", value: "12", meta: "days in a row" },
  { label: "Artifacts", value: "6", meta: "2 shared with you" },
  { label: "Office hours", value: "—", meta: "None booked" },
  { label: "Inbox", value: "3", meta: "To review" },
];

export function DashboardMock() {
  return (
    <div style={{ display: "flex", width: 960, height: 653, background: "#fff" }}>
      {/* Nav rail */}
      <div
        style={{
          width: 64,
          flexShrink: 0,
          borderRight: "1px solid #EFEFEF",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 18,
          gap: 18,
        }}
      >
        <svg width="26" height="26" viewBox="0 0 100 100" aria-hidden>
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.5 0H89.5C95.299 0 100 4.701 100 10.5V89.5C100 95.299 95.299 100 89.5 100H10.5C4.701 100 0 95.299 0 89.5V10.5C0 4.701 4.701 0 10.5 0ZM24 46V79.5C24 80.881 25.119 82 26.5 82H73.5C74.881 82 76 80.881 76 79.5V46C76 31.641 64.359 20 50 20C35.641 20 24 31.641 24 46Z"
            fill="#1F1E1C"
          />
        </svg>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            paddingTop: 6,
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <RailIcon key={i} index={i} active={i === 0} />
          ))}
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 88,
        }}
      >
        {/* Greeting */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 40,
                lineHeight: "48px",
                letterSpacing: "-0.015em",
                color: "#0A0A0A",
              }}
            >
              Good afternoon,
            </span>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 40,
                lineHeight: "48px",
                letterSpacing: "-0.015em",
                color: "#A0A0A0",
              }}
            >
              Alex
            </span>
          </div>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              lineHeight: "20px",
              color: "#6B6B6B",
            }}
          >
            What are we working on today?
          </p>
        </div>

        {/* Carousel dots */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            paddingTop: 26,
            paddingBottom: 40,
          }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              style={{
                height: 2,
                width: 17,
                flexShrink: 0,
                borderRadius: 2,
                background: i === 3 ? "#9A9A9A" : "#E2E2E2",
              }}
            />
          ))}
        </div>

        {/* Composer — AIChatInput, collapsed state */}
        <div
          style={{
            width: 732,
            height: 68,
            borderRadius: 32,
            background: "#ffffff",
            boxShadow: "0 2px 8px 0 rgba(0,0,0,0.08)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: 12,
          }}
        >
          <div style={iconButton}>
            <IconAttach />
          </div>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              paddingLeft: 4,
              fontFamily: "var(--font-sans)",
              fontSize: 16,
              lineHeight: "24px",
              color: "#9CA3AF",
            }}
          >
            Create a practice test
          </div>
          <div style={iconButton}>
            <IconMic />
          </div>
          <div
            style={{
              width: 42,
              height: 42,
              flexShrink: 0,
              borderRadius: 21,
              background: "#0A0A0A",
              opacity: 0.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconSend />
          </div>
        </div>

        {/* Quick actions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            paddingTop: 44,
          }}
        >
          {QUICK_ACTIONS.map(({ label, Icon }) => (
            <div
              key={label}
              style={{
                height: 34,
                display: "flex",
                alignItems: "center",
                gap: 7,
                borderRadius: 6,
                border: "1px solid #E6E6E6",
                background: "#fff",
                paddingInline: 12,
              }}
            >
              <Icon />
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  lineHeight: "16px",
                  color: "#1A1A1A",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div
          style={{
            width: 732,
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
            paddingTop: 48,
          }}
        >
          {STATS.map((stat) => (
            <div
              key={stat.label}
              style={{
                border: "1px solid #EDEDED",
                borderRadius: 8,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  lineHeight: "16px",
                  color: "#6B6B6B",
                }}
              >
                {stat.label}
              </span>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 24,
                    fontWeight: 500,
                    lineHeight: "28px",
                    color: "#0A0A0A",
                  }}
                >
                  {stat.value}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    lineHeight: "16px",
                    color: "#8B8B8B",
                  }}
                >
                  {stat.meta}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const iconButton: React.CSSProperties = {
  width: 44,
  height: 44,
  flexShrink: 0,
  borderRadius: 22,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
