import { DesignConflict, readDesign, saveDesign, sourceIndex, designHistory, readDesignSnapshot } from "@/lib/design/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function permitted(request: Request, write = false) {
  if (process.env.NODE_ENV !== "development") return false;
  const url = new URL(request.url);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return false;
  const origin = request.headers.get("origin");
  if (write && (!origin || origin !== url.origin || request.headers.get("x-monarch-design") !== "1")) return false;
  return !origin || origin === url.origin;
}
export async function GET(request: Request) {
  if (!permitted(request)) return Response.json({ error: "Design tools are available on localhost in development only." }, { status: 403 });
  const snapshot = new URL(request.url).searchParams.get("snapshot");
  if (snapshot) {
    try { return Response.json({ document: await readDesignSnapshot(snapshot) }, { headers: { "Cache-Control": "no-store" } }); }
    catch { return Response.json({ error: "Snapshot unavailable." }, { status: 404 }); }
  }
  const state = await readDesign();
  return Response.json({ ...state, nodes: await sourceIndex(), snapshots: await designHistory() }, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: Request) {
  if (!permitted(request, true)) return Response.json({ error: "Design save refused: use the local development editor." }, { status: 403 });
  try {
    const raw = await request.text();
    if (raw.length > 2_000_000) return Response.json({ error: "Design is too large." }, { status: 413 });
    const body = JSON.parse(raw);
    const nodes = await sourceIndex();
    if (!Array.isArray(body.document?.rules)) throw new Error("Invalid design document.");
    for (const rule of body.document.rules) {
      if (!nodes[rule.node]) throw new Error("An edited element no longer exists. Refresh and inspect the changes.");
      if (rule.text !== undefined && !nodes[rule.node].text) throw new Error("This text comes from live app data and cannot be replaced by the design editor.");
    }
    return Response.json(await saveDesign(body.document, body.revision));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Design could not be saved." }, { status: error instanceof DesignConflict ? 409 : 400 });
  }
}
