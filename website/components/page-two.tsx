import { DashboardMock } from "./dashboard-mock";
import { SCHOOLS } from "./school-marks";

/** Page 2 — ported from the "Page 2" artboard (1440×900). */
const VIDEO_W = 1200;
const VIDEO_H = 675;
const VIDEO_LEFT = (1440 - VIDEO_W) / 2;
const VIDEO_TOP = 90;
const MOCK_SCALE = VIDEO_W / 960;
const PLAY = 72;
const SCHOOLS_TOP = VIDEO_TOP + VIDEO_H + 44;

export function PageTwo() {
  return (
    <section
      style={{
        position: "relative",
        width: 1440,
        height: 900,
        background: "#ffffff",
        overflow: "clip",
      }}
    >
      <h2
        style={{
          position: "absolute",
          left: 240,
          top: 28,
          width: 960,
          margin: 0,
          textAlign: "center",
          fontFamily: "var(--font-display)",
          fontSize: 40,
          fontWeight: 500,
          lineHeight: "48px",
          letterSpacing: "-0.02em",
          color: "#0A0A0A",
        }}
      >
        AI that works with you, not for you.
      </h2>

      <div
        style={{
          position: "absolute",
          left: VIDEO_LEFT,
          top: VIDEO_TOP,
          width: VIDEO_W,
          height: VIDEO_H,
          borderRadius: 14,
          border: "1px solid #E6E6E6",
          overflow: "hidden",
          background: "#F4F4F5",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 960,
            transform: `scale(${MOCK_SCALE})`,
            transformOrigin: "top left",
          }}
        >
          <DashboardMock />
        </div>

        <button
          type="button"
          aria-label="Play video"
          style={{
            position: "absolute",
            left: (VIDEO_W - PLAY) / 2,
            top: (VIDEO_H - PLAY) / 2,
            width: PLAY,
            height: PLAY,
            borderRadius: PLAY / 2,
            background: "#0A0A0A",
            boxShadow: "0 8px 24px 0 rgba(0,0,0,0.28)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="21"
            height="24"
            viewBox="0 0 26 30"
            style={{ marginLeft: 4 }}
            aria-hidden
          >
            <path
              d="M25 13.27a2 2 0 0 1 0 3.46L3 29.4A2 2 0 0 1 0 27.67V2.33A2 2 0 0 1 3 .6l22 12.67Z"
              fill="#ffffff"
            />
          </svg>
        </button>
      </div>

      <div
        style={{
          position: "absolute",
          left: VIDEO_LEFT,
          top: SCHOOLS_TOP,
          width: VIDEO_W,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        {SCHOOLS.map((school) => (
            <div
              key={school.name}
              style={{
                display: "flex",
                width: 96,
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 40,
                  height: 40,
                }}
              >
                <img
                  src={school.src}
                  alt=""
                  style={{
                    width: 40,
                    height: 40,
                    objectFit: "contain",
                    objectPosition: "center",
                  }}
                />
              </span>
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: "0.04em",
                  lineHeight: "13px",
                  textAlign: "center",
                  textTransform: "uppercase",
                  color: "#8A8A8A",
                }}
              >
                {school.name}
              </span>
            </div>
          ))}
      </div>
    </section>
  );
}
