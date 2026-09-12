/**
 * The scrolling meadow and the butterfly that rides above it.
 *
 * Endless-runner construction, the same shape as the Chrome dinosaur: the
 * butterfly holds a fixed screen x and the world slides left underneath it, so
 * forward motion is implied rather than travelled.
 *
 * Scenery lives in world coordinates and is recycled — items are spawned just
 * past the right edge and dropped once they clear the left, so there is no tile
 * boundary anywhere in the ground.
 */

import {
  INK,
  INK_FAINT,
  INK_SOFT,
  drawButterfly,
  drawFlower,
  drawGrassTuft,
  hash01,
  hashRange,
} from "./sprites.js";

export const CONFIG = {
  /** World px per second. Slow — the meadow drifts rather than races. */
  scrollSpeed: 66,
  /** Ground line as a fraction of canvas height. */
  groundRatio: 0.74,
  /** Butterfly's fixed screen x, as a fraction of canvas width. */
  flightX: 0.3,
  /** Wing beats per second. */
  flapHz: 4.6,
  butterflyScale: 1.7,
  /** Seconds of contrail kept behind the butterfly. */
  trailSeconds: 5.5,
  trailSampleMs: 26,
};

/**
 * Parallax bands. Distance is carried by speed, scale and ink weight together —
 * a far flower is smaller, paler and slower, all at once.
 */
const BANDS = [
  {
    speed: 0.42,
    gap: [80, 170],
    flowerHeight: [26, 44],
    flowerHead: [4.5, 6.5],
    grassSize: [10, 16],
    grassChance: 0.4,
    ink: INK_FAINT,
    lift: -6,
  },
  {
    speed: 1,
    gap: [95, 215],
    flowerHeight: [46, 96],
    flowerHead: [7.5, 12.5],
    grassSize: [14, 24],
    grassChance: 0.42,
    ink: INK,
    lift: 0,
  },
];

export class Scene {
  constructor() {
    this.width = 0;
    this.height = 0;
    this.groundY = 0;
    this.time = 0;
    this.scroll = 0;
    this.trail = [];
    this.trailClock = 0;
    this.bands = BANDS.map((band) => ({ ...band, items: [], nextX: 0 }));
    this.butterfly = { x: 0, y: 0, tilt: 0 };
    this.seedCounter = 0;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.groundY = Math.round(height * CONFIG.groundRatio);
    // Scenery is keyed to world position, so a resize only needs the spawner to
    // catch up with the new right edge; existing items stay where they are.
    for (const band of this.bands) {
      band.nextX = Math.min(band.nextX, this.scroll * band.speed + width + 240);
    }
    this.fill();
  }

  /** Spawn ahead of the right edge for every band. */
  fill() {
    for (const band of this.bands) {
      const limit = this.scroll * band.speed + this.width + 240;
      while (band.nextX < limit) {
        const seed = (this.seedCounter += 1) * 7.31;
        const isGrass = hash01(seed + 0.5) < band.grassChance;
        band.items.push(
          isGrass
            ? {
                type: "grass",
                worldX: band.nextX,
                seed,
                size: hashRange(seed + 2, ...band.grassSize),
              }
            : {
                type: "flower",
                worldX: band.nextX,
                seed,
                height: hashRange(seed + 3, ...band.flowerHeight),
                head: hashRange(seed + 4, ...band.flowerHead),
              },
        );
        band.nextX += hashRange(seed + 5, ...band.gap);
      }

      // Drop anything well clear of the left edge.
      const cull = this.scroll * band.speed - 260;
      if (band.items.length && band.items[0].worldX < cull) {
        band.items = band.items.filter((item) => item.worldX >= cull);
      }
    }
  }

  update(dt) {
    this.time += dt;
    this.scroll += CONFIG.scrollSpeed * dt;
    this.fill();

    const t = this.time;
    // Two out-of-phase sines: the slow one is the flight path, the quick one
    // keeps it from looking like a machine tracing a curve.
    const base = this.groundY - this.height * 0.34;
    const y = base + Math.sin(t * 0.62) * this.height * 0.13 + Math.sin(t * 1.9 + 1.1) * 6;
    const prevY = this.butterfly.y;
    this.butterfly.x = Math.round(this.width * CONFIG.flightX);
    this.butterfly.y = y;

    // Tilt follows vertical velocity: nose up on the climb, down on the dive.
    const climb = prevY === 0 ? 0 : (y - prevY) / Math.max(dt, 1 / 240);
    this.butterfly.tilt = Math.max(-0.2, Math.min(0.2, climb * 0.0016));

    // Trail points are laid down in the world, so they drift left with it.
    this.trailClock += dt * 1000;
    if (this.trailClock >= CONFIG.trailSampleMs) {
      this.trailClock = 0;
      this.trail.push({
        x: this.butterfly.x - 16,
        y: this.butterfly.y + 6,
        life: 0,
        bubble: hash01(this.trail.length * 2.7) < 0.045,
      });
    }
    for (const point of this.trail) {
      point.x -= CONFIG.scrollSpeed * dt;
      point.life += dt;
    }
    if (this.trail.length) {
      this.trail = this.trail.filter(
        (point) => point.life < CONFIG.trailSeconds && point.x > -80,
      );
    }
  }

