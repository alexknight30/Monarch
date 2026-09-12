"use client";

import { useEffect, useRef, useState } from "react";
import {
  SHAPE_COUNT,
  SHAPE_PATHS,
  SHAPE_VIEWBOX,
  buildMorphPath,
} from "@/lib/loader-shapes";

/** Pause on each shape so it reads before the next morph starts. */
const HOLD_MS = 180;
const MORPH_MS = 420;
const STEP_MS = HOLD_MS + MORPH_MS;

/** Guards against a huge time jump when a backgrounded tab comes back. */
const MAX_FRAME_MS = 100;

/**
 * C2-continuous ease: velocity *and* acceleration both reach zero at each end,
 * so the outline settles into a shape and leaves it without a visible kick.
 * Plain ease-in-out only zeroes velocity, which reads as a faint stutter.
 */
const smootherstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

type ThinkingMarkProps = {
  /**
   * Rendered size in px. The family sits in a 140 viewBox — padding the mark's
   * own 100 units leaves room for the wider triangle and trapezoid — so 24px
   * here puts ~17px of ink on screen, matching the static 17px MonarchMark.
   */
  size?: number;
  className?: string;
};

/**
 * The Monarch mark, cycling through the loader shape family while a reply is
 * pending. Frames write straight to the path node — React state at 60fps would
 * re-render the tree every frame for no benefit.
 */
export function ThinkingMark({ size = 24, className }: ThinkingMarkProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const el = pathRef.current;
    if (reduced || !el) return;

    let raf = 0;
    let last = 0;
    let clock = 0;

    const frame = (now: number) => {
      if (last) clock += Math.min(now - last, MAX_FRAME_MS);
      last = now;

      const index = Math.floor(clock / STEP_MS) % SHAPE_COUNT;
      const within = clock % STEP_MS;
      const t =
        within <= HOLD_MS ? 0 : smootherstep((within - HOLD_MS) / MORPH_MS);

      el.setAttribute("d", buildMorphPath(index, (index + 1) % SHAPE_COUNT, t));
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${SHAPE_VIEWBOX} ${SHAPE_VIEWBOX}`}
      className={className ? `shrink-0 ${className}` : "shrink-0"}
      aria-hidden="true"
    >
      <path
        ref={pathRef}
        fillRule="evenodd"
        clipRule="evenodd"
        fill="#1F1E1C"
        d={SHAPE_PATHS[0]}
      />
    </svg>
  );
}
