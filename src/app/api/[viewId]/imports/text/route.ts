import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveApiView } from "@/lib/api-view";
import { createSourceDocument, uploadsDir } from "@/lib/local-db";
import { extractSchoolText } from "@/lib/import-text";
export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ viewId: string }> }) {
  const resolved = await resolveApiView((await context.params).viewId);
  if ("error" in resolved) return resolved.error;
  try {
    const form = await request.formData(); const file = form.get("file");
    if (!(file instanceof File) || !file.size) throw new Error("Choose a file containing your reading or notes.");
    if (file.size > 32 * 1024 * 1024) throw new Error("Files must be smaller than 32 MB.");
    const bytes = Buffer.from(await file.arrayBuffer());
    const text = await extractSchoolText(bytes, file.name, file.type);
    const dir = uploadsDir(resolved.viewId); await mkdir(dir, { recursive: true });
    const storedPath = path.join(dir, crypto.randomUUID()); await writeFile(storedPath, bytes);
    const document = await createSourceDocument(resolved.viewId, { filename: file.name, mime: file.type || "application/octet-stream", sizeBytes: file.size, storedPath, kind: "reading", status: "extracted" });
    return Response.json({ text, document: { id: document.id, filename: document.filename } }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Could not extract this document." }, { status: 400 }); }
}
