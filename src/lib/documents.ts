/**
 * Documents — the writing surface for document artifacts.
 *
 * Body content lives in `bodyHtml` (TipTap HTML). Legacy `blocks` are kept for
 * seeded data and converted on read when `bodyHtml` is missing.
 */

export type DocumentBlock = {
  id: string;
  text: string;
  /** The passage currently held as chat context. */
  highlight?: boolean;
};

export type DocumentStatus = "Draft" | "Submitted" | "Returned";

export type DocChatTurn = {
  role: "user" | "assistant";
  content: string;
  /** Readings the answer leaned on. Only the seeded turns carry these. */
  sources?: string[];
};

/** Writing-surface fields carried by document artifacts. */
export type DocumentContent = {
  /** Short name for the breadcrumb — the full title is too long for it. */
  shortTitle: string;
  course: string;
  due: string;
  status: DocumentStatus;
  savedAt: string;
  /** TipTap document HTML. Source of truth for the editor. */
  bodyHtml?: string;
  blocks: DocumentBlock[];
  thread: DocChatTurn[];
};

/** Shape consumed by the document editor / chat panel. */
export type DocumentRecord = DocumentContent & {
  id: string;
  title: string;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Convert legacy paragraph blocks into TipTap HTML. */
export function blocksToHtml(blocks: DocumentBlock[]): string {
  if (!blocks.length) return "<p></p>";
  return blocks
    .map((block) => {
      const inner = escapeHtml(block.text).replace(/\n/g, "<br>");
      if (!block.text.trim()) return "<p></p>";
      if (block.highlight) {
        return `<p><mark data-color="#F1EFE7" style="background-color: #F1EFE7">${inner}</mark></p>`;
      }
      return `<p>${inner}</p>`;
    })
    .join("");
}

/** Resolve the HTML body, falling back from legacy blocks. */
export function resolveBodyHtml(
  doc: Pick<DocumentContent, "bodyHtml" | "blocks">,
): string {
  if (typeof doc.bodyHtml === "string" && doc.bodyHtml.trim()) {
    return doc.bodyHtml;
  }
  return blocksToHtml(doc.blocks ?? []);
}

/** Plain text for word counts, chat context, and PDF export. */
export function htmlToPlainText(html: string): string {
  if (typeof document !== "undefined") {
    const el = document.createElement("div");
    el.innerHTML = html;
    return (el.textContent || "").replace(/\u00A0/g, " ").trim();
  }
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function emptyDocumentContent(title: string): DocumentContent {
  const shortTitle = title.length > 28 ? `${title.slice(0, 26)}…` : title;
  return {
    shortTitle,
    course: "",
    due: "",
    status: "Draft",
    savedAt: "Saved just now",
    bodyHtml: "<p></p>",
    blocks: [{ id: "b1", text: "" }],
    thread: [],
  };
}

/** The passage the chat panel quotes as its context chip. */
export function highlightedText(doc: Pick<DocumentRecord, "blocks">): string | null {
  return doc.blocks.find((b) => b.highlight)?.text ?? null;
}

export function wordCountFromHtml(html: string): number {
  const text = htmlToPlainText(html);
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

export function wordCount(
  doc: Pick<DocumentRecord, "blocks" | "bodyHtml">,
): number {
  return wordCountFromHtml(resolveBodyHtml(doc));
}
