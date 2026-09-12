"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import { Color, FontFamily, TextStyle } from "@tiptap/extension-text-style";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import Paragraph from "@tiptap/extension-paragraph";
import Heading from "@tiptap/extension-heading";
import DocChatPanel from "./doc-chat-panel";
import DocToolbar, {
  DEFAULT_DOC_FONT,
  DEFAULT_LINE_HEIGHT,
} from "./doc-toolbar";
import { BreadcrumbBack } from "@/components/ui/breadcrumb-back";
import { useViewId } from "@/components/view-provider";
import {
  resolveBodyHtml,
  wordCountFromHtml,
  type DocumentRecord,
} from "@/lib/documents";
import { FontSize } from "@/lib/tiptap-font-size";
import { TypographyShortcuts } from "@/lib/tiptap-typography";
import {
  DEFAULT_BODY_FONT_SIZE,
  DEFAULT_TITLE_FONT_SIZE,
  displayFontSize,
  parseTrueFontSize,
} from "@/lib/doc-font";
import { reportCopy } from "@/lib/integrity";

const ParagraphWithLineHeight = Paragraph.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      lineHeight: {
        default: DEFAULT_LINE_HEIGHT,
        parseHTML: (element) => element.style.lineHeight || DEFAULT_LINE_HEIGHT,
        renderHTML: (attributes) => {
          if (!attributes.lineHeight) return {};
          return { style: `line-height: ${attributes.lineHeight}` };
        },
      },
    };
  },
});

const HeadingWithLineHeight = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      lineHeight: {
        default: DEFAULT_LINE_HEIGHT,
        parseHTML: (element) => element.style.lineHeight || DEFAULT_LINE_HEIGHT,
        renderHTML: (attributes) => {
          if (!attributes.lineHeight) return {};
          return { style: `line-height: ${attributes.lineHeight}` };
        },
      },
    };
  },
});

type DocumentWorkspaceProps = {
  doc: DocumentRecord;
  breadcrumbRoot?: string;
  onClose?: () => void;
  /** Notes use the same editor with less chrome. */
  variant?: "document" | "notes";
};

