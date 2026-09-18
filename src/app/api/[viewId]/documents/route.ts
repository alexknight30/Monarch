import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { resolveApiView } from "@/lib/api-view";
import {
  createSourceDocument,
  updateSourceDocument,
  uploadsDir,
} from "@/lib/local-db";
import { isImage, isPdf } from "@/lib/syllabus/anthropic";

export const runtime = "nodejs";

const MAX_BYTES = 32 * 1024 * 1024;

type RouteContext = { params: Promise<{ viewId: string }> };

function extensionFor(mime: string, filename: string) {
  const fromName = path.extname(filename);
  if (fromName) return fromName;
  if (isPdf(mime)) return ".pdf";
  if (mime === "image/png") return ".png";
  if (mime === "image/jpeg" || mime === "image/jpg") return ".jpg";
  return "";
}

export async function POST(request: Request, context: RouteContext) {
  const { viewId: raw } = await context.params;
  const resolved = await resolveApiView(raw);
  if ("error" in resolved) return resolved.error;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A file is required." }, { status: 400 });
  }

  if (!isPdf(file.type) && !isImage(file.type)) {
    return NextResponse.json(
      { error: "Only PDF and image syllabi can be ingested. Convert DOC/DOCX first." },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File is larger than 32 MB." }, { status: 400 });
  }

  const dir = uploadsDir(resolved.viewId);
  await mkdir(dir, { recursive: true });

  const document = await createSourceDocument(resolved.viewId, {
    filename: file.name,
    mime: file.type || "application/pdf",
    sizeBytes: file.size,
    storedPath: dir,
  });

  const storedPath = path.join(
    /*turbopackIgnore: true*/
    dir,
    `${document.id}${extensionFor(file.type, file.name)}`,
  );
  await writeFile(storedPath, Buffer.from(await file.arrayBuffer()));
  const saved = await updateSourceDocument(resolved.viewId, document.id, {
    storedPath,
  });

  return NextResponse.json({ document: saved }, { status: 201 });
}
