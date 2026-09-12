/**
 * Drawing primitives for the butterfly meadow.
 *
 * Everything here is procedural rather than a sprite sheet cut from the
 * reference art, for two reasons:
 *
 *  1. The scroll is endless. A fixed bitmap has to tile, and any tile seam in a
 *     hand-drawn ground line is visible forever. Procedural scenery recycles
 *     off-screen instead, so there is no seam to hide.
 *  2. The reference only ever shows open wings. A flap needs poses that do not
 *     exist in the source images, so the wings have to be geometry we can
 *     rotate.
 *
 * The look is matched instead of copied: chunky graphite outlines, white fill,
 * pixel-block blossoms, and jitter tied to world position so the "hand-drawn"
 * wobble travels with the scenery rather than shimmering under it.
 */

export const INK = "#4A4A47";
export const INK_SOFT = "#84847F";
export const INK_FAINT = "#BDBDB8";
export const PAPER = "#FFFFFF";

/** Monarch wing membrane — the light purple from the Monarch palette. */
export const WING = "#B8B2DB";
/** Same hue lifted toward paper, for the far wing. */
export const WING_FAR = "#DCD9EC";

/**
 * Deterministic 0..1 from any number.
 *
 * Keyed on world position, not frame count — that is what keeps a given tuft of
 * grass wobbling the same way as it crosses the screen.
 */
