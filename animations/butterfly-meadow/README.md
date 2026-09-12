# Butterfly meadow

An endless side-scrolling animation built from the "Butterfly flying left"
reference on the **Animations** page of the Monarch Paper file. Same idea as the
Chrome dinosaur game: the butterfly holds a fixed screen position while the
meadow slides right-to-left underneath it, so forward flight is implied rather
than travelled.

## Run it

```bash
node animations/butterfly-meadow/serve.mjs 3003
```

Then open <http://localhost:3003>. There is also a `butterfly-meadow` entry in
`.claude/launch.json`.

No build step and no dependencies — plain ES modules and a 2D canvas.

## Files

| File | Role |
| --- | --- |
| `index.html` | Blank white page, one full-viewport canvas |
| `sprites.js` | Drawing primitives: butterfly, flowers, grass |
| `scene.js` | The scrolling world, parallax bands, contrail |
| `main.js` | Canvas sizing and the frame loop |
| `serve.mjs` | Static server for previewing |

## Why it is drawn rather than stitched

The obvious approach is to cut sprite frames out of the reference images and
stitch them together. Two things pushed against that:

- **The scroll never ends.** A fixed bitmap has to tile, and a seam in a
  hand-drawn ground line is visible forever. Scenery here lives in world
  coordinates and is recycled off-screen instead, so there is no seam anywhere.
- **The reference only shows open wings.** A wing beat needs poses that do not
  exist in the source art, so the wings have to be geometry that can rotate.

So the look is matched rather than copied: graphite outlines on white, pixel-block
blossoms, and a dashed contrail.

## The butterfly

Drawn straight onto the canvas as vector geometry, in local units with the root at
the body and the wings swept back along -x.

One approach that did **not** work is worth recording. The reference art is
pencil-rendered pixel art, so an earlier pass rendered the butterfly through a
low-resolution buffer blitted up with `imageSmoothingEnabled = false` to get those
cross-stitched edges. It was a mistake twice over: it read as a sprite pasted onto
a drawing rather than part of one, and the fixed-size buffer clipped the wing tips
at the top of the flap. The reference's charm is really its *weight* — a hairline
outline and a light interior — and that is what this matches instead. Keep the
outline thin; heavier immediately reads as a bold illustration.

Three silhouette details carry most of the character:

- Both wings are **full and rounded**, with only a soft directional tip. An
  earlier version met the forewing's leading and outer edges at a hard corner for
  a sharp apex; it read as angular and papery next to the soft pixel blossoms.
- The hindwing is **nearly as large as the forewing and rooted at almost the same
  point**, so the pair reads as one conjoined wing mass with a crease between
  them. Drawn smaller and lower it separates into two distinct lobes.
- The body runs **diagonally**, following the line of flight rather than hanging
  vertically, with the head and its eye on the far end of that same axis. It is
  drawn in its own rotated frame so the segment lines stay square to the body.

Wing membrane is `#B8B2DB` from the Monarch palette. Keeping it inside the wing at
every wing angle is a property of the draw order in `paintWing`, not of careful
coordinates:

1. The membrane is a **fill of the wing path**, so it cannot begin outside it.
2. Veins are stroked inside a **`clip()` of that same path**, so a vein whose
   endpoint overshoots is cut at the edge instead of leaking.
3. The outline strokes last and straddles the path, covering the antialiased
   boundary of the fill on both sides.

All of it runs in whatever transform the flap has already applied, so it holds
across the whole wing beat rather than only at rest.

## Tuning

Everything worth changing is in `CONFIG` at the top of `scene.js`:

| Key | Effect |
| --- | --- |
| `scrollSpeed` | World px per second (66 — a drift, not a race) |
| `groundRatio` | Ground line as a fraction of canvas height |
| `flightX` | The butterfly's fixed screen x, as a fraction of width |
| `flapHz` | Wing beats per second |
| `butterflyScale` | Butterfly size |
| `trailSeconds` | How much contrail is kept |

Parallax lives in the `BANDS` array just below it. Distance is carried by speed,
scale and ink weight together — a far flower is smaller, paler *and* slower.

## Notes

- Sizing uses a `ResizeObserver`, not the window `resize` event. A page that
  loads inside a hidden or not-yet-laid-out container measures 0×0, and a resize
  listener alone never fires to correct it.
- `prefers-reduced-motion: reduce` renders one settled frame instead of animating.
- **The ground line is straight, and has to be.** It was a polyline with
  hand-drawn wobble hashed from world position. That looks right in a still frame
  and terrible in motion: every vertex resamples its noise as the world slides
  past, so the line crawls and pulses. Travelling detail belongs in the soil
  dashes below it, which are discrete objects that genuinely move.
