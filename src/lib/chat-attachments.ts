import type Anthropic from "@anthropic-ai/sdk";

export type ChatAttachmentMeta = {
  id?: string;
  name: string;
  mime: string;
  size: number;
};

export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_TEXT_CHARS = 200_000;

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const TEXT_EXTS = new Set([
  "txt",
  "md",
  "markdown",
  "csv",
  "tsv",
  "json",
  "html",
  "htm",
  "css",
  "xml",
  "yml",
  "yaml",
  "log",
  "rtf",
  "js",
  "jsx",
  "ts",
  "tsx",
  "mjs",
  "cjs",
  "py",
  "rb",
  "go",
  "rs",
  "java",
  "c",
  "h",
  "cpp",
  "cc",
  "cs",
  "swift",
  "kt",
  "sql",
  "sh",
  "bash",
  "zsh",
  "r",
  "m",
  "tex",
]);

const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  txt: "text/plain",
  md: "text/markdown",
  markdown: "text/markdown",
  csv: "text/csv",
  tsv: "text/tab-separated-values",
  json: "application/json",
  html: "text/html",
  htm: "text/html",
  css: "text/css",
  xml: "application/xml",
  yml: "text/yaml",
  yaml: "text/yaml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};

export const ATTACH_ACCEPT = [
  ".pdf",
  ".txt",
  ".md",
  ".csv",
  ".json",
  ".html",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  ...[...TEXT_EXTS].map((ext) => `.${ext}`),
].join(",");

function extOf(name: string) {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index + 1).toLowerCase() : "";
}

export function inferAttachmentMime(name: string, mime: string) {
  if (mime && mime !== "application/octet-stream") {
    if (mime === "image/jpg") return "image/jpeg";
    return mime;
  }
  return MIME_BY_EXT[extOf(name)] ?? (TEXT_EXTS.has(extOf(name)) ? "text/plain" : "");
}

export function isSupportedAttachment(name: string, mime: string) {
  const resolved = inferAttachmentMime(name, mime);
  if (IMAGE_TYPES.has(resolved)) return true;
  if (resolved === "application/pdf" || resolved.endsWith("/pdf")) return true;
  if (resolved.startsWith("text/") || resolved === "application/json" || resolved === "application/xml") {
    return true;
  }
  return TEXT_EXTS.has(extOf(name));
}

export function formatAttachmentSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function attachmentNote(attachments: ChatAttachmentMeta[]) {
  if (attachments.length === 0) return "";
  return `[Attached: ${attachments.map((file) => file.name).join(", ")}]`;
}

export function contentForApi(turn: {
  content: string;
  attachments?: ChatAttachmentMeta[];
}) {
  const text = turn.content.trim();
  const note = turn.attachments?.length ? attachmentNote(turn.attachments) : "";
  return [text, note].filter(Boolean).join("\n\n");
}

export function stripAttachmentNote(text: string) {
  return text.replace(/(?:\n\n)?\[Attached: [^\]]+\]\s*$/, "").trim();
}

export function metaFromFile(file: File): ChatAttachmentMeta {
  return {
    name: file.name,
    mime: inferAttachmentMime(file.name, file.type) || file.type || "application/octet-stream",
    size: file.size,
  };
}

export async function filesToContentBlocks(
  files: File[],
): Promise<Anthropic.ContentBlockParam[]> {
  const blocks: Anthropic.ContentBlockParam[] = [];

  for (const file of files) {
    if (!isSupportedAttachment(file.name, file.type)) {
      throw new Error(`${file.name} isn’t a supported file type.`);
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      throw new Error(`${file.name} is larger than 10 MB.`);
    }

    const mime = inferAttachmentMime(file.name, file.type);
    const bytes = Buffer.from(await file.arrayBuffer());

    if (IMAGE_TYPES.has(mime)) {
      blocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mime as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
          data: bytes.toString("base64"),
        },
      });
      continue;
    }

    if (mime === "application/pdf" || mime.endsWith("/pdf")) {
      blocks.push({
        type: "document",
        title: file.name,
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: bytes.toString("base64"),
        },
      });
      continue;
    }

    const text = bytes.toString("utf8").slice(0, MAX_TEXT_CHARS);
    blocks.push({
      type: "document",
      title: file.name,
      source: {
        type: "text",
        media_type: "text/plain",
        data: text,
      },
    });
  }

  return blocks;
}

export function buildChatRequest(body: unknown, files?: File[]): RequestInit {
  if (files?.length) {
    const form = new FormData();
    form.append("payload", JSON.stringify(body));
    for (const file of files) form.append("files", file);
    return { method: "POST", body: form };
  }

  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}
