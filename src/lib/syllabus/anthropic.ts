import Anthropic, { toFile } from "@anthropic-ai/sdk";
import { readFile } from "fs/promises";
import { FILES_API_BETA } from "@/lib/syllabus/models";

export function anthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");
  return new Anthropic({ apiKey });
}

export function isPdf(mime: string) {
  return mime === "application/pdf" || mime.endsWith("/pdf");
}

export function isImage(mime: string) {
  return mime === "image/png" || mime === "image/jpeg" || mime === "image/jpg";
}

export async function uploadSyllabusFile(opts: {
  client: Anthropic;
  storedPath: string;
  filename: string;
  mime: string;
}) {
  const bytes = await readFile(opts.storedPath);
  const uploaded = await opts.client.beta.files.upload(
    {
      file: await toFile(bytes, opts.filename, { type: opts.mime }),
      betas: [FILES_API_BETA],
    },
  );
  return uploaded.id;
}

export function syllabusDocumentBlock(fileApiId: string, mime: string) {
  if (isImage(mime)) {
    return {
      type: "image" as const,
      source: { type: "file" as const, file_id: fileApiId },
      cache_control: { type: "ephemeral" as const },
    };
  }
  return {
    type: "document" as const,
    source: { type: "file" as const, file_id: fileApiId },
    cache_control: { type: "ephemeral" as const },
  };
}

export function textFromMessage(message: { content: Array<{ type: string; text?: string }> }) {
  return message.content
    .filter((block) => block.type === "text" && block.text)
    .map((block) => block.text as string)
    .join("\n")
    .trim();
}

export function parseJsonObject<T>(raw: string): T {
  const trimmed = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as T;
    }
    throw new Error("Model did not return valid JSON.");
  }
}

export function anthropicErrorMessage(err: unknown): string {
  if (!err || typeof err !== "object") {
    return err instanceof Error ? err.message : "Request failed.";
  }
  const record = err as {
    message?: string;
    error?: { message?: string; error?: { message?: string } };
  };
  const nested = record.error?.error?.message ?? record.error?.message;
  if (nested) return nested;
  const raw = record.message ?? "";
  const jsonStart = raw.indexOf("{");
  if (jsonStart >= 0) {
    try {
      const parsed = JSON.parse(raw.slice(jsonStart)) as {
        error?: { message?: string };
      };
      if (parsed.error?.message) return parsed.error.message;
    } catch {
      /* keep raw */
    }
  }
  return raw || "Request failed.";
}

export async function structuredMessage<T>(opts: {
  client: Anthropic;
  model: string;
  instruction: string;
  fileApiId: string;
  mime: string;
  maxTokens?: number;
}): Promise<T> {
  const response = await opts.client.beta.messages.create({
    model: opts.model,
    max_tokens: opts.maxTokens ?? 8000,
    betas: [FILES_API_BETA],
    thinking: { type: "disabled" },
    system: [
      {
        type: "text",
        text: "You read a course syllabus and return one JSON object. No markdown, no preamble, no chain-of-thought, no notes.",
        cache_control: { type: "ephemeral" as const },
      },
    ],
    messages: [
      {
        role: "user",
        content: [
          syllabusDocumentBlock(opts.fileApiId, opts.mime),
          {
            type: "text",
            text: `${opts.instruction}\n\nRespond with one JSON object only. No markdown.`,
          },
        ],
      },
    ],
  });

  return parseJsonObject<T>(textFromMessage(response));
}
