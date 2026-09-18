import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { filesToContentBlocks, metaFromFile, MAX_ATTACHMENTS, type ChatAttachmentMeta } from "./chat-attachments";
import type { ViewId } from "./views";

function directory(viewId: ViewId) { return path.join(process.env.MONARCH_DATA_ROOT || path.join(process.cwd(), "data"), viewId, "chat-files"); }

export async function storeChatFiles(viewId: ViewId, files: File[]): Promise<ChatAttachmentMeta[]> {
  if (files.length > MAX_ATTACHMENTS) throw new Error(`Attach up to ${MAX_ATTACHMENTS} files.`);
  await filesToContentBlocks(files);
  const dir = directory(viewId);
  await fs.mkdir(dir, { recursive: true });
  return Promise.all(files.map(async (file) => {
    const bytes = Buffer.from(await file.arrayBuffer());
    const id = createHash("sha256").update(file.name).update(bytes).digest("hex");
    const meta = { ...metaFromFile(file), id };
    const write = async (suffix: string, content: Buffer | string) => fs.writeFile(path.join(dir, `${id}.${suffix}`), content, { flag: "wx" }).catch((error: NodeJS.ErrnoException) => { if (error.code !== "EEXIST") throw error; });
    await write("bin", bytes);
    await write("json", JSON.stringify(meta));
    return meta;
  }));
}

export async function loadChatFileBlocks(viewId: ViewId, attachments: ChatAttachmentMeta[]) {
  if (attachments.length > MAX_ATTACHMENTS) throw new Error("Too many attachments in one message.");
  const files = await Promise.all(attachments.map(async (attachment) => {
    if (!attachment.id || !/^[a-f0-9]{64}$/.test(attachment.id)) return null;
    const base = path.join(directory(viewId), attachment.id);
    try {
      const meta = JSON.parse(await fs.readFile(`${base}.json`, "utf8")) as ChatAttachmentMeta;
      const bytes = await fs.readFile(`${base}.bin`);
      return new File([bytes], meta.name, { type: meta.mime });
    } catch { throw new Error(`The saved attachment “${attachment.name}” is unavailable. Attach it again.`); }
  }));
  return filesToContentBlocks(files.filter((file): file is File => file !== null));
}
