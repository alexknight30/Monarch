import { promises as fs } from "node:fs";
import path from "node:path";
import { resolveApiView } from "@/lib/api-view";
export const runtime = "nodejs";
type Context = { params: Promise<{ viewId: string; id: string }> };
export async function GET(_request: Request, context: Context) {
  const { viewId, id } = await context.params;
  const resolved = await resolveApiView(viewId);
  if ("error" in resolved) return resolved.error;
  if (!/^[a-f0-9-]{36}$/.test(id)) return Response.json({ error: "Not found." }, { status: 404 });
  const base = path.join(process.env.MONARCH_DATA_ROOT || path.join(process.cwd(), "data"), viewId, "assets", id);
  try {
    const meta = JSON.parse(await fs.readFile(`${base}.json`, "utf8"));
    return new Response(await fs.readFile(base), { headers: { "Content-Type": meta.mime, "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox" } });
  } catch { return Response.json({ error: "Not found." }, { status: 404 }); }
}
