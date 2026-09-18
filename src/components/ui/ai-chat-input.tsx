"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { Lightbulb, Mic, Globe, Send, X } from "lucide-react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { ChatAttachmentChips } from "@/components/ui/chat-attachment-chips";
import { File01Icon } from "@/components/ui/file-01";
import {
  ATTACH_ACCEPT,
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_BYTES,
  isSupportedAttachment,
  metaFromFile,
} from "@/lib/chat-attachments";
import { filterSkills, listSkills, type Skill } from "@/lib/skills";

const PLACEHOLDERS = [
  "What assignments are up next?",
  "Make me a study guide",
  "Create a practice test",
  "Summarize this week's reading",
  "What's on the midterm?",
  "Help me outline my essay",
  "Explain this concept simply",
  "When are office hours?",
];

export type ChatSubmitMeta = {
  study?:boolean;
  research?:boolean;
  skill?: Skill;
  files?: File[];
};

type AIChatInputProps = {
  /** Called with the trimmed value when the user submits. Input clears after. */
  onSubmit?: (value: string, meta?: ChatSubmitMeta) => void;
  /** Override the cycling placeholder copy. */
  placeholders?: string[];
  /** Show a plain, non-animated placeholder (e.g. chat follow-up). */
  staticPlaceholder?: boolean;
  /** Focus the field on mount — used on the chat screen. */
  autoFocus?: boolean;
  /** Blocks input while the caller is awaiting a reply. */
  disabled?: boolean;
  /** Compact composer for side panels (e.g. document chat). */
  size?: "default" | "compact";
  /** Replaces the Think / Search row in the expanded composer. */
  expandedRow?: React.ReactNode;
};

/** Detect an open slash-command query (`/` at start of the field). */
function slashQuery(value: string): string | null {
  if (!value.startsWith("/")) return null;
  // Close the menu once the user types a space (args after a selected skill).
  if (value.includes(" ")) return null;
  return value.slice(1);
}