  /* ------------------------------------------------------------------ draw --- */

  /**
   * Flat ground line.
   *
   * This was originally a polyline with hand-drawn wobble sampled from world x.
   * It looked right in a still frame and terrible in motion: every vertex
   * resampled its noise as the world slid past, so the whole line crawled and
   * pulsed. A scrolling line has to be straight — the travelling detail belongs
   * in the soil dashes below it, which are discrete objects that genuinely move.
   */
  drawGround(ctx) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 1.9;
    ctx.strokeStyle = INK;
    // Half-pixel so a 2px line lands on the pixel grid instead of straddling it.
    const y = Math.round(this.groundY) + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(this.width, y);
    ctx.stroke();

    // Loose dashes under the line — the reference's suggestion of soil.
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = INK_SOFT;
    const spacing = 26;
    const first = Math.floor(this.scroll / spacing) * spacing;
    for (let w = first; w < this.scroll + this.width + spacing; w += spacing) {
      const seed = w * 0.37;
      const sx = w - this.scroll + hashRange(seed, -6, 6);
      const len = hashRange(seed + 1, 4, 11);
      const dy = this.groundY + hashRange(seed + 2, 5, 14);
      ctx.beginPath();
      ctx.moveTo(sx, dy);
      ctx.lineTo(sx + len, dy);
      ctx.stroke();
    }
  }

  drawBand(ctx, band) {
    const offset = this.scroll * band.speed;
    const groundY = this.groundY + band.lift;
    for (const item of band.items) {
      const sx = item.worldX - offset;
      if (sx < -120 || sx > this.width + 120) continue;
      if (item.type === "grass") {
        drawGrassTuft(ctx, sx, groundY, { size: item.size, ink: band.ink, seed: item.seed });
      } else {
        drawFlower(ctx, sx, groundY, {
          height: item.height,
          head: item.head,
          ink: band.ink,
          seed: item.seed,
        });
      }
    }
  }

  /**
   * Contrail: one dashed polyline, faded tail-to-head with a gradient rather
   * than per-segment alpha, which keeps the dash rhythm unbroken.
   */
  drawTrail(ctx) {
    if (this.trail.length < 3) return;
    const head = this.trail[this.trail.length - 1];
    const tail = this.trail[0];

    const gradient = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
    gradient.addColorStop(0, "rgba(150,150,146,0)");
    gradient.addColorStop(0.45, "rgba(150,150,146,0.35)");
    gradient.addColorStop(1, "rgba(120,120,116,0.75)");

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = gradient;
    ctx.setLineDash([2.5, 5.5]);
    ctx.beginPath();
    ctx.moveTo(tail.x, tail.y);
    for (let i = 1; i < this.trail.length; i++) {
      ctx.lineTo(this.trail[i].x, this.trail[i].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Sparse bubbles, as in the reference sheet. Held close to the path and
    // retired early — left to drift they line up into a second track alongside
    // the trail, which reads as clutter rather than as stray puffs.
    ctx.lineWidth = 1.3;
    for (const point of this.trail) {
      if (!point.bubble || point.life > 2.2) continue;
      const fade = 1 - point.life / 2.2;
      ctx.beginPath();
      ctx.arc(point.x, point.y - Math.min(point.life, 1.2) * 4, 1.9, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(140,140,136,${(fade * 0.45).toFixed(3)})`;
      ctx.stroke();
    }
    ctx.restore();
  }

  draw(ctx) {
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawBand(ctx, this.bands[0]);
    this.drawGround(ctx);
    this.drawBand(ctx, this.bands[1]);
    this.drawTrail(ctx);

    // Flap harder on the climb — amplitude tracks the tilt.
    const beat = Math.sin(this.time * Math.PI * 2 * CONFIG.flapHz);
    const effort = 1 + Math.max(0, -this.butterfly.tilt) * 1.6;
    drawButterfly(ctx, this.butterfly.x, this.butterfly.y, {
      scale: CONFIG.butterflyScale,
      flap: Math.max(-1, Math.min(1, beat * effort)),
      tilt: this.butterfly.tilt,
    });
  }

  /** One settled frame, for prefers-reduced-motion. */
  drawStatic(ctx) {
    this.update(1 / 60);
    for (let i = 0; i < 90; i++) this.update(1 / 60);
    this.draw(ctx);
  }
}
