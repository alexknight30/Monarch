/**
 * Geometry for the morphing Lumis loader.
 *
 * The four marks share a 140×140 viewBox, a 22-unit wall and a ~2931-unit
 * counter, so they read as one family. Footprint is the deliberate variable —
 * a circle and a triangle have to be drawn larger than a square to look the
 * same size (see the "Loader / Shape family" artboard).
 *
 * The four `d` strings below are the source of truth. Everything else in this
 * file exists to make them interpolatable: the raw paths use different command
 * types and segment counts (arcs vs cubics vs H/V lines), so they cannot be
 * lerped directly. Instead each outline is flattened, then resampled into a
 * fixed number of rays cast from its own centroid. Every shape ends up as the
 * same 96 radii per contour, and morphing is a plain lerp of those radii.
 *
 * Every contour here is convex, which is what makes the ray-cast resampling
 * well defined — each ray crosses the outline exactly once.
 */

export const SHAPE_VIEWBOX = 140;

/** Outer outline + counter, in draw order. Index order is the morph cycle. */
export const SHAPE_PATHS = [
  // Arch — the mark itself. 100×100, corner r10.5.
  "M30.5 20H109.5C115.299 20 120 24.701 120 30.5V109.5C120 115.299 115.299 120 109.5 120H30.5C24.701 120 20 115.299 20 109.5V30.5C20 24.701 24.701 20 30.5 20ZM44 66V99.5C44 100.881 45.119 102 46.5 102H93.5C94.881 102 96 100.881 96 99.5V66C96 51.641 84.359 40 70 40C55.641 40 44 51.641 44 66Z",
  // Circle — Ø105, +5% optical.
  "M70 17.456A52.544 52.544 0 1 1 70 122.544A52.544 52.544 0 1 1 70 17.456ZM70 39.456A30.544 30.544 0 1 1 70 100.544A30.544 30.544 0 1 1 70 39.456Z",
  // Triangle — 116×108, corner r28.
  "M45.751 29.985A28 28 0 0 1 94.249 29.985L124.288 82.016A28 28 0 0 1 100.039 124.016L39.961 124.016A28 28 0 0 1 15.712 82.016ZM63.072 43.984A8 8 0 0 1 76.928 43.984L103.504 90.016A8 8 0 0 1 96.575 102.016L43.425 102.016A8 8 0 0 1 36.496 90.016Z",
  // Trapezoid — 108×104, taper .64, corner r16.
  "M30.546 30.998A16 16 0 0 1 46.236 18.136L93.764 18.136A16 16 0 0 1 109.454 30.998L123.799 102.726A16 16 0 0 1 108.11 121.864L31.89 121.864A16 16 0 0 1 16.201 102.726ZM50.19 44.959A6 6 0 0 1 56.073 40.136L83.927 40.136A6 6 0 0 1 89.81 44.959L99.356 92.688A6 6 0 0 1 93.473 99.864L46.527 99.864A6 6 0 0 1 40.644 92.688Z",
] as const;

/** Rays per contour. 96 keeps chord error well under a pixel at loader sizes. */
const RAYS = 96;
const ARC_STEPS = 48;
const CUBIC_STEPS = 24;

type Point = [number, number];

/** A contour reduced to a centroid plus one radius per ray. */
type Ring = { cx: number; cy: number; radii: Float64Array };

// ---------------------------------------------------------------- path parse

function tokenize(d: string): (string | number)[] {
  const out: (string | number)[] = [];
  const re = /([MmLlHhVvCcQqAaZz])|(-?\d*\.?\d+(?:e[-+]?\d+)?)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) out.push(m[1] ? m[1] : parseFloat(m[2]));
  return out;
}