const AIChatInput = ({
  onSubmit,
  placeholders = PLACEHOLDERS,
  staticPlaceholder = false,
  autoFocus = false,
  disabled = false,
  size = "default",
  expandedRow,
}: AIChatInputProps) => {
  const compact = size === "compact";
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [thinkActive, setThinkActive] = useState(false);
  const [deepSearchActive, setDeepSearchActive] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [skills, setSkills] = useState<Skill[]>(() => listSkills());
  const [highlight, setHighlight] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const dragDepthRef = useRef(0);

  const query = selectedSkill ? null : slashQuery(inputValue);
  const menuOpen = query !== null;
  const filtered = menuOpen ? filterSkills(query, skills) : [];

  // Cycle placeholder text when input is inactive (skip when static)
  useEffect(() => {
    if (staticPlaceholder || isActive || inputValue || selectedSkill || files.length) return;

    const interval = setInterval(() => {
      setShowPlaceholder(false);
      setTimeout(() => {
        setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
        setShowPlaceholder(true);
      }, 400);
    }, 3000);

    return () => clearInterval(interval);
  }, [
    staticPlaceholder,
    isActive,
    inputValue,
    selectedSkill,
    files.length,
    placeholders.length,
  ]);

  // Close input when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        if (!inputValue && !selectedSkill && files.length === 0) setIsActive(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [inputValue, selectedSkill, files.length]);

  const handleActivate = () => setIsActive(true);

  const addFiles = (incoming: FileList | File[]) => {
    const next: File[] = [...files];
    let error: string | null = null;

    for (const file of Array.from(incoming)) {
      if (!isSupportedAttachment(file.name, file.type)) {
        error = `${file.name} isn’t a supported type. Use PDF, an image, or a text file.`;
        continue;
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        error = `${file.name} is larger than 10 MB.`;
        continue;
      }
      if (next.length >= MAX_ATTACHMENTS) {
        error = `You can attach up to ${MAX_ATTACHMENTS} files.`;
        break;
      }
      const duplicate = next.some(
        (existing) =>
          existing.name === file.name &&
          existing.size === file.size &&
          existing.lastModified === file.lastModified,
      );
      if (duplicate) continue;
      next.push(file);
    }

    setAttachError(error);
    if (next.length !== files.length) {
      setFiles(next);
      setIsActive(true);
    }
  };

  const applySkill = (skill: Skill) => {
    setSelectedSkill(skill);
    setInputValue("");
    setIsActive(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const clearSkill = () => {
    setSelectedSkill(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleSubmit = () => {
    if (disabled) return;
    if (menuOpen) {
      const pick = filtered[highlight] ?? filtered[0];
      if (pick) applySkill(pick);
      return;
    }
    const value = inputValue.trim();
    if (!value && !selectedSkill && files.length === 0) return;
    onSubmit?.(value, {
      study:thinkActive,
      research:deepSearchActive,
      ...(selectedSkill ? { skill: selectedSkill } : {}),
      ...(files.length ? { files: [...files] } : {}),
    });
    setInputValue("");
    setSelectedSkill(null);
    setFiles([]);
    setAttachError(null);
    setIsActive(false);
  };

  const canSend =
    Boolean(selectedSkill || inputValue.trim() || files.length) && !disabled;
  const hasComposerContent = Boolean(
    isActive || inputValue || selectedSkill || files.length,
  );

  const containerVariants: Variants = {
    collapsed: {
      height: compact ? 48 : 68,
      boxShadow: compact
        ? "0 1px 4px 0 rgba(0,0,0,0.06)"
        : "0 2px 8px 0 rgba(0,0,0,0.08)",
      transition: { type: "spring", stiffness: 120, damping: 18 },
    },
    expanded: {
      height: files.length ? "auto" : compact ? 96 : 128,
      minHeight: compact ? 96 : 128,
      boxShadow: compact
        ? "0 4px 16px 0 rgba(0,0,0,0.10)"
        : "0 8px 32px 0 rgba(0,0,0,0.16)",
      transition: { type: "spring", stiffness: 120, damping: 18 },
    },
  };

  const placeholderContainerVariants: Variants = {
    initial: {},
    animate: { transition: { staggerChildren: 0.025 } },
    exit: { transition: { staggerChildren: 0.015, staggerDirection: -1 } },
  };

  const letterVariants: Variants = {
    initial: {
      opacity: 0,
      filter: "blur(12px)",
      y: 10,
    },
    animate: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: {
        opacity: { duration: 0.25 },
        filter: { duration: 0.4 },
        y: { type: "spring", stiffness: 80, damping: 20 },
      },
    },
    exit: {
      opacity: 0,
      filter: "blur(12px)",
      y: -10,
      transition: {
        opacity: { duration: 0.2 },
        filter: { duration: 0.3 },
        y: { type: "spring", stiffness: 80, damping: 20 },
      },
    },
  };

  const showPlaceholderText =
    !isActive && !inputValue && !selectedSkill && !menuOpen && files.length === 0;

  return (
    <div className="relative flex w-full items-center justify-center text-black">
      {/* Slash skill menu — sits above the composer like Claude */}
      {menuOpen ? (
        <div
          className={`absolute bottom-[calc(100%+8px)] left-1/2 z-50 w-full -translate-x-1/2 px-2 ${
            compact ? "max-w-none" : "max-w-3xl"
          }`}
        >
          <div className="overflow-hidden rounded-xl border border-[#E6E6E6] bg-white shadow-[0_8px_28px_rgba(0,0,0,0.12)]">
            {filtered.length === 0 ? (
              <p className="px-3.5 py-3 text-sm text-[#9A9A98]">
                No skills match
              </p>
            ) : (
              <ul className="max-h-64 overflow-y-auto py-1">
                {filtered.map((skill, index) => {
                  const active = index === highlight;
                  return (
                    <li key={skill.id}>
                      <button
                        type="button"
                        onMouseEnter={() => setHighlight(index)}
                        onClick={(e) => {
                          e.stopPropagation();
                          applySkill(skill);
                        }}
                        className={`flex w-full items-center gap-3 px-3.5 py-2 text-left ${
                          active ? "bg-[#F1F1EF]" : "bg-white hover:bg-[#F7F7F5]"
                        }`}
                      >
                        <span className="font-mono text-[13px] leading-4 text-[#0A0A0A]">
                          /{skill.command}
                        </span>
                        <span className="truncate text-[13px] leading-4 text-[#9A9A98]">
                          {skill.description}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      <motion.div
        ref={wrapperRef}
        className={`w-full ${compact ? "max-w-none" : "max-w-3xl"}`}
        variants={containerVariants}
        animate={hasComposerContent ? "expanded" : "collapsed"}
        initial="collapsed"
        style={{
          overflow: "hidden",
          borderRadius: compact ? 22 : 32,
          background: "#fff",
          border: compact
            ? isDraggingFile
              ? "1px solid #B8B4A8"
              : "1px solid #ECECEC"
            : isDraggingFile
              ? "1px solid #D4D0C4"
              : undefined,
        }}
        onClick={handleActivate}
        onDragEnter={(event) => {
          event.preventDefault();
          dragDepthRef.current += 1;
          setIsDraggingFile(true);
          setIsActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
          if (dragDepthRef.current === 0) setIsDraggingFile(false);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          dragDepthRef.current = 0;
          setIsDraggingFile(false);
          if (event.dataTransfer.files.length > 0) {
            addFiles(event.dataTransfer.files);
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ATTACH_ACCEPT}
          multiple
          hidden
          onChange={(event) => {
            if (event.target.files) addFiles(event.target.files);
            event.currentTarget.value = "";
          }}
        />
        <div
          className={`flex h-full w-full flex-col items-stretch ${
            files.length ? (compact ? "pb-2" : "pb-3") : ""
          }`}
        >
          {/* Input Row */}
          <div
            className={`flex w-full items-center gap-1.5 rounded-full bg-white ${
              compact ? "max-w-none p-1.5" : "max-w-3xl p-3 gap-2"
            }`}
          >
            <button
              className={`inline-flex items-center justify-center rounded-full transition hover:bg-gray-100 disabled:opacity-50 ${
                compact ? "p-2" : "p-3"
              }`}
              title="Attach a file"
              aria-label="Attach a file"
              type="button"
              disabled={disabled}
              onClick={(event) => {
                event.stopPropagation();
                if (disabled) return;
                fileInputRef.current?.click();
              }}
            >
              <File01Icon size={compact ? 16 : 20} />
            </button>

            {/* Text Input & Placeholder */}
            <div className="relative flex min-w-0 flex-1 items-center gap-2">
              {selectedSkill ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearSkill();
                  }}
                  className="flex shrink-0 items-center gap-1 rounded-full bg-blue-600/10 px-2.5 py-1 font-mono text-[13px] leading-4 text-blue-700 outline outline-blue-600/50 transition hover:bg-blue-600/15"
                  title="Remove skill"
                >
                  /{selectedSkill.command}
                  <X size={12} className="opacity-70" />
                </button>
              ) : null}

              <div className="relative min-w-0 flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  autoFocus={autoFocus}
                  onChange={(e) => {setInputValue(e.target.value);setHighlight(0);if(e.target.value.startsWith("/"))setSkills(listSkills());}}
                  onKeyDown={(e) => {
                    if (menuOpen) {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setHighlight((h) =>
                          filtered.length
                            ? Math.min(filtered.length - 1, h + 1)
                            : 0,
                        );
                        return;
                      }
                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setHighlight((h) => Math.max(0, h - 1));
                        return;
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        setInputValue("");
                        return;
                      }
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                        return;
                      }
                      if (e.key === "Tab" && filtered[highlight]) {
                        e.preventDefault();
                        applySkill(filtered[highlight]);
                        return;
                      }
                    }

                    if (
                      e.key === "Backspace" &&
                      !inputValue &&
                      selectedSkill
                    ) {
                      e.preventDefault();
                      clearSkill();
                      return;
                    }

                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  disabled={disabled}
                  className={`w-full flex-1 rounded-md border-0 bg-transparent font-normal outline-0 disabled:opacity-60 ${
                    compact ? "py-1.5 text-sm" : "py-2 text-base"
                  }`}
                  style={{ position: "relative", zIndex: 1 }}
                  onFocus={handleActivate}
                  placeholder={
                    selectedSkill
                      ? "Add optional details, or press Enter"
                      : menuOpen
                        ? "Type to filter"
                        : undefined
                  }
                />
                <div
                  className={`pointer-events-none absolute top-0 left-0 flex h-full w-full items-center ${
                    compact ? "px-2 py-1.5" : "px-3 py-2"
                  }`}
                >
                  {staticPlaceholder ? (
                    showPlaceholderText && (
                      <span
                        className={`pointer-events-none absolute top-1/2 left-0 -translate-y-1/2 truncate text-gray-400 select-none ${
                          compact ? "text-sm" : ""
                        }`}
                      >
                        {placeholders[0]}
                      </span>
                    )
                  ) : (
                    <AnimatePresence mode="wait">
                      {showPlaceholder && showPlaceholderText && (
                        <motion.span
                          key={placeholderIndex}
                          className="pointer-events-none absolute top-1/2 left-0 -translate-y-1/2 text-gray-400 select-none"
                          style={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            zIndex: 0,
                          }}
                          variants={placeholderContainerVariants}
                          initial="initial"
                          animate="animate"
                          exit="exit"
                        >
                          {placeholders[placeholderIndex]
                            .split("")
                            .map((char, i) => (
                              <motion.span
                                key={i}
                                variants={letterVariants}
                                style={{ display: "inline-block" }}
                              >
                                {char === " " ? "\u00A0" : char}
                              </motion.span>
                            ))}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  )}
                </div>
              </div>
            </div>

            <button
              className={`rounded-full transition hover:bg-gray-100 ${
                compact ? "p-2" : "p-3"
              }`}
              title="Voice input"
              type="button"
              tabIndex={-1}
            >
              <Mic size={compact ? 16 : 20} />
            </button>
            <button
              className={`flex items-center justify-center gap-1 rounded-full bg-black font-medium text-white hover:bg-zinc-700 disabled:opacity-50 disabled:hover:bg-black ${
                compact ? "p-2" : "p-3"
              }`}
              title="Send"
              type="button"
              disabled={!canSend}
              onClick={(e) => {
                e.stopPropagation();
                handleSubmit();
              }}
            >
              <Send size={compact ? 14 : 18} />
            </button>
          </div>

          {files.length > 0 || attachError ? (
            <div
              className={`flex flex-col ${compact ? "gap-1 px-2.5 pb-1" : "gap-1.5 px-4 pb-1"}`}
            >
              <ChatAttachmentChips
                attachments={files.map(metaFromFile)}
                compact={compact}
                onRemove={(index) => {
                  setFiles((prev) => prev.filter((_, i) => i !== index));
                  setAttachError(null);
                }}
              />
              {attachError ? (
                <p className="text-[12px] leading-4 text-[#B42318]">{attachError}</p>
              ) : null}
            </div>
          ) : null}

          {/* Expanded Controls */}
          <motion.div
            className={`flex w-full items-center justify-start ${
              compact ? "px-2.5 text-xs" : "px-4 text-sm"
            }`}
            variants={{
              hidden: {
                opacity: 0,
                y: 20,
                pointerEvents: "none" as const,
                transition: { duration: 0.25 },
              },
              visible: {
                opacity: 1,
                y: 0,
                pointerEvents: "auto" as const,
                transition: { duration: 0.35, delay: 0.08 },
              },
            }}
            initial="hidden"
            animate={hasComposerContent ? "visible" : "hidden"}
            style={{ marginTop: compact ? 4 : 8 }}
          >
            <div className={`flex items-center ${compact ? "gap-1.5" : "gap-3"}`}>
              {expandedRow ?? (
                <>
              {/* Think Toggle */}
              <button
                className={`group flex items-center gap-1 rounded-full font-medium transition-all ${
                  compact ? "px-2.5 py-1" : "px-4 py-2"
                } ${
                  thinkActive
                    ? "bg-blue-600/10 text-blue-950 outline outline-blue-600/60"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                title="Study mode: explanations with guided practice"
                aria-pressed={thinkActive}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setThinkActive((a) => !a);
                }}
              >
                <Lightbulb
                  className="transition-all group-hover:fill-yellow-300"
                  size={compact ? 14 : 18}
                />
                Study
              </button>

              {/* Deep Search Toggle */}
              <motion.button
                className={`flex items-center justify-start gap-1 overflow-hidden rounded-full font-medium whitespace-nowrap transition ${
                  compact ? "px-2.5 py-1" : "px-4 py-2"
                } ${
                  deepSearchActive
                    ? "bg-blue-600/10 text-blue-950 outline outline-blue-600/60"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                title="Research the public web with source links"
                aria-pressed={deepSearchActive}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeepSearchActive((a) => !a);
                }}
                initial={false}
                animate={{
                  width: deepSearchActive ? (compact ? 108 : 125) : compact ? 30 : 36,
                  paddingLeft: deepSearchActive ? (compact ? 6 : 8) : compact ? 7 : 9,
                }}
              >
                <div className="flex-1">
                  <Globe size={compact ? 14 : 18} />
                </div>
                <motion.span
                  className="pb-[2px]"
                  initial={false}
                  animate={{
                    opacity: deepSearchActive ? 1 : 0,
                  }}
                >
                  Deep Search
                </motion.span>
              </motion.button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export { AIChatInput };
