/** Mini mockups inside each Page 3 feature cell. */

const sans = "var(--font-sans)";
const display = "var(--font-display)";

/* 01 — Chat with guardrails */
export function GuardrailChat() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        style={{
          alignSelf: "flex-end",
          maxWidth: 220,
          background: "#EDEDEA",
          borderRadius: 10,
          padding: "10px 14px",
          fontFamily: sans,
          fontSize: 13,
          lineHeight: "19px",
          color: "#1A1A1A",
        }}
      >
        Write my HIST 210 response paper
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: 3,
            background: "#1F1E1C",
          }}
        />
        <p
          style={{
            margin: 0,
            fontFamily: sans,
            fontSize: 13,
            lineHeight: "19px",
            color: "#1A1A1A",
          }}
        >
          I can&apos;t draft something you&apos;ll submit as your own work. I can
          outline the topics to cover and pressure-test your argument once
          you&apos;ve written it.
        </p>
        <div
          style={{
            alignSelf: "flex-start",
            display: "flex",
            alignItems: "center",
            gap: 6,
            border: "1px solid #E0E0DC",
            borderRadius: 999,
            padding: "5px 11px",
            background: "#fff",
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3Z"
              stroke="#6B6B6B"
              strokeWidth="2"
            />
          </svg>
          <span style={{ fontFamily: sans, fontSize: 11, color: "#4A4A4A" }}>
            Course AI guidelines
          </span>
        </div>
      </div>
    </div>
  );
}