/** SVG endpoint-parameterized arc → center parameterization (spec F.6.5). */
function arcToCenter(
  x1: number, y1: number, rx: number, ry: number, phi: number,
  fa: number, fs: number, x2: number, y2: number,
) {
  const cosP = Math.cos(phi);
  const sinP = Math.sin(phi);
  const dx2 = (x1 - x2) / 2;
  const dy2 = (y1 - y2) / 2;
  const x1p = cosP * dx2 + sinP * dy2;
  const y1p = -sinP * dx2 + cosP * dy2;

  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    const s = Math.sqrt(lambda);
    rx *= s;
    ry *= s;
  }

  const sign = fa === fs ? -1 : 1;
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const co = sign * Math.sqrt(Math.max(0, num / den));
  const cxp = (co * (rx * y1p)) / ry;
  const cyp = (co * -(ry * x1p)) / rx;

  const angle = (ux: number, uy: number, vx: number, vy: number) => {
    const len = Math.sqrt((ux * ux + uy * uy) * (vx * vx + vy * vy));
    let a = Math.acos(Math.max(-1, Math.min(1, (ux * vx + uy * vy) / len)));
    if (ux * vy - uy * vx < 0) a = -a;
    return a;
  };

  const ux = (x1p - cxp) / rx;
  const uy = (y1p - cyp) / ry;
  const theta1 = angle(1, 0, ux, uy);
  let delta = angle(ux, uy, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!fs && delta > 0) delta -= 2 * Math.PI;
  if (fs && delta < 0) delta += 2 * Math.PI;

  return {
    cx: cosP * cxp - sinP * cyp + (x1 + x2) / 2,
    cy: sinP * cxp + cosP * cyp + (y1 + y2) / 2,
    rx, ry, phi, theta1, delta,
  };
}

/** Flatten a path into closed polylines, one per subpath. */
function pathToContours(d: string): Point[][] {
  const t = tokenize(d);
  const contours: Point[][] = [];
  let cur: Point[] = [];
  let x = 0, y = 0, startX = 0, startY = 0;
  let cmd = "";
  let i = 0;

  while (i < t.length) {
    if (typeof t[i] === "string") cmd = t[i++] as string;
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    const n = () => t[i++] as number;

    if (C === "M") {
      if (cur.length) contours.push(cur);
      cur = [];
      x = rel ? x + n() : n();
      y = rel ? y + n() : n();
      startX = x;
      startY = y;
      cur.push([x, y]);
      // Implicit line-to for any repeated coordinate pairs.
      cmd = rel ? "l" : "L";
    } else if (C === "L") {
      x = rel ? x + n() : n();
      y = rel ? y + n() : n();
      cur.push([x, y]);
    } else if (C === "H") {
      x = rel ? x + n() : n();
      cur.push([x, y]);
    } else if (C === "V") {
      y = rel ? y + n() : n();
      cur.push([x, y]);
    } else if (C === "C") {
      const x1 = rel ? x + n() : n(), y1 = rel ? y + n() : n();
      const x2 = rel ? x + n() : n(), y2 = rel ? y + n() : n();
      const ex = rel ? x + n() : n(), ey = rel ? y + n() : n();
      for (let k = 1; k <= CUBIC_STEPS; k++) {
        const u = k / CUBIC_STEPS;
        const v = 1 - u;
        cur.push([
          v * v * v * x + 3 * v * v * u * x1 + 3 * v * u * u * x2 + u * u * u * ex,
          v * v * v * y + 3 * v * v * u * y1 + 3 * v * u * u * y2 + u * u * u * ey,
        ]);
      }
      x = ex;
      y = ey;
    } else if (C === "A") {
      const rx = n(), ry = n(), phi = (n() * Math.PI) / 180;
      const fa = n(), fs = n();
      const ex = rel ? x + n() : n(), ey = rel ? y + n() : n();
      const a = arcToCenter(x, y, rx, ry, phi, fa, fs, ex, ey);
      const cosP = Math.cos(a.phi);
      const sinP = Math.sin(a.phi);
      for (let k = 1; k <= ARC_STEPS; k++) {
        const th = a.theta1 + a.delta * (k / ARC_STEPS);
        const ct = Math.cos(th);
        const st = Math.sin(th);
        cur.push([
          a.cx + cosP * a.rx * ct - sinP * a.ry * st,
          a.cy + sinP * a.rx * ct + cosP * a.ry * st,
        ]);
      }
      x = ex;
      y = ey;
    } else if (C === "Z") {
      // The command token was already consumed above — do not advance again.
      if (cur.length) {
        contours.push(cur);
        cur = [];
      }
      x = startX;
      y = startY;
    } else {
      throw new Error(`loader-shapes: unsupported path command "${cmd}"`);
    }
  }

  if (cur.length) contours.push(cur);
  return contours;
}

