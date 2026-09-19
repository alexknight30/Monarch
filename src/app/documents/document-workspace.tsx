"use client";
import { DesignCopy } from "@/components/design/runtime";


import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { Mathematics, migrateMathStrings } from "@tiptap/extension-mathematics";
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
import { readArtifactDraft, useArtifactSave } from "@/lib/use-artifact-save";

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
  const [comments, setComments] = useState(doc.comments ?? []);
  const [chatTurns, setChatTurns] = useState(doc.thread);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const { save, retry, status: savedAt, error: saveError } = useArtifactSave(doc.id, undefined, doc);
  const [words, setWords] = useState(() =>
    wordCountFromHtml(resolveBodyHtml(doc)),
  );
  const [selectionText, setSelectionText] = useState("");
  const [bodyHtml, setBodyHtml] = useState(() => resolveBodyHtml(doc));
  const applyingRemote = useRef(false);
  const bodyHtmlRef = useRef(bodyHtml);
  const titleRef = useRef(title);

  const initialHtml = useMemo(() => resolveBodyHtml(doc), [doc]);

  const persist = useCallback(() => {
    const nextTitle = titleRef.current.trim() || "Untitled";
    save({ bodyHtml: bodyHtmlRef.current, title: nextTitle,
      shortTitle: nextTitle.length > 28 ? `${nextTitle.slice(0, 26)}…` : nextTitle,
      savedAt: "Saved just now" });
  }, [save]);

  const persistRef = useRef(persist);
  useEffect(() => { persistRef.current = persist; }, [persist]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        paragraph: false,
        link: false,
        underline: false,
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
      Mathematics.configure({
        katexOptions: { throwOnError: false },
      }),
    ],
    content: initialHtml,
    editable: editMode === "editing",
    onCreate: ({ editor: ed }) => { migrateMathStrings(ed); },
    editorProps: {
      handleClickOn: (view, _pos, node, nodePos) => {
        if (!view.editable || !["inlineMath", "blockMath"].includes(node.type.name)) return false;
        const latex = window.prompt("Edit equation (TeX)", String(node.attrs.latex));
        if (latex?.trim()) view.dispatch(view.state.tr.setNodeMarkup(nodePos, undefined, { ...node.attrs, latex: latex.trim() }));
        return true;
      },
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
    if (!editor) return;
    const draft = readArtifactDraft(viewId, doc.id);
    if (!draft) return;
    if (typeof draft.bodyHtml === "string") {
      editor.commands.setContent(draft.bodyHtml, { emitUpdate: false });
      bodyHtmlRef.current = draft.bodyHtml;
      // Recover browser-only edits after the editor mounts.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBodyHtml(draft.bodyHtml); setWords(wordCountFromHtml(draft.bodyHtml));
    }
    if (typeof draft.title === "string") { titleRef.current = draft.title; setTitle(draft.title); }
    if (Array.isArray(draft.comments)) setComments(draft.comments as NonNullable<DocumentRecord["comments"]>);
    if (Array.isArray(draft.thread)) setChatTurns(draft.thread as DocumentRecord["thread"]);
    save(draft);
  }, [editor, doc.id, viewId, save]);

  const applyRemoteHtml = useCallback(
    (html: string) => {
      if (!editor) return;
      applyingRemote.current = true;
      editor.commands.setContent(html, { emitUpdate: false });
      setBodyHtml(html);
      setWords(wordCountFromHtml(html));
      bodyHtmlRef.current = html;
      applyingRemote.current = false;
      persist();
    },
    [editor, persist],
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
    <div data-design-id="m-3f8d44e494ca" className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">
      <div data-design-id="m-2b3722127a18" className="flex h-14 shrink-0 items-center justify-between border-b border-[#F0F0F0] px-[22px]">
        <div data-design-id="m-424b946933c1" className="flex min-w-0 items-center gap-2">
          {onClose ? (
            <BreadcrumbBack
              onClick={onClose}
              className="text-[13px] leading-4 text-[#A0A0A0]"
            >
              {breadcrumbRoot}
            </BreadcrumbBack>
          ) : (
            <span data-design-id="m-af1b865ab651" className="text-[13px] leading-4 text-[#A0A0A0]">
              {breadcrumbRoot}
            </span>
          )}
          <span data-design-id="m-ef713b77da73" className="text-[13px] leading-4 text-[#D4D4D4]"><DesignCopy id="m-ef713b77da73">/</DesignCopy></span>
          <span data-design-id="m-717484cd54b4" className="truncate text-[13px] leading-4 font-medium text-[#1A1A1A]">
            {title.length > 28 ? `${title.slice(0, 26)}…` : title || doc.shortTitle}
          </span>
        </div>

        <div data-design-id="m-241bf112ac3a" className="flex shrink-0 items-center gap-3.5">
          <span data-design-id="m-77c9e0141f63" className="text-xs leading-4 text-[#A0A0A0]">
            {savedAt} · {words} words
          </span>
          {saveError && <button data-design-id="m-0c4d230cdc38" title={saveError} className="text-xs text-red-700" onClick={() => void retry()}><DesignCopy id="m-0c4d230cdc38">Retry save</DesignCopy></button>}
          <button data-design-id="m-e945c4339c42" className="text-xs text-stone-500" onClick={() => setCommentsOpen(v => !v)}>Comments ({comments.filter(c => !c.resolved).length})</button>

          <button data-design-id="m-e9d656d0d3b7"
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
            <button data-design-id="m-2698c8ed7b2e"
              type="button"
              className="flex h-[30px] shrink-0 items-center rounded-md border border-[#E6E6E6] px-3 text-xs leading-4 font-medium text-[#3D3D3D] transition-colors hover:bg-[#F5F5F5]"
            ><DesignCopy id="m-2698c8ed7b2e">
              Share
            </DesignCopy></button>
          ) : null}

          <button data-design-id="m-329a8872cd52"
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
            <button data-design-id="m-f4a2cf56097b"
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
          onAddComment={(quote, text) => {
            const next = [...comments, { id: crypto.randomUUID(), quote, text, createdAt: new Date().toISOString() }];
            setComments(next); save({ comments: next }); setCommentsOpen(true);
          }}
          docTitle={title}
          compact={variant === "notes"}
        />
      ) : null}

      {findOpen ? (
        <div data-design-id="m-6f80e74fc879" className="flex h-11 shrink-0 items-center gap-2 border-b border-[#F0F0F0] px-[18px]">
          <input data-design-id="m-7a057aa3f771"
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
          <button data-design-id="m-4bb0d956170d"
            type="button"
            onClick={runFind}
            className="h-8 rounded-md bg-[#141414] px-3 text-[13px] font-medium text-white"
          ><DesignCopy id="m-4bb0d956170d">
            Find
          </DesignCopy></button>
          <button data-design-id="m-4fb31f30c319"
            type="button"
            onClick={() => setFindOpen(false)}
            className="h-8 rounded-md px-2 text-[13px] text-[#6B6B6B] hover:bg-[#F5F5F5]"
          ><DesignCopy id="m-4fb31f30c319">
            Close
          </DesignCopy></button>
        </div>
      ) : null}

      <div data-design-id="m-40d68264772f"
        className={`min-h-0 flex-1 overflow-y-auto ${toolbarOpen ? "pt-6" : "pt-16"} ${
          chatOpen ? "pr-[388px]" : ""
        }`}
      >
        <div data-design-id="m-d11a618b9ee1"
          className="mx-auto flex w-[700px] origin-top flex-col pb-24"
          style={{
            transform: `scale(${zoom / 100})`,
            width: `${700 / (zoom / 100)}px`,
            maxWidth: "100%",
          }}
        >
          <div data-design-id="m-a732f8d6c08f" className="flex shrink-0 items-center gap-2.5">
            {variant === "document" ? (
              <div data-design-id="m-7086d58887b1" className="flex h-[22px] shrink-0 items-center gap-1.5 rounded-full bg-[#F4F4F4] px-2.5">
                <span data-design-id="m-8d2acf14ae73" className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#A0A0A0]" />
                <span data-design-id="m-37b045ad22bf" className="text-[11px] leading-4 font-medium tracking-[0.04em] text-[#6B6B6B]">
                  {doc.status.toUpperCase()}
                </span>
              </div>
            ) : (
              <span data-design-id="m-346337e67f8d" className="text-[11px] leading-4 font-medium tracking-[0.04em] text-[#9A9A98]"><DesignCopy id="m-346337e67f8d">
                Notes
              </DesignCopy></span>
            )}
            {metaLine ? (
              <span data-design-id="m-1a7412e4bf44" className="text-xs leading-4 text-[#8A8A8A]">{metaLine}</span>
            ) : null}
          </div>

          <input data-design-id="m-c777839ac21e"
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

          <div data-design-id="m-84d486846ebd"
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
          turns={chatTurns}
          onTurnsChange={next=>{setChatTurns(next);save({thread:next});}}
          bodyHtml={bodyHtml}
          selection={selectionText}
          onClose={() => setChatOpen(false)}
          onDocumentUpdate={applyRemoteHtml}
        />
      ) : null}
      {commentsOpen && <aside data-design-id="m-efc98ff9910b" className="absolute top-20 right-6 bottom-6 z-40 w-80 overflow-y-auto rounded-xl border border-stone-200 bg-white p-5 shadow-xl">
        <div data-design-id="m-a7976de86e20" className="mb-5 flex justify-between text-sm font-medium"><span data-design-id="m-8b3a5c83f4d0"><DesignCopy id="m-8b3a5c83f4d0">Comments</DesignCopy></span><button data-design-id="m-6162b312a6f6" onClick={() => setCommentsOpen(false)}><DesignCopy id="m-6162b312a6f6">Close</DesignCopy></button></div>
        {!comments.length && <p data-design-id="m-413108ba7567" className="text-sm text-stone-400"><DesignCopy id="m-413108ba7567">Select a passage, then use Add comment in the formatting toolbar.</DesignCopy></p>}
        {comments.map(comment => <div data-design-id="m-39652ba23238" data-design-key={comment.id} key={comment.id} className={"mb-4 space-y-2 rounded-lg border border-stone-100 p-3 " + (comment.resolved ? "opacity-50" : "")}>
          {comment.quote && <blockquote data-design-id="m-736a6f32d06c" className="border-l-2 border-amber-300 pl-2 text-xs text-stone-500">{comment.quote}</blockquote>}
          <textarea data-design-id="m-7c99d601495a" aria-label="Comment text" className="w-full text-sm outline-none" value={comment.text} onChange={e => { const next = comments.map(c => c.id === comment.id ? { ...c, text: e.target.value } : c); setComments(next); save({ comments: next }); }} />
          <div data-design-id="m-ed86d94f89d7" className="flex gap-3 text-xs"><button data-design-id="m-74ae08d288bc" onClick={() => { const next = comments.map(c => c.id === comment.id ? { ...c, resolved: !c.resolved } : c); setComments(next); save({ comments: next }); }}>{comment.resolved ? "Reopen" : "Resolve"}</button><button data-design-id="m-ca1412148259" className="text-red-700" onClick={() => { const next = comments.filter(c => c.id !== comment.id); setComments(next); save({ comments: next }); }}><DesignCopy id="m-ca1412148259">Delete</DesignCopy></button></div>
        </div>)}
      </aside>}
    </div>
  );
}
