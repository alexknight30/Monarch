"use client";

import { useEffect, useRef, useSyncExternalStore, type CSSProperties } from "react";

/** Never seek earlier than this after the intro — butterflies are gone. */
const CUTOFF = 12;
/** Crossfade length. Incoming fades up on top; outgoing stays opaque. */
const LOOP_FADE = 0.9;
const FRAME = 1 / 24;
const HERO_SRC = "/hero-meadow.mp4?v=6";
const MOBILE_LOOP_SRC = "/hero-meadow-loop.mp4?v=1";
const MOBILE_QUERY = "(max-width: 767px)";

function subscribeMobile(onChange: () => void) {
  const query = window.matchMedia(MOBILE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const getMobileSnapshot = () => window.matchMedia(MOBILE_QUERY).matches;
const getServerMobileSnapshot = () => false;

const VIDEO_FILL: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  objectPosition: "var(--hero-position, center center)",
};

function setLayer(
  el: HTMLVideoElement,
  { opacity, z }: { opacity: number; z: number },
) {
  el.style.opacity = String(opacity);
  el.style.zIndex = String(z);
}

/** Hero — one take, then a same-file crossfade loop of the meadow. */
export function Hero() {
  const isMobile = useSyncExternalStore(
    subscribeMobile,
    getMobileSnapshot,
    getServerMobileSnapshot,
  );
  const aRef = useRef<HTMLVideoElement>(null);
  const bRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const a = aRef.current;
    const b = bRef.current;
    if (!a) return;

    if (!b) return;

    // Play the butterfly intro once, then hand off to Safari's native meadow loop.
    // Keep the intro's final frame visible until the loop is actually playing.
    if (isMobile) {
      const revealLoop = () => {
        setLayer(b, { opacity: 1, z: 1 });
        setLayer(a, { opacity: 0, z: 0 });
        a.pause();
      };
      const startLoop = () => {
        void b.play().catch(() => {});
      };
      setLayer(a, { opacity: 1, z: 0 });
      setLayer(b, { opacity: 0, z: 0 });
      b.addEventListener("playing", revealLoop);
      a.addEventListener("ended", startLoop);
      if (a.ended) startLoop();
      else void a.play().catch(() => {});
      return () => {
        a.removeEventListener("ended", startLoop);
        b.removeEventListener("playing", revealLoop);
        a.pause();
        b.pause();
      };
    }

    let front = a;
    let back = b;
    let fading = false;
    let alive = true;
    let rafId = 0;
    let clearPendingSeek: (() => void) | undefined;

    const play = (el: HTMLVideoElement) => {
      void el.play().catch(() => {
        void el.play().catch(() => {});
      });
    };

    const prepareBack = () => {
      back.pause();
      setLayer(back, { opacity: 0, z: 0 });
      const seek = () => {
        if (Math.abs(back.currentTime - CUTOFF) > FRAME) {
          back.currentTime = CUTOFF;
        }
      };
      clearPendingSeek?.();
      if (back.readyState >= 1) seek();
      else {
        const pendingVideo = back;
        pendingVideo.addEventListener("loadedmetadata", seek, { once: true });
        clearPendingSeek = () => pendingVideo.removeEventListener("loadedmetadata", seek);
      }
    };

    const startIncoming = () => {
      if (Math.abs(back.currentTime - CUTOFF) > 0.2) {
        back.currentTime = CUTOFF;
      }
      setLayer(back, { opacity: 0, z: 1 });
      play(back);
    };

    let swapping = false;
    const finishSwap = () => {
      if (swapping) return;
      swapping = true;
      front.pause();
      setLayer(front, { opacity: 0, z: 0 });
      setLayer(back, { opacity: 1, z: 0 });
      const outgoing = front;
      front = back;
      back = outgoing;
      fading = false;
      play(front);
      prepareBack();
      swapping = false;
    };

    setLayer(a, { opacity: 1, z: 0 });
    setLayer(b, { opacity: 0, z: 0 });
    prepareBack();
    play(a);

    const step = () => {
      const dur = front.duration;
      if (!dur || !Number.isFinite(dur)) return;

      // Finish the blend before `ended`, so the playing copy never stalls.
      const fadeStart = dur - LOOP_FADE - 0.2;
      const t = front.currentTime;
      const atEnd = front.ended || t >= dur - 0.05;

      if (!fading && t >= fadeStart && t >= CUTOFF) {
        fading = true;
        startIncoming();
      }

      if (fading) {
        const p = atEnd
          ? 1
          : Math.min(1, Math.max(0, (t - fadeStart) / LOOP_FADE));
        setLayer(front, { opacity: 1, z: 0 });
        setLayer(back, { opacity: p, z: 1 });
        if (p >= 1) finishSwap();
      } else if (atEnd && t >= CUTOFF) {
        fading = true;
        startIncoming();
        finishSwap();
      }
    };

    const loop = () => {
      if (!alive) return;
      step();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    const onEnded = (event: Event) => {
      if (event.target !== front) return;
      if (!fading) {
        fading = true;
        startIncoming();
      }
      finishSwap();
    };
    a.addEventListener("ended", onEnded);
    b.addEventListener("ended", onEnded);

    return () => {
      alive = false;
      cancelAnimationFrame(rafId);
      clearPendingSeek?.();
      a.pause();
      b.pause();
      a.removeEventListener("ended", onEnded);
      b.removeEventListener("ended", onEnded);
    };
  }, [isMobile]);

  return (
    <section
      className="site-hero"
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        background: "#0a0a0a",
        overflow: "clip",
      }}
    >
      <video
        ref={aRef}
        src={HERO_SRC}
        autoPlay
        muted
        playsInline
        preload="auto"
        poster="/hero-meadow.png?v=4"
        style={VIDEO_FILL}
      />
      <video
        ref={bRef}
        src={isMobile ? MOBILE_LOOP_SRC : `${HERO_SRC}&p=b`}
        loop={isMobile}
        muted
        playsInline
        preload="auto"
        style={{ ...VIDEO_FILL, opacity: 0 }}
      />

      <h1
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "calc(8.9% + 12px)",
          width: "100%",
          margin: 0,
          zIndex: 2,
          textAlign: "center",
          fontFamily: "var(--font-display)",
          fontSize: 50,
          fontWeight: 500,
          lineHeight: "60px",
          color: "#ffffff",
        }}
      >
        You&apos;re getting dumber.
      </h1>

      <p
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "calc(54% + 12px)",
          width: "100%",
          margin: 0,
          zIndex: 2,
          textAlign: "center",
          fontFamily: "var(--font-display)",
          fontSize: 48,
          fontWeight: 500,
          lineHeight: "58px",
          color: "#ffffff",
        }}
      >
        Monarch gives AI guardrails,
        <br />
        so you can keep learning.
      </p>
    </section>
  );
}