// ------------------------------------------------------------------ resample

function areaCentroid(pts: Point[]) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    const f = x0 * y1 - x1 * y0;
    a += f;
    cx += (x0 + x1) * f;
    cy += (y0 + y1) * f;
  }
  a /= 2;
  return { cx: cx / (6 * a), cy: cy / (6 * a) };
}

/**
 * Cast RAYS rays from the contour's centroid — ray 0 points up, sweeping
 * clockwise. Sampling by angle (rather than arc length) is what keeps the
 * morph from twisting: a point at 12 o'clock on one shape maps to 12 o'clock
 * on the next, so the outline breathes between forms instead of sliding.
 */
function toRing(pts: Point[]): Ring {
  const { cx, cy } = areaCentroid(pts);
  const radii = new Float64Array(RAYS);

  for (let k = 0; k < RAYS; k++) {
    const th = (2 * Math.PI * k) / RAYS;
    const dx = Math.sin(th);
    const dy = -Math.cos(th);
    let hit = 0;
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[(i + 1) % pts.length];
      const ex = bx - ax;
      const ey = by - ay;
      const den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-12) continue;
      const s = ((ax - cx) * ey - (ay - cy) * ex) / den;
      const u = ((ax - cx) * dy - (ay - cy) * dx) / den;
      if (s > 0 && u >= -1e-9 && u <= 1 + 1e-9 && s > hit) hit = s;
    }
    radii[k] = hit;
  }

  return { cx, cy, radii };
}

// Ray direction lookup, shared by every frame.
const RAY_DX = new Float64Array(RAYS);
const RAY_DY = new Float64Array(RAYS);
for (let k = 0; k < RAYS; k++) {
  const th = (2 * Math.PI * k) / RAYS;
  RAY_DX[k] = Math.sin(th);
  RAY_DY[k] = -Math.cos(th);
}

let cachedRings: Ring[][] | null = null;

/** Resampled contours per shape. Built once, on first use. */
function getRings(): Ring[][] {
  if (!cachedRings) {
    cachedRings = SHAPE_PATHS.map((d) => pathToContours(d).map(toRing));
  }
  return cachedRings;
}

// --------------------------------------------------------------------- morph

/**
 * Blend two shapes into a single `d` string. `t` runs 0→1 from `from` to `to`.
 * The result is two closed polygons (outer + counter), so the consumer must
 * render it with `fillRule="evenodd"` for the counter to punch through.
 */
export function buildMorphPath(from: number, to: number, t: number): string {
  const rings = getRings();
  const a = rings[from % rings.length];
  const b = rings[to % rings.length];
  const out: string[] = [];

  for (let c = 0; c < a.length; c++) {
    const ra = a[c];
    const rb = b[c];
    const cx = ra.cx + (rb.cx - ra.cx) * t;
    const cy = ra.cy + (rb.cy - ra.cy) * t;

    for (let k = 0; k < RAYS; k++) {
      const r = ra.radii[k] + (rb.radii[k] - ra.radii[k]) * t;
      const x = Math.round((cx + r * RAY_DX[k]) * 100) / 100;
      const y = Math.round((cy + r * RAY_DY[k]) * 100) / 100;
      out.push(`${k === 0 ? "M" : "L"}${x} ${y}`);
    }
    out.push("Z");
  }

  return out.join("");
}

/** Total shapes in the morph cycle. */
export const SHAPE_COUNT = SHAPE_PATHS.length;
