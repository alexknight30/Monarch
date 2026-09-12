/**
 * Anthropic tools for the document writing surface.
 * The model can read / rewrite the active draft.
 */

import type Anthropic from "@anthropic-ai/sdk";
import {
  getArtifact,
  updateDocumentArtifact,
  type UpdateDocumentArtifactInput,
} from "@/lib/local-db";
import {
  htmlToPlainText,
  resolveBodyHtml,
  wordCountFromHtml,
} from "@/lib/documents";
import { isTextArtifact } from "@/lib/mock-data";
import type { ViewId } from "@/lib/views";
import type { ChatToolAction } from "@/lib/chat-tools";

export type DocumentChatContext = {
  slug: string;
  title?: string;
  bodyHtml?: string;
  bodyText?: string;
  selection?: string;
};

export const DOCUMENT_TOOLS: Anthropic.Tool[] = [
  {
    name: "get_document",
    description:
      "Read the student's current document draft (title, plain text, HTML, word count). Call this when you need the latest contents before advising or editing.",
    input_schema: {
      type: "object",
      properties: {
        slug: {
          type: "string",
          description: "Document artifact slug. Defaults to the open document.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "update_document",
    description:
      "Replace or append the document body. Prefer small targeted edits. Pass HTML paragraphs when possible (e.g. <p>…</p>). Do not write graded essays for the student — coach, outline, tighten, or cite.",
    input_schema: {
      type: "object",
      properties: {
        slug: {
          type: "string",
          description: "Document artifact slug. Defaults to the open document.",
        },
        mode: {
          type: "string",
          enum: ["replace", "append"],
          description: 'Defaults to "replace".',
        },
        body_html: {
          type: "string",
          description: "New HTML body (replace) or HTML to append.",
        },
        body_text: {
          type: "string",
          description:
            "Plain-text fallback when HTML is unavailable. Wrapped in <p> tags.",
        },
      },
      additionalProperties: false,
    },
  },
];

function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function textToHtml(text: string): string {
  const paras = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!paras.length) return "<p></p>";
  return paras
    .map(
      (p) =>
        `<p>${p
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
}

export async function executeDocumentTool(
  viewId: ViewId,
  name: string,
  input: Record<string, unknown>,
  fallbackSlug?: string,
): Promise<{ result: unknown; action?: ChatToolAction }> {
  switch (name) {
    case "get_document": {
      const slug = (asString(input.slug) || fallbackSlug || "").trim();
      if (!slug) throw new Error("slug is required.");
      const artifact = await getArtifact(viewId, slug);
      if (!artifact || !isTextArtifact(artifact)) {
        throw new Error(`Document not found: ${slug}`);
      }
      const bodyHtml = resolveBodyHtml(artifact);
      const bodyText = htmlToPlainText(bodyHtml);
      return {
        result: {
          slug: artifact.slug,
          title: artifact.title,
          course: artifact.course,
          status: artifact.status,
          wordCount: wordCountFromHtml(bodyHtml),
          bodyText,
          bodyHtml,
        },
      };
    }

    case "update_document": {
      const slug = (asString(input.slug) || fallbackSlug || "").trim();
      if (!slug) throw new Error("slug is required.");
      const mode = asString(input.mode) === "append" ? "append" : "replace";
      let nextHtml = asString(input.body_html)?.trim();
      if (!nextHtml) {
        const text = asString(input.body_text)?.trim();
        if (!text) throw new Error("body_html or body_text is required.");
        nextHtml = textToHtml(text);
      }

      const existing = await getArtifact(viewId, slug);
      if (!existing || !isTextArtifact(existing)) {
        throw new Error(`Document not found: ${slug}`);
      }

      const payload: UpdateDocumentArtifactInput = {
        bodyHtml:
          mode === "append"
            ? `${resolveBodyHtml(existing)}${nextHtml}`
            : nextHtml,
        savedAt: "Saved just now",
      };

      const artifact = await updateDocumentArtifact(viewId, slug, payload);
      if (!isTextArtifact(artifact)) {
        throw new Error("Updated artifact is not a document.");
      }

      const bodyHtml = resolveBodyHtml(artifact);
      return {
        result: {
          ok: true,
          slug: artifact.slug,
          title: artifact.title,
          wordCount: wordCountFromHtml(bodyHtml),
          bodyHtml,
          bodyText: htmlToPlainText(bodyHtml),
        },
        action: {
          tool: name,
          summary:
            mode === "append"
              ? `Appended to “${artifact.title}”`
              : `Updated “${artifact.title}”`,
          key: artifact.slug,
        },
      };
    }

    default:
      throw new Error(`Unknown document tool: ${name}`);
  }
}

/** System addendum so the model knows which draft is open. */
export function documentSystemAddendum(ctx: DocumentChatContext): string {
  const body =
    (ctx.bodyText && ctx.bodyText.trim()) ||
    (ctx.bodyHtml ? htmlToPlainText(ctx.bodyHtml) : "");
  const selection = ctx.selection?.trim();

  return [
    "The student has a document open in the editor.",
    `Document slug: ${ctx.slug}`,
    ctx.title ? `Title: ${ctx.title}` : "",
    selection ? `Current selection:\n"""${selection.slice(0, 2000)}"""` : "",
    body
      ? `Current draft (plain text):\n"""${body.slice(0, 12000)}"""`
      : "The draft is empty.",
    "Use read_object for a fresh full body and update_document to apply an edit the student asked for. Stay within academic guardrails.",
  ]
    .filter(Boolean)
    .join("\n");
}