export function hash01(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

/** hash01 mapped onto a range. */
export function hashRange(n, min, max) {
  return min + hash01(n) * (max - min);
}

/* ----------------------------------------------------------------- flowers --- */

/**
 * Blossom as a ring of pixel blocks: four square petals on the axes, four
 * pulled in on the diagonals so the head reads round rather than as a waffle,
 * then a centre block with a seed dot.
 */
function blossom(ctx, cx, cy, p, ink) {
  // Eight petals on one true ring. Petal width is held just under the arc
  // spacing so neighbours touch without merging into a solid block — that gap
  // is the whole difference between a blossom and a waffle.
  const petal = p * 0.78;
  const D = Math.SQRT1_2;

  ctx.lineWidth = Math.max(1, p * 0.17);
  ctx.strokeStyle = ink;
  ctx.fillStyle = PAPER;
  ctx.lineJoin = "miter";

  const ring = [
    [0, -1],
    [D, -D],
    [1, 0],
    [D, D],
    [0, 1],
    [-D, D],
    [-1, 0],
    [-D, -D],
  ];

  for (const [dx, dy] of ring) {
    ctx.beginPath();
    ctx.rect(cx + dx * p - petal / 2, cy + dy * p - petal / 2, petal, petal);
    ctx.fill();
    ctx.stroke();
  }

  // Centre punched over the ring, so the flower reads hollow rather than filled.
  const eye = p * 0.72;
  ctx.beginPath();
  ctx.rect(cx - eye / 2, cy - eye / 2, eye, eye);
  ctx.fill();
  ctx.stroke();

  const seed = p * 0.3;
  ctx.fillStyle = ink;
  ctx.fillRect(cx - seed / 2, cy - seed / 2, seed, seed);
}

/** A single leaf hanging off the stem. */
function leaf(ctx, x, y, dir, len, ink) {
  ctx.lineWidth = Math.max(1, len * 0.11);
  ctx.strokeStyle = ink;
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + dir * len * 0.6, y - len * 0.34, x + dir * len, y + len * 0.16);
  ctx.quadraticCurveTo(x + dir * len * 0.5, y + len * 0.3, x, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/**
 * Flower rooted on the ground line.
 * `seed` drives the lean and leaf placement so each one differs but is stable.
 */
export function drawFlower(ctx, x, groundY, { height, head, ink = INK, seed = 0 }) {
  const lean = (hash01(seed) - 0.5) * height * 0.12;
  const topX = x + lean;
  const topY = groundY - height;

  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(1.2, head * 0.17);
  ctx.strokeStyle = ink;
  ctx.beginPath();
  ctx.moveTo(x, groundY);
  ctx.quadraticCurveTo(x + lean * 0.3, groundY - height * 0.55, topX, topY + head * 0.7);
  ctx.stroke();

  const leafY = groundY - height * hashRange(seed + 1, 0.3, 0.46);
  const leafLen = height * 0.2;
  leaf(ctx, x + lean * 0.4, leafY, -1, leafLen, ink);
  leaf(ctx, x + lean * 0.55, leafY - height * 0.1, 1, leafLen * 0.86, ink);

  blossom(ctx, topX, topY, head, ink);
}

/* -------------------------------------------------------------------- grass --- */

/** Small fan of blades. Reads as the sparse tufts between the flowers. */
export function drawGrassTuft(ctx, x, groundY, { size, ink = INK, seed = 0 }) {
  const blades = 3 + Math.floor(hash01(seed) * 2);
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(1, size * 0.11);
  ctx.strokeStyle = ink;

  for (let i = 0; i < blades; i++) {
    const spread = (i / (blades - 1) - 0.5) * 2;
    const len = size * hashRange(seed + i * 3.7, 0.62, 1);
    ctx.beginPath();
    ctx.moveTo(x, groundY);
    ctx.quadraticCurveTo(
      x + spread * len * 0.42,
      groundY - len * 0.62,
      x + spread * len * 0.9,
      groundY - len,
    );
    ctx.stroke();
  }
}

/* ---------------------------------------------------------------- butterfly --- */

/**
 * Drawn straight onto the canvas as vector geometry.
 *
 * An earlier pass rendered this through a low-resolution buffer blitted up with
 * smoothing off, chasing the cross-stitched edges of the reference art. It read
 * as a sprite pasted onto a drawing rather than part of it, and the fixed buffer
 * clipped the wing tips at the top of the flap. The reference's charm is really
 * its *weight* — a thin delicate outline and a light interior — so that is what
 * this matches instead.
 *
 * Everything is in local units with the root at the body and the wings swept back
 * along -x, so the butterfly faces right and the meadow slides left beneath it.
 */

/**
 * Forewing: a full, rounded blade rising up and back off the shoulder.
 *
 * An earlier version met the leading and outer edges at a hard corner for a
 * sharp apex. It read as angular and papery next to the soft pixel blossoms —
 * the reference wing is plump, with only a soft directional tip.
 */
function forewingPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(-1, -3);
  ctx.bezierCurveTo(-7, -15, -17, -21, -24, -18.5);
  ctx.bezierCurveTo(-29, -16, -28.5, -8, -21.5, -4.5);
  ctx.bezierCurveTo(-14, -1.2, -5, -1, -1, -3);
  ctx.closePath();
}

/**
 * Hindwing: nearly as large as the forewing, and rooted at almost the same point
 * so the pair reads as one conjoined wing mass with a crease between them. Drawn
 * smaller and lower it separated into two distinct lobes, which is not how the
 * reference reads.
 */
function hindwingPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(-1.5, -1);
  ctx.bezierCurveTo(-7, 4, -17, 10, -22, 13.5);
  ctx.bezierCurveTo(-26, 10.5, -25, 1.5, -16, -1.5);
  ctx.bezierCurveTo(-9, -3.5, -4, -3, -1.5, -1);
  ctx.closePath();
}

/** Vein fans: [controlX, controlY, endX, endY], all sprouting from the root. */
const FOREWING_VEINS = [
  [-11, -14, -19, -18],
  [-14, -9, -25, -10],
  [-13, -4, -21, -4],
];
const HINDWING_VEINS = [
  [-11, 5, -19, 11.5],
  [-13, 1.5, -23, 3.5],
];

/**
 * Paint one wing: membrane, veins, outline.
 *
 * Keeping the purple inside the wing is a property of this order rather than of
 * careful coordinates, which is why it holds at every wing angle and not just at
 * rest:
 *
 *  - the membrane is a *fill of the wing path*, so it cannot start outside it;
 *  - veins are stroked inside a *clip() of that same path*, so a vein whose
 *    endpoint overshoots is cut at the edge instead of leaking;
 *  - the outline strokes last and straddles the path, covering the antialiased
 *    boundary of the fill on both sides.
 */
