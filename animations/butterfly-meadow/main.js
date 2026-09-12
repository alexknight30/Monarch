/**
 * Bootstrap: canvas sizing, the frame loop, and nothing else.
 *
 * The canvas is backed at device resolution and the context is scaled to CSS
 * pixels, so every coordinate in scene.js and sprites.js is a CSS pixel and the
 * graphite lines stay crisp on retina.
 *
 * Sizing comes from a ResizeObserver rather than the window resize event. A page
 * that loads inside a hidden or not-yet-laid-out container measures 0×0, and a
 * resize listener alone never fires to correct it — the animation would size
 * itself to nothing and stay that way. The observer picks up the real size
 * whenever it arrives.
 */

import { Scene } from "./scene.js";

const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d");
const scene = new Scene();
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let raf = 0;
let last = 0;

function measure() {
  const root = document.documentElement;
  const width = root.clientWidth || window.innerWidth || 0;
  const height = root.clientHeight || window.innerHeight || 0;
  return { width, height };
}

function applySize() {
  const { width, height } = measure();
  // Nothing to draw into yet — leave the loop running and wait for a real size.
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
}

function frame(now) {
  raf = requestAnimationFrame(frame);

  if (scene.width < 2 && !applySize()) {
    last = 0;
    return;
  }

  // Clamp: a backgrounded tab hands back a huge delta, which would teleport the
  // meadow and empty the contrail.
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
  last = now;

  scene.update(dt);
  scene.draw(ctx);
}

function render() {
  if (!applySize()) return;
  if (reduceMotion.matches) scene.drawStatic(ctx);
}

function start() {
  cancelAnimationFrame(raf);
  last = 0;

  if (reduceMotion.matches) {
    render();
    return;
  }
  raf = requestAnimationFrame(frame);
}

new ResizeObserver(() => {
  if (reduceMotion.matches) render();
  else applySize();
}).observe(document.documentElement);

reduceMotion.addEventListener("change", start);

start();
