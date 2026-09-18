import { promises as fs } from "node:fs";
import path from "node:path";
import { resolveApiView } from "@/lib/api-view";
export const runtime = "nodejs";
type Context = { params: Promise<{ viewId: string }> };
export async function POST(request: Request, context: Context) {
  const resolved = await resolveApiView((await context.params).viewId);
  if ("error" in resolved) return resolved.error;
  const data = await request.formData();
  const file = data.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Choose a file." }, { status: 400 });
  if (file.size > 25 * 1024 * 1024) return Response.json({ error: "Images and videos must be under 25 MB." }, { status: 400 });
  if (!/^(image\/(png|jpeg|webp|gif|svg\+xml)|video\/(mp4|webm))$/.test(file.type)) return Response.json({ error: "Choose a PNG, JPEG, WebP, GIF, SVG, MP4 or WebM file." }, { status: 400 });
  const id = crypto.randomUUID();
  const dir = path.join(process.env.MONARCH_DATA_ROOT || path.join(process.cwd(), "data"), resolved.viewId, "assets");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, id), Buffer.from(await file.arrayBuffer()));
  await fs.writeFile(path.join(dir, `${id}.json`), JSON.stringify({ mime: file.type, name: file.name }));
  return Response.json({ src: `/api/${resolved.viewId}/assets/${id}` });
}