function paintWing(ctx, pathFn, veins, { fill, ink, veinInk, lw }) {
  pathFn(ctx);
  ctx.fillStyle = fill;
  ctx.fill();

  if (veins.length) {
    ctx.save();
    pathFn(ctx);
    ctx.clip();
    ctx.lineWidth = lw * 0.6;
    ctx.strokeStyle = veinInk;
    ctx.lineCap = "round";
    for (const [cx, cy, ex, ey] of veins) {
      ctx.beginPath();
      ctx.moveTo(-2, -1);
      ctx.quadraticCurveTo(cx, cy, ex, ey);
      ctx.stroke();
    }
    ctx.restore();
  }

  pathFn(ctx);
  ctx.lineWidth = lw;
  ctx.strokeStyle = ink;
  ctx.stroke();
}

/**
 * @param {number} flap  -1 (wings down) .. 1 (wings up)
 * @param {number} tilt   body rotation in radians, from climb/dive
 */
export function drawButterfly(ctx, x, y, { scale = 1.7, flap = 0, tilt = 0 } = {}) {
  // Local units, so it scales with the butterfly. Kept thin on purpose — the
  // reference outline is a hairline, and anything heavier reads as a bold
  // illustration rather than a pencil sketch.
  const lw = 1;
  const angle = flap * 0.36;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.scale(scale, scale);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // Far wing: forewing only, trailing the near one and washed out. No veins — at
  // this size a second set reads as noise rather than as depth.
  ctx.save();
  ctx.translate(2.2, -0.6);
  ctx.rotate(angle * 0.5);
  paintWing(ctx, forewingPath, [], {
    fill: WING_FAR,
    ink: INK_FAINT,
    veinInk: INK_FAINT,
    lw: lw * 0.9,
  });
  ctx.restore();

  // Body — abdomen up to the head, running diagonally so it follows the line of
  // flight rather than hanging vertically. Drawn in its own rotated frame so the
  // segment lines stay square to the body axis.
  const bodyAngle = 0.42;
  const bodyLen = 6;
  ctx.save();
  ctx.translate(1.2, 0.8);
  ctx.rotate(bodyAngle);
  ctx.beginPath();
  ctx.ellipse(0, 0, 2.1, bodyLen, 0, 0, Math.PI * 2);
  ctx.fillStyle = PAPER;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = INK;
  ctx.stroke();

  ctx.lineWidth = lw * 0.5;
  for (const sy of [-2.2, 0.6, 3.2]) {
    ctx.beginPath();
    ctx.moveTo(-1.7, sy);
    ctx.lineTo(1.7, sy);
    ctx.stroke();
  }
  ctx.restore();

  // Head sits on the far end of that same axis.
  const headX = 1.2 + Math.sin(bodyAngle) * (bodyLen + 0.6);
  const headY = 0.8 - Math.cos(bodyAngle) * (bodyLen + 0.6);

  ctx.beginPath();
  ctx.arc(headX, headY, 2.4, 0, Math.PI * 2);
  ctx.fillStyle = INK;
  ctx.fill();

  // Eye — a small paper circle, set toward the front of the head.
  ctx.beginPath();
  ctx.arc(headX + 0.85, headY - 0.5, 0.72, 0, Math.PI * 2);
  ctx.fillStyle = PAPER;
  ctx.fill();

  // Antennae, clubbed at the tips.
  ctx.lineWidth = lw * 0.7;
  ctx.strokeStyle = INK;
  for (const [ax, ay] of [
    [8, -11.5],
    [9.5, -8.5],
  ]) {
    ctx.beginPath();
    ctx.moveTo(headX + 0.6, headY - 1.8);
    ctx.quadraticCurveTo(ax * 0.55, ay * 0.95, ax, ay);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ax, ay, 0.8, 0, Math.PI * 2);
    ctx.fillStyle = INK;
    ctx.fill();
  }

  // Near wing, in front of the body.
  ctx.save();
  ctx.rotate(angle);
  paintWing(ctx, hindwingPath, HINDWING_VEINS, {
    fill: WING,
    ink: INK,
    veinInk: INK_SOFT,
    lw,
  });
  paintWing(ctx, forewingPath, FOREWING_VEINS, {
    fill: WING,
    ink: INK,
    veinInk: INK_SOFT,
    lw,
  });
  ctx.restore();

  ctx.restore();
}
