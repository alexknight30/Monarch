import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { resolveApiView } from "@/lib/api-view";
import { getSourceDocument } from "@/lib/local-db";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ viewId: string; id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { viewId: raw, id } = await context.params;
  const resolved = await resolveApiView(raw);
  if ("error" in resolved) return resolved.error;

  const document = await getSourceDocument(resolved.viewId, id);
  if (!document) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  try {
    const bytes = await readFile(document.storedPath);
    const filename = document.filename.replace(/"/g, "");
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": document.mime || "application/octet-stream",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Content-Length": String(bytes.byteLength),
      },
    });
  } catch {
    return NextResponse.json({ error: "File is missing." }, { status: 404 });
  }
}
