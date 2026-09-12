import {
  GuardrailChat,
  DocumentsVisual,
  SkillsVisual,
  CalendarVisual,
  PlannerVisual,
  SyllabusVisual,
} from "./feature-visuals";

/** Page 3 — ported from the "Page 3 — Features" artboard (1440×1318). */

const FEATURES = [
  {
    title: "Chat with guardrails",
    body: "Monarch follows the same academic-integrity rules your professors do. It won't write the assignment, and it says so — then helps you get there yourself.",
    Visual: GuardrailChat,
  },
  {
    title: "Documents that answer back",
    body: "Write in Monarch and ask about what you've written. Highlight a passage and it will tell you where the argument is thin — and which assigned reading backs it up.",
    Visual: DocumentsVisual,
  },
  {
    title: "Skills you write yourself",
    body: "Teach Monarch the moves you repeat. Save an instruction once, then call it with a slash command in any chat — alongside the built-ins.",
    Visual: SkillsVisual,
  },
  {
    title: "Every deadline, one grid",
    body: "Courses, office hours, due dates, and the hours you actually logged — pulled from your syllabi and laid out on one month.",
    Visual: CalendarVisual,
  },
  {
    title: "A planner that nests",
    body: 'Break "midterm prep" into the twelve things it actually is. Sub-tasks go as deep as the work does, and Monarch can add them for you from chat.',
    Visual: PlannerVisual,
  },
  {
    title: "It reads your syllabus",
    body: "Upload the PDF once. Monarch pulls out the meeting times, the grading policy, and every due date — and that's what everything else runs on.",
    Visual: SyllabusVisual,
  },
];

const DASHED = "1px dashed #E2E2E2";

export function PageThree() {
  return (
    <section
      style={{
        position: "relative",
        width: 1440,
        minHeight: 1318,
        background: "#ffffff",
        paddingInline: 80,
        paddingTop: 46,
        paddingBottom: 60,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: 1280,
          gap: 16,
          paddingTop: 80,
          paddingBottom: 54,
        }}
      >
        <h2
          style={{
            width: 820,
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: 52,
            fontWeight: 500,
            lineHeight: "60px",
            letterSpacing: "-0.02em",
            color: "#0A0A0A",
          }}
        >
          Built for how you actually study.
        </h2>
        <p
          style={{
            width: 660,
            margin: 0,
            fontFamily: "var(--font-sans)",
            fontSize: 18,
            lineHeight: "28px",
            color: "#52525B",
          }}
        >
          Six things Monarch does that a general-purpose chatbot can&apos;t —
          because it knows your courses, your deadlines, and the rules your
          professors set.
        </p>
      </div>

      {[0, 1].map((row) => (
        <div
          key={row}
          style={{
            display: "flex",
            width: 1280,
            borderTop: DASHED,
            borderBottom: row === 1 ? DASHED : undefined,
          }}
        >
          {FEATURES.slice(row * 3, row * 3 + 3).map(
            ({ title, body, Visual }, i) => (
              <div
                key={title}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: i === 2 ? 426 : 427,
                  flexShrink: 0,
                  paddingTop: 14,
                  paddingBottom: 46,
                  paddingInline: 30,
                  borderLeft: DASHED,
                  borderRight: i === 2 ? DASHED : undefined,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    width: 367,
                    height: 250,
                    flexShrink: 0,
                    marginTop: 18,
                    padding: 22,
                    borderRadius: 10,
                    gap: 12,
                    background: "#F7F7F5",
                    overflow: "hidden",
                  }}
                >
                  <Visual />
                </div>

                <h3
                  style={{
                    margin: 0,
                    paddingTop: 26,
                    paddingBottom: 12,
                    fontFamily: "var(--font-display)",
                    fontSize: 23,
                    fontWeight: 600,
                    lineHeight: "30px",
                    letterSpacing: "-0.01em",
                    color: "#0A0A0A",
                  }}
                >
                  {title}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-sans)",
                    fontSize: 14.5,
                    lineHeight: "23px",
                    color: "#52525B",
                  }}
                >
                  {body}
                </p>
              </div>
            ),
          )}
        </div>
      ))}
    </section>
  );
}
