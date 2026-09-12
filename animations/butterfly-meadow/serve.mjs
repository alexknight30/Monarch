/**
 * Tiny static server for previewing the animation.
 *
 * The document root is derived from this file's own location rather than the
 * process working directory — the launcher can start us somewhere unreadable,
 * and anything that calls getcwd() dies there.
 *
 *   node serve.mjs [port]        # defaults to 3003
 */

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.argv[2]) || 3003;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

createServer(async (req, res) => {
  let pathname = decodeURIComponent((req.url || "/").split("?")[0]);
  if (pathname.endsWith("/")) pathname += "index.html";

  const file = normalize(join(ROOT, pathname));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end("forbidden");
    return;
  }

  try {
    const body = await readFile(file);
    res.writeHead(200, {
      "Content-Type": TYPES[extname(file).toLowerCase()] || "application/octet-stream",
      // Always re-fetch: this exists to watch edits land.
      "Cache-Control": "no-store",
    });
    res.end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log(`butterfly-meadow → http://localhost:${PORT}`);
});
