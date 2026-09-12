"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import { jsPDF } from "jspdf";
import { DEFAULT_BODY_FONT_SIZE } from "@/lib/doc-font";

const ICON = {
  fill: "none",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const BLOCK_OPTIONS = [
  { label: "Body text", value: "paragraph" },
  { label: "Heading 1", value: "h1" },
  { label: "Heading 2", value: "h2" },
  { label: "Heading 3", value: "h3" },
] as const;

const ZOOM_OPTIONS = [50, 75, 90, 100, 125, 150, 200] as const;
const ALIGN_OPTIONS = ["left", "center", "right", "justify"] as const;
const TEXT_COLORS = ["#0A0A0A", "#B42318", "#B54708", "#027A48", "#175CD3", "#6941C6"];
const HIGHLIGHT_COLORS = ["#F1EFE7", "#FEF0C7", "#D1FADF", "#D1E9FF", "#FCE7F6", "transparent"];

export const DOC_FONTS = [
  { label: "Times New Roman", css: '"Times New Roman", Times, serif' },
  { label: "Arial", css: "Arial, Helvetica, sans-serif" },
  { label: "Newsreader", css: "var(--font-newsreader), Georgia, serif" },
] as const;

export const DEFAULT_DOC_FONT = DOC_FONTS[0];

export const LINE_SPACING_OPTIONS = [
  { label: "Single spaced", value: "1" },
  { label: "1.15", value: "1.15" },
  { label: "1.25", value: "1.25" },
  { label: "1.5", value: "1.5" },
  { label: "1.75", value: "1.75" },
  { label: "Double spaced", value: "2" },
] as const;

export const DEFAULT_LINE_HEIGHT = "1.15";

type MenuName =
  | "zoom"
  | "block"
  | "font"
  | "align"
  | "spacing"
  | "color"
  | "highlight"
  | "mode";

type DocToolbarProps = {
  editor: Editor | null;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  fontFamily: string;
  onFontFamilyChange: (font: string) => void;
  lineHeight: string;
  onLineHeightChange: (value: string) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  editMode: "editing" | "viewing";
  onEditModeChange: (mode: "editing" | "viewing") => void;
  onFindOpen: () => void;
  docTitle: string;
  titleFontSize: number;
  compact?: boolean;
};

function Btn({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md transition-colors disabled:opacity-40 ${
        active ? "bg-[#F4F4F4]" : "hover:bg-[#F5F5F5]"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="h-5 w-px shrink-0 bg-[#E8E8E8]" />;
}

function Chevron() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" className="shrink-0">
      <path d="M6 9.5l6 6 6-6" {...ICON} stroke="#8A8A8A" strokeWidth={2.2} />
    </svg>
  );
}

function Menu({
  open,
  onClose,
  anchorRef,
  align = "start",
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  align?: "start" | "end";
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, right: 0 });

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setCoords({
      top: rect.bottom + 4,
      left: rect.left,
      right: window.innerWidth - rect.right,
    });
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open, onClose, anchorRef]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={ref}
      onMouseDown={(e) => e.preventDefault()}
      className={`z-[80] min-w-[140px] overflow-hidden rounded-lg border border-[#E6E6E6] bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)] ${className ?? ""}`}
      style={{
        position: "fixed",
        top: coords.top,
        ...(align === "end" ? { right: coords.right } : { left: coords.left }),
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

function fontFace(family: string | undefined): "times" | "helvetica" {
  if (family?.toLowerCase().includes("arial")) return "helvetica";
  return "times";
}

function fontStyle(bold: boolean, italic: boolean): "normal" | "bold" | "italic" | "bolditalic" {
  if (bold && italic) return "bolditalic";
  if (bold) return "bold";
  if (italic) return "italic";
  return "normal";
}

function downloadPdf(
  editor: Editor,
  title: string,
  titleSize: number,
  lineHeight: number,
) {
  const pdf = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 54;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const width = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (h: number) => {
    if (y + h <= pageHeight - margin) return;
    pdf.addPage();
    y = margin;
  };

  pdf.setFont("times", "bold");
  pdf.setFontSize(titleSize);
  const titleLh = titleSize * lineHeight;
  const titleLines = pdf.splitTextToSize(title || "Document", width);
  for (const line of titleLines) {
    ensureSpace(titleLh);
    pdf.text(line, margin, y);
    y += titleLh;
  }
  y += titleSize * 0.5;

  editor.state.doc.forEach((block) => {
    if (!block.isTextblock) return;

    const runs: {
      text: string;
      size: number;
      bold: boolean;
      italic: boolean;
      family: string | undefined;
    }[] = [];

    block.forEach((child) => {
      if (!child.isText || !child.text) return;
      const sizeAttr = child.marks.find((m) => m.attrs.fontSize)?.attrs
        .fontSize as string | undefined;
      const parsed = sizeAttr ? Number.parseInt(sizeAttr, 10) : NaN;
      runs.push({
        text: child.text,
        size: Number.isFinite(parsed) ? parsed : DEFAULT_BODY_FONT_SIZE,
        bold: child.marks.some((m) => m.type.name === "bold"),
        italic: child.marks.some((m) => m.type.name === "italic"),
        family: child.marks.find((m) => m.attrs.fontFamily)?.attrs.fontFamily as
          | string
          | undefined,
      });
    });

    if (runs.length === 0) {
      y += DEFAULT_BODY_FONT_SIZE * lineHeight;
      return;
    }

    let x = margin;
    let rowSize = runs[0].size;
    for (const run of runs) {
      pdf.setFont(fontFace(run.family), fontStyle(run.bold, run.italic));
      pdf.setFontSize(run.size);
      const lh = run.size * lineHeight;
      rowSize = Math.max(rowSize, run.size);
      const parts = run.text.split(/(\s+)/);
      for (const part of parts) {
        if (!part) continue;
        const w = pdf.getTextWidth(part);
        if (x > margin && x + w > margin + width) {
          y += rowSize * lineHeight;
          x = margin;
          rowSize = run.size;
          ensureSpace(lh);
        } else {
          ensureSpace(lh);
        }
        pdf.text(part, x, y);
        x += w;
      }
    }
    y += rowSize * lineHeight;
  });

  const safe = (title || "document").replace(/[^\w\-]+/g, "-").slice(0, 48);
  pdf.save(`${safe || "document"}.pdf`);
}

export default function DocToolbar({
  editor,
  fontSize,
  onFontSizeChange,
  fontFamily,
  onFontFamilyChange,
  lineHeight,
  onLineHeightChange,
  zoom,
  onZoomChange,
  editMode,
  onEditModeChange,
  onFindOpen,
  docTitle,
  titleFontSize,
  compact = false,
}: DocToolbarProps) {
  const [openMenu, setOpenMenu] = useState<MenuName | null>(null);
  const closeMenus = useCallback(() => setOpenMenu(null), []);
  const [, tick] = useState(0);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const zoomRef = useRef<HTMLDivElement>(null);
  const blockRef = useRef<HTMLDivElement>(null);
  const fontRef = useRef<HTMLDivElement>(null);
  const colorRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const alignRef = useRef<HTMLDivElement>(null);
  const spacingRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor) return;
    const update = () => tick((n) => n + 1);
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor]);

  const disabled = !editor || editMode === "viewing";
  const canUndo = Boolean(editor?.can().undo());
  const canRedo = Boolean(editor?.can().redo());

  const blockLabel = editor?.isActive("heading", { level: 1 })
    ? "Heading 1"
    : editor?.isActive("heading", { level: 2 })
      ? "Heading 2"
      : editor?.isActive("heading", { level: 3 })
        ? "Heading 3"
        : "Body text";

  const align = ALIGN_OPTIONS.find((a) => editor?.isActive({ textAlign: a })) ?? "left";
  const currentLineHeight =
    (editor?.getAttributes("paragraph").lineHeight as string | undefined) ||
    (editor?.getAttributes("heading").lineHeight as string | undefined) ||
    lineHeight;
  const currentFont =
    (editor?.getAttributes("textStyle").fontFamily as string | undefined) || fontFamily;
  const fontLabel =
    DOC_FONTS.find((f) => f.css === currentFont)?.label ?? "Times New Roman";

  const applyFontSize = (size: number) => {
    const next = Math.min(96, Math.max(8, size));
    onFontSizeChange(next);
  };

  const setBlock = (value: (typeof BLOCK_OPTIONS)[number]["value"]) => {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (value === "paragraph") chain.setParagraph().run();
    else if (value === "h1") chain.toggleHeading({ level: 1 }).run();
    else if (value === "h2") chain.toggleHeading({ level: 2 }).run();
    else chain.toggleHeading({ level: 3 }).run();
    setOpenMenu(null);
  };

  const setLineSpacing = (value: string) => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .command(({ tr, state }) => {
        state.doc.descendants((node, pos) => {
          if (node.type.name === "paragraph" || node.type.name === "heading") {
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              lineHeight: value,
            });
          }
        });
        return true;
      })
      .run();
    onLineHeightChange(value);
    setOpenMenu(null);
  };

  const setFont = (css: string) => {
    onFontFamilyChange(css);
    if (!editor) {
      setOpenMenu(null);
      return;
    }
    const { empty, from, to } = editor.state.selection;
    const chain = editor.chain().focus();
    if (empty) {
      chain.selectAll().setFontFamily(css).setTextSelection({ from, to }).run();
    } else {
      chain.setFontFamily(css).run();
    }
    setOpenMenu(null);
  };

  const insertLink = () => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev || "https://");
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url.trim() })
      .run();
  };

  const addComment = () => {
    if (!editor) return;
    const note = window.prompt("Comment");
    if (!note?.trim()) return;
    editor.chain().focus().setHighlight({ color: "#FEF0C7" }).run();
    window.alert(`Comment saved on selection:\n\n${note.trim()}`);
  };

  return (
    <div className="flex h-12 shrink-0 items-center gap-2 overflow-x-auto px-[18px]">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file || !editor) return;
          const reader = new FileReader();
          reader.onload = () => {
            const src = typeof reader.result === "string" ? reader.result : "";
            if (src) editor.chain().focus().setImage({ src }).run();
          };
          reader.readAsDataURL(file);
        }}
      />

      <div className="flex shrink-0 items-center gap-0.5">
        <Btn label="Search the document" onClick={onFindOpen}>
          <svg width="16" height="16" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="6.5" {...ICON} stroke="#3D3D3D" />
            <path d="M15.8 15.8L20 20" {...ICON} stroke="#3D3D3D" />
          </svg>
        </Btn>
        <Btn
          label="Undo"
          disabled={disabled || !canUndo}
          onClick={() => editor?.chain().focus().undo().run()}
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path
              d="M4 9h9.5a5 5 0 0 1 0 10H8"
              {...ICON}
              stroke={canUndo && !disabled ? "#3D3D3D" : "#A0A0A0"}
            />
            <path
              d="M7.5 5L3.5 9l4 4"
              {...ICON}
              stroke={canUndo && !disabled ? "#3D3D3D" : "#A0A0A0"}
            />
          </svg>
        </Btn>
        <Btn
          label="Redo"
          disabled={disabled || !canRedo}
          onClick={() => editor?.chain().focus().redo().run()}
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path
              d="M20 9h-9.5a5 5 0 0 0 0 10H16"
              {...ICON}
              stroke={canRedo && !disabled ? "#3D3D3D" : "#A0A0A0"}
            />
            <path
              d="M16.5 5l4 4-4 4"
              {...ICON}
              stroke={canRedo && !disabled ? "#3D3D3D" : "#A0A0A0"}
            />
          </svg>
        </Btn>
        {compact ? null : (
          <Btn
            label="Download PDF"
            disabled={!editor}
            onClick={() =>
              editor &&
              void downloadPdf(
                editor,
                docTitle,
                titleFontSize,
                Number.parseFloat(lineHeight) || 1.15,
              )
            }
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path d="M7 9V3.5h10V9" {...ICON} stroke="#3D3D3D" />
              <path d="M7 17H4.5V9h15v8H17" {...ICON} stroke="#3D3D3D" />
              <path d="M7 13.5h10v7H7z" {...ICON} stroke="#3D3D3D" />
            </svg>
          </Btn>
        )}
      </div>

      <Divider />

      <div ref={zoomRef} className="relative shrink-0">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setOpenMenu(openMenu === "zoom" ? null : "zoom")}
          className="flex h-[30px] shrink-0 items-center justify-between gap-1.5 rounded-md pr-2 pl-2.5 transition-colors hover:bg-[#F5F5F5]"
        >
          <span className="text-[13px] leading-4 text-[#3D3D3D]">{zoom}%</span>
          <Chevron />
        </button>
        <Menu
          open={openMenu === "zoom"}
          onClose={closeMenus}
          anchorRef={zoomRef}
        >
          {ZOOM_OPTIONS.map((z) => (
            <button
              key={z}
              type="button"
              className={`flex w-full px-3 py-1.5 text-left text-[13px] ${
                z === zoom ? "bg-[#F4F4F4] text-[#0A0A0A]" : "text-[#3D3D3D] hover:bg-[#F7F7F7]"
              }`}
              onClick={() => {
                onZoomChange(z);
                setOpenMenu(null);
              }}
            >
              {z}%
            </button>
          ))}
        </Menu>
      </div>

      <Divider />

      <div ref={blockRef} className="relative shrink-0">
        <button
          type="button"
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setOpenMenu(openMenu === "block" ? null : "block")}
          className="flex h-[30px] w-[126px] shrink-0 items-center justify-between gap-1.5 rounded-md pr-2 pl-2.5 transition-colors hover:bg-[#F5F5F5] disabled:opacity-40"
        >
          <span className="text-[13px] leading-4 text-[#3D3D3D]">{blockLabel}</span>
          <Chevron />
        </button>
        <Menu
          open={openMenu === "block"}
          onClose={closeMenus}
          anchorRef={blockRef}
        >
          {BLOCK_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`flex w-full px-3 py-1.5 text-left text-[13px] ${
                opt.label === blockLabel
                  ? "bg-[#F4F4F4] text-[#0A0A0A]"
                  : "text-[#3D3D3D] hover:bg-[#F7F7F7]"
              }`}
              onClick={() => setBlock(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </Menu>
      </div>

      <Divider />

      <div ref={fontRef} className="relative shrink-0">
        <button
          type="button"
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setOpenMenu(openMenu === "font" ? null : "font")}
          className="flex h-[30px] w-[158px] shrink-0 items-center justify-between gap-1.5 rounded-md pr-2 pl-2.5 text-left transition-colors hover:bg-[#F5F5F5] disabled:opacity-40"
          title="Font family"
        >
          <span className="truncate text-[13px] leading-4 text-[#3D3D3D]">
            {fontLabel}
          </span>
          <Chevron />
        </button>
        <Menu
          open={openMenu === "font"}
          onClose={closeMenus}
          anchorRef={fontRef}
        >
          {DOC_FONTS.map((font) => (
            <button
              key={font.label}
              type="button"
              className={`flex w-full px-3 py-1.5 text-left text-[13px] ${
                font.css === currentFont
                  ? "bg-[#F4F4F4] text-[#0A0A0A]"
                  : "text-[#3D3D3D] hover:bg-[#F7F7F7]"
              }`}
              style={{ fontFamily: font.css }}
              onClick={() => setFont(font.css)}
            >
              {font.label}
            </button>
          ))}
        </Menu>
      </div>

      <Divider />

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          aria-label="Decrease font size"
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyFontSize(fontSize - 1)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[#F5F5F5] disabled:opacity-40"
        >
          <svg width="13" height="13" viewBox="0 0 24 24">
            <path d="M5 12h14" {...ICON} stroke="#3D3D3D" strokeWidth={2} />
          </svg>
        </button>
        <input
          type="number"
          min={8}
          max={96}
          value={fontSize}
          disabled={disabled}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) applyFontSize(n);
          }}
          className="h-7 w-10 shrink-0 rounded-[5px] border border-[#E6E6E6] bg-white text-center text-[13px] leading-4 text-[#3D3D3D] outline-none disabled:opacity-40"
        />
        <button
          type="button"
          aria-label="Increase font size"
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyFontSize(fontSize + 1)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[#F5F5F5] disabled:opacity-40"
        >
          <svg width="13" height="13" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14" {...ICON} stroke="#3D3D3D" strokeWidth={2} />
          </svg>
        </button>
      </div>

      <Divider />

      <div className="flex shrink-0 items-center gap-0.5">
        <Btn
          label="Bold"
          active={editor?.isActive("bold")}
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path
              d="M7 4h6.5a4 4 0 0 1 0 8H7zM7 12h7.5a4 4 0 0 1 0 8H7z"
              {...ICON}
              stroke={editor?.isActive("bold") ? "#0A0A0A" : "#3D3D3D"}
              strokeWidth={1.9}
            />
          </svg>
        </Btn>
        <Btn
          label="Italic"
          active={editor?.isActive("italic")}
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path
              d="M15.5 4h-6M14.5 20h-6M13.5 4l-3 16"
              {...ICON}
              stroke={editor?.isActive("italic") ? "#0A0A0A" : "#3D3D3D"}
              strokeWidth={1.9}
            />
          </svg>
        </Btn>
        <Btn
          label="Underline"
          active={editor?.isActive("underline")}
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path
              d="M6.5 4v7a5.5 5.5 0 0 0 11 0V4M5.5 20h13"
              {...ICON}
              stroke={editor?.isActive("underline") ? "#0A0A0A" : "#3D3D3D"}
              strokeWidth={1.9}
            />
          </svg>
        </Btn>
        <Btn
          label="Insert equation"
          disabled={disabled}
          onClick={() => {
            if (!editor) return;
            const tex = window.prompt("Equation (TeX)", "E = mc^2");
            if (!tex?.trim()) return;
            editor.chain().focus().insertContent(`$${tex.trim()}$`).run();
          }}
        >
          <span className="font-serif text-[15px] leading-none text-[#3D3D3D]">
            ∑
          </span>
        </Btn>

        <div ref={colorRef} className="relative">
          <button
            type="button"
            aria-label="Text color"
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setOpenMenu(openMenu === "color" ? null : "color")}
            className="flex h-[30px] w-[30px] shrink-0 flex-col items-center justify-center gap-[3px] rounded-md transition-colors hover:bg-[#F5F5F5] disabled:opacity-40"
          >
            <svg width="15" height="11" viewBox="0 0 24 17">
              <path d="M4 16L12 2l8 14M7.2 11h9.6" {...ICON} stroke="#3D3D3D" strokeWidth={1.9} />
            </svg>
            <span
              className="h-[3px] w-[15px] shrink-0 rounded-[1px]"
              style={{
                background:
                  (editor?.getAttributes("textStyle").color as string) || "#0A0A0A",
              }}
            />
          </button>
          <Menu
            open={openMenu === "color"}
            onClose={closeMenus}
            anchorRef={colorRef}
            className="flex gap-1 !p-2"
          >
            {TEXT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Text color ${c}`}
                className="h-6 w-6 rounded-full border border-[#E6E6E6]"
                style={{ background: c }}
                onClick={() => {
                  editor?.chain().focus().setColor(c).run();
                  setOpenMenu(null);
                }}
              />
            ))}
          </Menu>
        </div>

        <div ref={highlightRef} className="relative">
          <button
            type="button"
            aria-label="Highlight color"
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setOpenMenu(openMenu === "highlight" ? null : "highlight")}
            className="flex h-[30px] w-[30px] shrink-0 flex-col items-center justify-center gap-[3px] rounded-md transition-colors hover:bg-[#F5F5F5] disabled:opacity-40"
          >
            <svg width="15" height="11" viewBox="0 0 24 17">
              <path d="M14 1l8 8-7 7H7l-4-4z" {...ICON} stroke="#3D3D3D" strokeWidth={1.9} />
            </svg>
            <span
              className="h-[3px] w-[15px] shrink-0 rounded-[1px]"
              style={{
                background:
                  (editor?.getAttributes("highlight").color as string) || "#E4DFC8",
              }}
            />
          </button>
          <Menu
            open={openMenu === "highlight"}
            onClose={closeMenus}
            anchorRef={highlightRef}
            className="flex gap-1 !p-2"
          >
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Highlight ${c}`}
                className="h-6 w-6 rounded-full border border-[#E6E6E6]"
                style={{
                  background: c === "transparent" ? "#fff" : c,
                  backgroundImage:
                    c === "transparent"
                      ? "linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%),linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%)"
                      : undefined,
                  backgroundSize: c === "transparent" ? "6px 6px" : undefined,
                }}
                onClick={() => {
                  if (c === "transparent") editor?.chain().focus().unsetHighlight().run();
                  else editor?.chain().focus().toggleHighlight({ color: c }).run();
                  setOpenMenu(null);
                }}
              />
            ))}
          </Menu>
        </div>
      </div>

      <Divider />

      <div className="flex shrink-0 items-center gap-0.5">
        <Btn label="Insert link" disabled={disabled} onClick={insertLink}>
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path
              d="M10 14a4.5 4.5 0 0 0 6.4 0l3.1-3.1a4.5 4.5 0 0 0-6.4-6.4L11.5 6"
              {...ICON}
              stroke="#3D3D3D"
            />
            <path
              d="M14 10a4.5 4.5 0 0 0-6.4 0l-3.1 3.1a4.5 4.5 0 0 0 6.4 6.4l1.6-1.5"
              {...ICON}
              stroke="#3D3D3D"
            />
          </svg>
        </Btn>
        <Btn label="Add comment" disabled={disabled} onClick={addComment}>
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path
              d="M20.5 15.5a2 2 0 0 1-2 2H8l-4.5 3.5V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z"
              {...ICON}
              stroke="#3D3D3D"
            />
            <path d="M12 7.5v5.5M9.2 10.2h5.6" {...ICON} stroke="#3D3D3D" />
          </svg>
        </Btn>
        <Btn
          label="Insert image"
          disabled={disabled}
          onClick={() => imageInputRef.current?.click()}
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <rect x="3" y="4.5" width="18" height="15" rx="2.5" {...ICON} stroke="#3D3D3D" />
            <path d="M3.5 15.5l4.8-4.4 4.2 3.8 3-2.6 4.9 4.2" {...ICON} stroke="#3D3D3D" />
          </svg>
        </Btn>
      </div>

      <Divider />

      <div className="flex shrink-0 items-center gap-0.5">
        <div ref={alignRef} className="relative">
          <Btn
            label="Align"
            disabled={disabled}
            onClick={() => setOpenMenu(openMenu === "align" ? null : "align")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path
                d={
                  align === "center"
                    ? "M4 6h16M6.5 11h11M4 16h16M6.5 21h11"
                    : align === "right"
                      ? "M4 6h16M9 11h11M4 16h16M9 21h11"
                      : align === "justify"
                        ? "M4 6h16M4 11h16M4 16h16M4 21h16"
                        : "M4 6h16M4 11h11M4 16h16M4 21h11"
                }
                {...ICON}
                stroke="#3D3D3D"
              />
            </svg>
          </Btn>
          <Menu
            open={openMenu === "align"}
            onClose={closeMenus}
            anchorRef={alignRef}
          >
            {ALIGN_OPTIONS.map((a) => (
              <button
                key={a}
                type="button"
                className={`flex w-full px-3 py-1.5 text-left text-[13px] capitalize ${
                  a === align ? "bg-[#F4F4F4]" : "hover:bg-[#F7F7F7]"
                }`}
                onClick={() => {
                  editor?.chain().focus().setTextAlign(a).run();
                  setOpenMenu(null);
                }}
              >
                {a}
              </button>
            ))}
          </Menu>
        </div>

        <div ref={spacingRef} className="relative">
          <Btn
            label="Line spacing"
            disabled={disabled}
            onClick={() => setOpenMenu(openMenu === "spacing" ? null : "spacing")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path d="M9.5 6.5H21M9.5 12H21M9.5 17.5H21" {...ICON} stroke="#3D3D3D" />
              <path
                d="M5 3.5v17M2.5 6L5 3.5 7.5 6M2.5 18L5 20.5 7.5 18"
                {...ICON}
                stroke="#3D3D3D"
              />
            </svg>
          </Btn>
          <Menu
            open={openMenu === "spacing"}
            onClose={closeMenus}
            anchorRef={spacingRef}
          >
            {LINE_SPACING_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`flex w-full px-3 py-1.5 text-left text-[13px] ${
                  currentLineHeight === opt.value ? "bg-[#F4F4F4]" : "hover:bg-[#F7F7F7]"
                }`}
                onClick={() => setLineSpacing(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </Menu>
        </div>

        <Btn
          label="Bulleted list"
          active={editor?.isActive("bulletList")}
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path
              d="M9.5 6.5H21M9.5 12H21M9.5 17.5H21"
              {...ICON}
              stroke={editor?.isActive("bulletList") ? "#0A0A0A" : "#3D3D3D"}
            />
            <circle
              cx="4.5"
              cy="6.5"
              r="1.6"
              fill={editor?.isActive("bulletList") ? "#0A0A0A" : "#3D3D3D"}
            />
            <circle
              cx="4.5"
              cy="12"
              r="1.6"
              fill={editor?.isActive("bulletList") ? "#0A0A0A" : "#3D3D3D"}
            />
            <circle
              cx="4.5"
              cy="17.5"
              r="1.6"
              fill={editor?.isActive("bulletList") ? "#0A0A0A" : "#3D3D3D"}
            />
          </svg>
        </Btn>
        <Btn
          label="Numbered list"
          active={editor?.isActive("orderedList")}
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path
              d="M9.5 6.5H21M9.5 12H21M9.5 17.5H21"
              {...ICON}
              stroke={editor?.isActive("orderedList") ? "#0A0A0A" : "#3D3D3D"}
            />
            <path
              d="M3 4.5h1.5v4M3 8.5h3M3 11.5h3l-3 3.5h3M3 17h3v3.5H3"
              {...ICON}
              stroke={editor?.isActive("orderedList") ? "#0A0A0A" : "#3D3D3D"}
              strokeWidth={1.5}
            />
          </svg>
        </Btn>
        <Btn
          label="Decrease indent"
          disabled={disabled}
          onClick={() => editor?.chain().focus().liftListItem("listItem").run()}
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path d="M9 6h12M9 12h12M9 18h12M4 8.5v7M6.5 12H2" {...ICON} stroke="#3D3D3D" />
          </svg>
        </Btn>
        <Btn
          label="Increase indent"
          disabled={disabled}
          onClick={() => editor?.chain().focus().sinkListItem("listItem").run()}
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path d="M9 6h12M9 12h12M9 18h12M4 8.5v7M2 12h4.5" {...ICON} stroke="#3D3D3D" />
          </svg>
        </Btn>
      </div>

      <div className="h-px flex-1" />

      <div ref={modeRef} className="relative shrink-0">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setOpenMenu(openMenu === "mode" ? null : "mode")}
          className="flex h-[30px] shrink-0 items-center gap-1.5 rounded-full border border-[#E6E6E6] pr-2 pl-2.5 transition-colors hover:bg-[#F5F5F5]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" className="shrink-0">
            <path
              d="M4 20l.9-4L16.4 4.5a2.2 2.2 0 0 1 3.1 3.1L8 19.1z"
              {...ICON}
              stroke="#3D3D3D"
            />
          </svg>
          <span className="text-xs leading-4 font-medium text-[#3D3D3D]">
            {editMode === "editing" ? "Editing" : "Viewing"}
          </span>
          <Chevron />
        </button>
        <Menu
          open={openMenu === "mode"}
          onClose={closeMenus}
          anchorRef={modeRef}
          align="end"
        >
          {(["editing", "viewing"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`flex w-full px-3 py-1.5 text-left text-[13px] capitalize ${
                mode === editMode ? "bg-[#F4F4F4]" : "hover:bg-[#F7F7F7]"
              }`}
              onClick={() => {
                onEditModeChange(mode);
                setOpenMenu(null);
              }}
            >
              {mode}
            </button>
          ))}
        </Menu>
      </div>
    </div>
  );
}
