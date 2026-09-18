import { readFile } from "node:fs/promises";
import path from "node:path";
export const runtime = "nodejs";
export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await context.params;
  if (parts[0] !== "fonts" || parts.some(part => !/^[\w.-]+$/.test(part) || part === "..") || !parts.at(-1)?.endsWith(".woff2")) return new Response("Not found", { status: 404 });
  try {
    const bytes = await readFile(path.join(process.cwd(), "node_modules/@excalidraw/excalidraw/dist/prod", ...parts));
    return new Response(bytes, { headers: { "Content-Type": "font/woff2", "Cache-Control": "public, max-age=86400" } });
  } catch { return new Response("Not found", { status: 404 }); }
}