export default function DocumentWorkspace({
  doc,
  breadcrumbRoot = "Artifacts",
  onClose,
  variant = "document",
}: DocumentWorkspaceProps) {
  const viewId = useViewId();
  const [chatOpen, setChatOpen] = useState(false);
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [fontSize, setFontSize] = useState(DEFAULT_BODY_FONT_SIZE);
  const [titleFontSize, setTitleFontSize] = useState(DEFAULT_TITLE_FONT_SIZE);
  const [focusTarget, setFocusTarget] = useState<"title" | "body">("body");
  const [fontFamily, setFontFamily] = useState<string>(DEFAULT_DOC_FONT.css);
  const [lineHeight, setLineHeight] = useState<string>(DEFAULT_LINE_HEIGHT);
  const [zoom, setZoom] = useState(100);
  const [editMode, setEditMode] = useState<"editing" | "viewing">("editing");
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [title, setTitle] = useState(doc.title);
  const [savedAt, setSavedAt] = useState(doc.savedAt);
  const [words, setWords] = useState(() =>
    wordCountFromHtml(resolveBodyHtml(doc)),
  );
  const [selectionText, setSelectionText] = useState("");
  const [bodyHtml, setBodyHtml] = useState(() => resolveBodyHtml(doc));
  const saveTimer = useRef<number | null>(null);
  const applyingRemote = useRef(false);
  const bodyHtmlRef = useRef(bodyHtml);
  const titleRef = useRef(title);
  bodyHtmlRef.current = bodyHtml;
  titleRef.current = title;

  const initialHtml = useMemo(() => resolveBodyHtml(doc), [doc]);

  const persist = useCallback(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    setSavedAt("Saving…");
    saveTimer.current = window.setTimeout(() => {
      void (async () => {
        const nextTitle = titleRef.current.trim() || "Untitled";
        const shortTitle =
          nextTitle.length > 28 ? `${nextTitle.slice(0, 26)}…` : nextTitle;
        try {
          const res = await fetch(`/api/${viewId}/artifacts/${doc.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bodyHtml: bodyHtmlRef.current,
              title: nextTitle,
              shortTitle,
              savedAt: "Saved just now",
            }),
          });
          if (!res.ok) throw new Error("save failed");
          setSavedAt("Saved just now");
        } catch {
          setSavedAt("Save failed");
        }
      })();
    }, 600);
  }, [viewId, doc.id]);

  const persistRef = useRef(persist);
  persistRef.current = persist;

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        paragraph: false,
      }),
      ParagraphWithLineHeight,
      HeadingWithLineHeight.configure({ levels: [1, 2, 3] }),
      Underline,
      TextStyle,
      FontSize,
      FontFamily,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
      }),
      Image.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({ placeholder: "Start writing…" }),
      TypographyShortcuts,
    ],
    content: initialHtml,
    editable: editMode === "editing",
    editorProps: {
      attributes: {
        class:
          "doc-editor outline-none min-h-[50vh] text-[#1A1A1A] focus:outline-none",
      },
      handlePaste: () => {
        reportCopy(viewId, "document-paste");
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (applyingRemote.current) return;
      const html = ed.getHTML();
      bodyHtmlRef.current = html;
      setBodyHtml(html);
      setWords(wordCountFromHtml(html));
      persistRef.current();
    },
    onSelectionUpdate: ({ editor: ed }) => {
      const { from, to } = ed.state.selection;
      setSelectionText(from === to ? "" : ed.state.doc.textBetween(from, to, " "));
      setFocusTarget("body");
      const attrs = ed.getAttributes("textStyle");
      const size = parseTrueFontSize(attrs.fontSize as string | undefined);
      setFontSize(size ?? DEFAULT_BODY_FONT_SIZE);
      const family = attrs.fontFamily as string | undefined;
      if (family) setFontFamily(family);
    },
    onFocus: () => setFocusTarget("body"),
  });

  useEffect(() => {
    editor?.setEditable(editMode === "editing");
  }, [editor, editMode]);

  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, []);

  const applyRemoteHtml = useCallback(
    (html: string) => {
      if (!editor) return;
      applyingRemote.current = true;
      editor.commands.setContent(html, { emitUpdate: false });
      setBodyHtml(html);
      setWords(wordCountFromHtml(html));
      setSavedAt("Saved just now");
      applyingRemote.current = false;
    },
    [editor],
  );

  const runFind = () => {
    if (!editor || !findQuery.trim()) return;
    const q = findQuery.trim().toLowerCase();
    const { doc: proseDoc } = editor.state;
    const pos = editor.state.selection.to;
    let match: { from: number; to: number } | null = null;

    proseDoc.descendants((node, nodePos) => {
      if (match || !node.isText || !node.text) return;
      const lower = node.text.toLowerCase();
      const localStart = Math.max(0, pos - nodePos);
      const idx = lower.indexOf(q, localStart);
      if (idx >= 0 && nodePos + idx >= pos) {
        match = { from: nodePos + idx, to: nodePos + idx + q.length };
        return false;
      }
    });

    if (!match) {
      proseDoc.descendants((node, nodePos) => {
        if (match || !node.isText || !node.text) return;
        const idx = node.text.toLowerCase().indexOf(q);
        if (idx >= 0) {
          match = { from: nodePos + idx, to: nodePos + idx + q.length };
          return false;
        }
      });
    }

    if (match) {
      editor.chain().focus().setTextSelection(match).run();
    }
  };

  const metaLine = [doc.course, doc.due].filter(Boolean).join(" · ");
  const toolbarFontSize =
    focusTarget === "title" ? titleFontSize : fontSize;

  const handleFontSizeChange = (size: number) => {
    if (focusTarget === "title") {
      setTitleFontSize(size);
      return;
    }
    setFontSize(size);
    if (!editor) return;
    const { empty, from, to } = editor.state.selection;
    const chain = editor.chain().focus();
    if (empty) {
      chain
        .selectAll()
        .setFontSize(`${size}px`)
        .setTextSelection({ from, to })
        .run();
    } else {
      chain.setFontSize(`${size}px`).run();
    }
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-white">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#F0F0F0] px-[22px]">
        <div className="flex min-w-0 items-center gap-2">
          {onClose ? (
            <BreadcrumbBack
              onClick={onClose}
              className="text-[13px] leading-4 text-[#A0A0A0]"
            >
              {breadcrumbRoot}
            </BreadcrumbBack>
          ) : (
            <span className="text-[13px] leading-4 text-[#A0A0A0]">
              {breadcrumbRoot}
            </span>
          )}
          <span className="text-[13px] leading-4 text-[#D4D4D4]">/</span>
          <span className="truncate text-[13px] leading-4 font-medium text-[#1A1A1A]">
            {title.length > 28 ? `${title.slice(0, 26)}…` : title || doc.shortTitle}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-3.5">
          <span className="text-xs leading-4 text-[#A0A0A0]">
            {savedAt} · {words} words
          </span>

          <button
            type="button"
            onClick={() => setToolbarOpen((open) => !open)}
            aria-label={
              toolbarOpen ? "Hide formatting toolbar" : "Show formatting toolbar"
            }
            aria-pressed={toolbarOpen}
            className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md border transition-colors ${
              toolbarOpen
                ? "border-[#E6E6E6] bg-[#F4F4F4]"
                : "border-transparent hover:bg-[#F5F5F5]"
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path
                d="M4 20l.9-4L16.4 4.5a2.2 2.2 0 0 1 3.1 3.1L8 19.1z"
                fill="none"
                stroke={toolbarOpen ? "#0A0A0A" : "#3D3D3D"}
                strokeWidth={1.8}
                strokeLinejoin="round"
              />
              <path
                d="M14.5 6.5l3 3"
                fill="none"
                stroke={toolbarOpen ? "#0A0A0A" : "#3D3D3D"}
                strokeWidth={1.8}
                strokeLinecap="round"
              />
            </svg>
          </button>

          {variant === "document" ? (
            <button
              type="button"
              className="flex h-[30px] shrink-0 items-center rounded-md border border-[#E6E6E6] px-3 text-xs leading-4 font-medium text-[#3D3D3D] transition-colors hover:bg-[#F5F5F5]"
            >
              Share
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setChatOpen((open) => !open)}
            aria-label={chatOpen ? "Close chat" : "Open chat"}
            aria-pressed={chatOpen}
            className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md border transition-colors ${
              chatOpen
                ? "border-[#E6E6E6] bg-[#F4F4F4]"
                : "border-[#E6E6E6] hover:bg-[#F5F5F5]"
            }`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24">
              <rect
                x="3"
                y="4"
                width="18"
                height="16"
                rx="3"
                fill="none"
                stroke={chatOpen ? "#0A0A0A" : "#3D3D3D"}
                strokeWidth={1.7}
                strokeLinejoin="round"
              />
              <path
                d="M15 4v16"
                fill="none"
                stroke={chatOpen ? "#0A0A0A" : "#3D3D3D"}
                strokeWidth={1.7}
              />
            </svg>
          </button>

          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close document"
              className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md border border-[#E6E6E6] transition-colors hover:bg-[#F5F5F5]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  fill="none"
                  stroke="#3D3D3D"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                />
              </svg>
            </button>
          ) : null}
        </div>
      </div>

      {toolbarOpen ? (
        <DocToolbar
          editor={editor}
          fontSize={toolbarFontSize}
          onFontSizeChange={handleFontSizeChange}
          titleFontSize={titleFontSize}
          fontFamily={fontFamily}
          onFontFamilyChange={setFontFamily}
          lineHeight={lineHeight}
          onLineHeightChange={setLineHeight}
          zoom={zoom}
          onZoomChange={setZoom}
          editMode={editMode}
          onEditModeChange={setEditMode}
          onFindOpen={() => setFindOpen(true)}
          docTitle={title}
          compact={variant === "notes"}
        />
      ) : null}

      {findOpen ? (
        <div className="flex h-11 shrink-0 items-center gap-2 border-b border-[#F0F0F0] px-[18px]">
          <input
            autoFocus
            value={findQuery}
            onChange={(e) => setFindQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                runFind();
              }
              if (e.key === "Escape") setFindOpen(false);
            }}
            placeholder="Find in document"
            className="h-8 min-w-0 flex-1 rounded-md border border-[#E6E6E6] px-3 text-[13px] outline-none"
          />
          <button
            type="button"
            onClick={runFind}
            className="h-8 rounded-md bg-[#141414] px-3 text-[13px] font-medium text-white"
          >
            Find
          </button>
          <button
            type="button"
            onClick={() => setFindOpen(false)}
            className="h-8 rounded-md px-2 text-[13px] text-[#6B6B6B] hover:bg-[#F5F5F5]"
          >
            Close
          </button>
        </div>
      ) : null}

      <div
        className={`min-h-0 flex-1 overflow-y-auto ${toolbarOpen ? "pt-6" : "pt-16"} ${
          chatOpen ? "pr-[388px]" : ""
        }`}
      >
        <div
          className="mx-auto flex w-[700px] origin-top flex-col pb-24"
          style={{
            transform: `scale(${zoom / 100})`,
            width: `${700 / (zoom / 100)}px`,
            maxWidth: "100%",
          }}
        >
          <div className="flex shrink-0 items-center gap-2.5">
            {variant === "document" ? (
              <div className="flex h-[22px] shrink-0 items-center gap-1.5 rounded-full bg-[#F4F4F4] px-2.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#A0A0A0]" />
                <span className="text-[11px] leading-4 font-medium tracking-[0.04em] text-[#6B6B6B]">
                  {doc.status.toUpperCase()}
                </span>
              </div>
            ) : (
              <span className="text-[11px] leading-4 font-medium tracking-[0.04em] text-[#9A9A98]">
                Notes
              </span>
            )}
            {metaLine ? (
              <span className="text-xs leading-4 text-[#8A8A8A]">{metaLine}</span>
            ) : null}
          </div>

          <input
            value={title}
            readOnly={editMode === "viewing"}
            onFocus={() => setFocusTarget("title")}
            onChange={(e) => {
              const next = e.target.value;
              titleRef.current = next;
              setTitle(next);
              persist();
            }}
            onBlur={() => {
              if (titleRef.current.trim()) return;
              titleRef.current = "Untitled";
              setTitle("Untitled");
              persist();
            }}
            placeholder="Untitled"
            aria-label="Document title"
            className="w-full bg-transparent pt-[18px] font-bold text-[#0A0A0A] outline-none placeholder:text-[#C4C4C0]"
            style={{
              fontFamily,
              fontSize: displayFontSize(titleFontSize),
              lineHeight,
            }}
          />

          <div
            className="pt-[34px]"
            style={{
              fontSize: `${displayFontSize(DEFAULT_BODY_FONT_SIZE)}px`,
              lineHeight,
              fontFamily,
            }}
          >
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      {chatOpen ? (
        <DocChatPanel
          doc={doc}
          bodyHtml={bodyHtml}
          selection={selectionText}
          onClose={() => setChatOpen(false)}
          onDocumentUpdate={applyRemoteHtml}
        />
      ) : null}
    </div>
  );
}
