"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { Lightbulb, Mic, Globe, Paperclip, Send, X } from "lucide-react";
import { AnimatePresence, motion, type Variants } from "motion/react";
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
  skill?: Skill;
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
}: AIChatInputProps) => {
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

  const query = selectedSkill ? null : slashQuery(inputValue);
  const menuOpen = query !== null;
  const filtered = menuOpen ? filterSkills(query, skills) : [];

  // Refresh skills when the menu opens (custom skills may have changed in Settings).
  useEffect(() => {
    if (menuOpen) setSkills(listSkills());
  }, [menuOpen]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  // Cycle placeholder text when input is inactive (skip when static)
  useEffect(() => {
    if (staticPlaceholder || isActive || inputValue || selectedSkill) return;

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
    placeholders.length,
  ]);

  // Close input when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        if (!inputValue && !selectedSkill) setIsActive(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [inputValue, selectedSkill]);

  const handleActivate = () => setIsActive(true);

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
    if (!value && !selectedSkill) return;
    onSubmit?.(value, selectedSkill ? { skill: selectedSkill } : undefined);
    setInputValue("");
    setSelectedSkill(null);
    setIsActive(false);
  };

  const canSend = Boolean(selectedSkill || inputValue.trim()) && !disabled;

  const containerVariants: Variants = {
    collapsed: {
      height: 68,
      boxShadow: "0 2px 8px 0 rgba(0,0,0,0.08)",
      transition: { type: "spring", stiffness: 120, damping: 18 },
    },
    expanded: {
      height: 128,
      boxShadow: "0 8px 32px 0 rgba(0,0,0,0.16)",
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
    !isActive && !inputValue && !selectedSkill && !menuOpen;

  return (
    <div className="relative flex w-full items-center justify-center text-black">
      {/* Slash skill menu — sits above the composer like Claude */}
      {menuOpen ? (
        <div className="absolute bottom-[calc(100%+8px)] left-1/2 z-50 w-full max-w-3xl -translate-x-1/2 px-2">
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
        className="w-full max-w-3xl"
        variants={containerVariants}
        animate={isActive || inputValue || selectedSkill ? "expanded" : "collapsed"}
        initial="collapsed"
        style={{ overflow: "hidden", borderRadius: 32, background: "#fff" }}
        onClick={handleActivate}
      >
        <div className="flex h-full w-full flex-col items-stretch">
          {/* Input Row */}
          <div className="flex w-full max-w-3xl items-center gap-2 rounded-full bg-white p-3">
            <button
              className="rounded-full p-3 transition hover:bg-gray-100"
              title="Attach file"
              type="button"
              tabIndex={-1}
            >
              <Paperclip size={20} />
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
                  onChange={(e) => setInputValue(e.target.value)}
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
                  className="w-full flex-1 rounded-md border-0 bg-transparent py-2 text-base font-normal outline-0 disabled:opacity-60"
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
                <div className="pointer-events-none absolute top-0 left-0 flex h-full w-full items-center px-3 py-2">
                  {staticPlaceholder ? (
                    showPlaceholderText && (
                      <span className="pointer-events-none absolute top-1/2 left-0 -translate-y-1/2 truncate text-gray-400 select-none">
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
              className="rounded-full p-3 transition hover:bg-gray-100"
              title="Voice input"
              type="button"
              tabIndex={-1}
            >
              <Mic size={20} />
            </button>
            <button
              className="flex items-center justify-center gap-1 rounded-full bg-black p-3 font-medium text-white hover:bg-zinc-700 disabled:opacity-50 disabled:hover:bg-black"
              title="Send"
              type="button"
              disabled={!canSend}
              onClick={(e) => {
                e.stopPropagation();
                handleSubmit();
              }}
            >
              <Send size={18} />
            </button>
          </div>

          {/* Expanded Controls */}
          <motion.div
            className="flex w-full items-center justify-start px-4 text-sm"
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
            animate={
              isActive || inputValue || selectedSkill ? "visible" : "hidden"
            }
            style={{ marginTop: 8 }}
          >
            <div className="flex items-center gap-3">
              {/* Think Toggle */}
              <button
                className={`group flex items-center gap-1 rounded-full px-4 py-2 font-medium transition-all ${
                  thinkActive
                    ? "bg-blue-600/10 text-blue-950 outline outline-blue-600/60"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                title="Think"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setThinkActive((a) => !a);
                }}
              >
                <Lightbulb
                  className="transition-all group-hover:fill-yellow-300"
                  size={18}
                />
                Think
              </button>

              {/* Deep Search Toggle */}
              <motion.button
                className={`flex items-center justify-start gap-1 overflow-hidden rounded-full px-4 py-2 font-medium whitespace-nowrap transition ${
                  deepSearchActive
                    ? "bg-blue-600/10 text-blue-950 outline outline-blue-600/60"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                title="Deep Search"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeepSearchActive((a) => !a);
                }}
                initial={false}
                animate={{
                  width: deepSearchActive ? 125 : 36,
                  paddingLeft: deepSearchActive ? 8 : 9,
                }}
              >
                <div className="flex-1">
                  <Globe size={18} />
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
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export { AIChatInput };
