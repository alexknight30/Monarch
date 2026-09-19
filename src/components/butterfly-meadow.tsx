"use client";

import { useEffect, useRef } from "react";
import { CONFIG, Scene } from "../../animations/butterfly-meadow/scene.js";

/**
 * The butterfly-meadow canvas, sized to its container. Same scene as the
 * standalone preview — looping side-scroll with a fixed-position butterfly.
 */
export function ButterflyMeadow({ className }: { className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scene = new Scene();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const prevScale = CONFIG.butterflyScale;
    const prevFlightX = CONFIG.flightX;
    CONFIG.butterflyScale = 1.35;
    CONFIG.flightX = 0.38;

    let raf = 0;
    let last = 0;

    const applySize = () => {
      const width = wrap.clientWidth;
      const height = wrap.clientHeight;
      if (width < 2 || height < 2) return false;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const backingWidth = Math.round(width * dpr);
      const backingHeight = Math.round(height * dpr);

      if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
        canvas.width = backingWidth;
        canvas.height = backingHeight;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scene.resize(width, height);
      return true;
    };

    function frame(now: number) {
      raf = requestAnimationFrame(frame);

      if (scene.width < 2 && !applySize()) {
        last = 0;
        return;
      }

      const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
      last = now;
      scene.update(dt);
      scene.draw(ctx);
    }

    function renderStatic() {
      if (!applySize()) return;
      scene.drawStatic(ctx);
    }

    function start() {
      cancelAnimationFrame(raf);
      last = 0;
      if (reduceMotion.matches) {
        renderStatic();
        return;
      }
      raf = requestAnimationFrame(frame);
    }

    const observer = new ResizeObserver(() => {
      if (reduceMotion.matches) renderStatic();
      else applySize();
    });
    observer.observe(wrap);
    reduceMotion.addEventListener("change", start);
    start();

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      reduceMotion.removeEventListener("change", start);
      CONFIG.butterflyScale = prevScale;
      CONFIG.flightX = prevFlightX;
    };
  }, []);

  return (
    <div data-design-id="m-00170aa13f21" ref={wrapRef} className={className}>
      <canvas data-design-id="m-0c15af7fc68c" ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
