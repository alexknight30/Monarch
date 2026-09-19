"use client";

import { useEffect, useState } from "react";
import { Wordmark } from "./wordmark";
import { DESIGN_VIEWPORT_HEIGHT, useWidthScale } from "./use-page-scale";

/** Same design-space origin as the hero lockup. */
const LEFT = 63;
const TOP = 28;
const MARK_HEIGHT = 34;
const CTA_HEIGHT = 40;
/** Vertically center the 40px button on the 34px wordmark. */
const CTA_TOP = TOP + (MARK_HEIGHT - CTA_HEIGHT) / 2;

/** Fixed logo — stays put while the page scrolls, flips dark past the hero. */
export function PinnedWordmark() {
  const scale = useWidthScale();
  const [onHero, setOnHero] = useState(true);

  useEffect(() => {
    const update = () => {
      const hero = document.getElementById("site-hero");
      if (!hero) {
        setOnHero(window.scrollY < DESIGN_VIEWPORT_HEIGHT * scale);
        return;
      }
      const bottom = hero.getBoundingClientRect().bottom;
      setOnHero(bottom > (TOP + MARK_HEIGHT) * scale);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [scale]);

  return (
    <>
      <div
        style={{
          position: "fixed",
          left: LEFT * scale,
          top: TOP * scale,
          zIndex: 50,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          color: onHero ? "#FFFFFF" : "#0a0a0a",
          transition: "color 180ms ease",
          pointerEvents: "none",
        }}
      >
        <Wordmark tone="inherit" />
      </div>

      <a
        href="https://app.monarch.education"
        style={{
          position: "fixed",
          right: LEFT * scale,
          top: CTA_TOP * scale,
          zIndex: 50,
          transform: `scale(${scale})`,
          transformOrigin: "top right",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          height: CTA_HEIGHT,
          padding: "0 20px",
          border: 0,
          borderRadius: 8,
          background: "#141414",
          color: "#FFFFFF",
          fontFamily: "var(--font-sans)",
          fontSize: 14,
          fontWeight: 500,
          lineHeight: "18px",
          cursor: "pointer",
          textDecoration: "none",
          transition: "background-color 160ms ease",
        }}
        onMouseEnter={(event) => {
          event.currentTarget.style.background = "#000000";
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.background = "#141414";
        }}
      >
        Start Now
      </a>
    </>
  );
}
