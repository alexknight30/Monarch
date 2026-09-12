"use client";

import { useEffect, useState } from "react";

export const DESIGN_WIDTH = 1440;
/** The hero/page-2 artboards are 900 tall — a full screen in the design. */
export const DESIGN_VIEWPORT_HEIGHT = 900;

/**
 * One scale for the whole page, so every section stays the same width.
 * Fits both axes: a short window shrinks the design rather than clipping
 * the bottom of the hero. Capped at 1 — it never scales up.
 */
export function usePageScale() {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const update = () =>
      setScale(
        Math.min(
          1,
          window.innerWidth / DESIGN_WIDTH,
          window.innerHeight / DESIGN_VIEWPORT_HEIGHT,
        ),
      );
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return scale;
}

/** Scale a 1440 artboard to the window width — edge to edge, including scale-up. */
export function useWidthScale() {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const update = () => setScale(window.innerWidth / DESIGN_WIDTH);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return scale;
}