/* 02 — Documents that answer back */
export function DocumentsVisual() {
  return (
    <div style={{ position: "relative", height: 235 }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 158,
          background: "#fff",
          borderRadius: 8,
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 9,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span
            style={{
              fontFamily: sans,
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.06em",
              color: "#8A8A85",
            }}
          >
            DRAFT
          </span>
          <span style={{ fontFamily: sans, fontSize: 9, color: "#A5A5A0" }}>
            HIST 210 · due Friday
          </span>
        </div>
        <h4
          style={{
            margin: 0,
            fontFamily: display,
            fontSize: 15,
            fontWeight: 600,
            lineHeight: "20px",
            color: "#0A0A0A",
          }}
        >
          The Marshall Plan and the limits of postwar generosity
        </h4>
        <p
          style={{
            margin: 0,
            fontFamily: display,
            fontSize: 10.5,
            lineHeight: "16px",
            color: "#6B6B66",
          }}
        >
          American factories had spent four years building for a war that had
          ended.
        </p>
        <p
          style={{
            margin: 0,
            background: "#EFE7D2",
            borderRadius: 3,
            padding: "5px 6px",
            fontFamily: display,
            fontSize: 10.5,
            lineHeight: "16px",
            color: "#3A3A34",
          }}
        >
          The plan&apos;s conditions mattered more than its dollars.
        </p>
      </div>

      <div
        style={{
          position: "absolute",
          right: 0,
          top: 42,
          width: 160,
          background: "#fff",
          borderRadius: 8,
          boxShadow: "0 4px 14px 0 rgba(0,0,0,0.07)",
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div
          style={{
            borderLeft: "2px solid #D8C89A",
            paddingLeft: 8,
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          <span
            style={{
              fontFamily: sans,
              fontSize: 8,
              fontWeight: 600,
              letterSpacing: "0.06em",
              color: "#9A9A94",
            }}
          >
            SELECTED
          </span>
          <span
            style={{
              fontFamily: sans,
              fontSize: 10,
              lineHeight: "14px",
              color: "#4A4A44",
            }}
          >
            The plan&apos;s conditions mattered…
          </span>
        </div>
        <p
          style={{
            margin: 0,
            fontFamily: sans,
            fontSize: 11,
            lineHeight: "17px",
            color: "#1A1A1A",
          }}
        >
          Interpretive claim — attribute it to Hogan and it gets stronger.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"
              stroke="#9A9A94"
              strokeWidth="2"
            />
          </svg>
          <span style={{ fontFamily: sans, fontSize: 9.5, color: "#8A8A85" }}>
            Hogan, ch. 3 — p. 88
          </span>
        </div>
      </div>
    </div>
  );
}

/* 03 — Skills you write yourself */
export function SkillsVisual() {
  const rows = [
    { cmd: "/simplify", desc: "Retell that in plain words", tag: null },
    { cmd: "/diagram", desc: "Turn the reply into a diagram", tag: null },
    { cmd: "/lab", desc: "Check my methods section", tag: "YOURS" },
  ];
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 8,
        boxShadow: "0 4px 14px 0 rgba(0,0,0,0.07)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "11px 14px",
          borderBottom: "1px solid #EFEFED",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 12,
          color: "#A5A5A0",
        }}
      >
        /skill
      </div>
      {rows.map((r, i) => (
        <div
          key={r.cmd}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "9px 14px",
            background: i === 0 ? "#F5F5F3" : "#fff",
          }}
        >
          <span
            style={{
              width: 62,
              flexShrink: 0,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 11.5,
              color: "#0A0A0A",
            }}
          >
            {r.cmd}
          </span>
          <span
            style={{
              flex: 1,
              minWidth: 0,
              fontFamily: sans,
              fontSize: 11.5,
              color: "#9A9A98",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {r.desc}
          </span>
          <span
            style={{
              width: 34,
              flexShrink: 0,
              textAlign: "right",
              fontFamily: sans,
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.05em",
              color: "#B08A4A",
            }}
          >
            {r.tag ?? ""}
          </span>
        </div>
      ))}
    </div>
  );
}

/* 04 — Every deadline, one grid */
export function CalendarVisual() {
  const days = ["MON", "TUE", "WED", "THU", "FRI"];
  const cells: {
    n: number;
    chips: { label: string; dark?: boolean; plain?: boolean }[];
  }[][] = [
    [
      { n: 1, chips: [{ label: "CHEM 122" }] },
      { n: 2, chips: [{ label: "Vocab quiz", dark: true }] },
      { n: 3, chips: [{ label: "STAT 140" }] },
      { n: 4, chips: [{ label: "Pset 7", dark: true }, { label: "2h 45m", plain: true }] },
      { n: 5, chips: [{ label: "CHEM 122" }] },
    ],
    [
      { n: 8, chips: [{ label: "CHEM 122" }] },
      { n: 9, chips: [{ label: "Response 4", dark: true }] },
      { n: 10, chips: [{ label: "Office hrs", plain: true }] },
      { n: 11, chips: [{ label: "Review", plain: true }] },
      { n: 12, chips: [{ label: "Midterm", dark: true }] },
    ],
  ];

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 8,
        border: "1px solid #EDEDEB",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex" }}>
        {days.map((d) => (
          <div
            key={d}
            style={{
              flex: 1,
              padding: "7px 0",
              textAlign: "center",
              fontFamily: sans,
              fontSize: 8.5,
              letterSpacing: "0.08em",
              color: "#A5A5A0",
            }}
          >
            {d}
          </div>
        ))}
      </div>
      {cells.map((week, wi) => (
        <div key={wi} style={{ display: "flex", borderTop: "1px solid #EFEFED" }}>
          {week.map((cell) => (
            <div
              key={cell.n}
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: 46,
                borderLeft: "1px solid #EFEFED",
                padding: 4,
                display: "flex",
                flexDirection: "column",
                gap: 3,
              }}
            >
              <span style={{ fontFamily: sans, fontSize: 8, color: "#B5B5B0" }}>
                {cell.n}
              </span>
              {cell.chips.map((c) => (
                <span
                  key={c.label}
                  style={{
                    borderRadius: 3,
                    padding: "2px 4px",
                    fontFamily: sans,
                    fontSize: 7.5,
                    lineHeight: "11px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    background: c.dark ? "#1F1E1C" : c.plain ? "#fff" : "#F0F0EE",
                    border: c.plain ? "1px solid #E4E4E1" : undefined,
                    color: c.dark ? "#fff" : "#4A4A46",
                  }}
                >
                  {c.label}
                </span>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* 05 — A planner that nests */
export function PlannerVisual() {
  const rows = [
    { id: "LMS-11", text: "Organic chemistry midterm prep", meta: "3/7", due: "Aug 12", dot: "#D9A441" },
    { id: "LMS-12", text: "Rewatch carbonyl lectures", done: true, dot: "#4A9A5E" },
    { id: "LMS-13", text: "Build reaction map flashcards", tag: "CHEM 122", dot: "#D9A441" },
    { id: "LMS-16", text: "Draw 10 worked mechanisms", dot: "#C8C8C4" },
  ];
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 8,
        border: "1px solid #EDEDEB",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "9px 12px",
          borderBottom: "1px solid #EFEFED",
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: 4,
            border: "1.5px solid #D9A441",
          }}
        />
        <span style={{ flex: 1, fontFamily: sans, fontSize: 11, color: "#1A1A1A" }}>
          In Progress
        </span>
        <span style={{ fontFamily: sans, fontSize: 10, color: "#A5A5A0" }}>3</span>
      </div>
      {rows.map((r) => (
        <div
          key={r.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "8px 12px",
            borderTop: "1px solid #F4F4F2",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              flexShrink: 0,
              borderRadius: 4,
              background: r.done ? r.dot : "transparent",
              border: r.done ? undefined : `1.5px solid ${r.dot}`,
            }}
          />
          <span
            style={{
              width: 40,
              flexShrink: 0,
              fontFamily: sans,
              fontSize: 9,
              color: "#B0B0AC",
            }}
          >
            {r.id}
          </span>
          <span
            style={{
              flex: 1,
              minWidth: 0,
              fontFamily: sans,
              fontSize: 10.5,
              color: r.done ? "#B0B0AC" : "#1A1A1A",
              textDecoration: r.done ? "line-through" : undefined,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {r.text}
          </span>
          {r.tag ? (
            <span
              style={{
                flexShrink: 0,
                background: "#F0F0EE",
                borderRadius: 3,
                padding: "2px 5px",
                fontFamily: sans,
                fontSize: 8.5,
                color: "#5A5A55",
              }}
            >
              {r.tag}
            </span>
          ) : null}
          <span
            style={{
              width: 22,
              flexShrink: 0,
              textAlign: "right",
              fontFamily: sans,
              fontSize: 9,
              color: "#B0B0AC",
            }}
          >
            {r.meta ?? ""}
          </span>
          <span
            style={{
              width: 34,
              flexShrink: 0,
              textAlign: "right",
              fontFamily: sans,
              fontSize: 9,
              color: "#B0B0AC",
            }}
          >
            {r.due ?? ""}
          </span>
        </div>
      ))}
    </div>
  );
}

/* 06 — It reads your syllabus */
export function SyllabusVisual() {
  const courses = [
    {
      code: "CHEM 122",
      term: "Fall 2026",
      title: "Organic Chemistry II",
      prof: "Prof. Nadia Farouk",
      when: "MWF · 10:00–10:50 AM",
    },
    {
      code: "GOV 201",
      term: "Fall 2026",
      title: "Comparative Institutions",
      prof: "Prof. Elena Vasquez",
      when: "Th · 3:00–5:30 PM",
    },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {courses.map((c) => (
        <div
          key={c.code}
          style={{
            background: "#fff",
            border: "1px solid #EDEDEB",
            borderRadius: 8,
            padding: 14,
            display: "flex",
            flexDirection: "column",
            gap: 5,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontFamily: sans,
                fontSize: 10.5,
                fontWeight: 600,
                color: "#0A0A0A",
              }}
            >
              {c.code}
            </span>
            <span style={{ fontFamily: sans, fontSize: 10, color: "#A5A5A0" }}>
              {c.term}
            </span>
          </div>
          <span
            style={{
              fontFamily: display,
              fontSize: 15,
              fontWeight: 500,
              lineHeight: "20px",
              color: "#0A0A0A",
            }}
          >
            {c.title}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: sans, fontSize: 10, color: "#8A8A85" }}>
              {c.prof}
            </span>
            <span style={{ fontFamily: sans, fontSize: 10, color: "#C5C5C0" }}>
              ·
            </span>
            <span style={{ fontFamily: sans, fontSize: 10, color: "#8A8A85" }}>
              {c.when}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
