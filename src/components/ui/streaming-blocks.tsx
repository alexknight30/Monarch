"use client";

import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

function isBlank(line: string) {
  return line.trim() === "";
}

function isFence(line: string) {
  return /^```/.test(line);
}

function isBullet(line: string) {
  return /^\s*[-*]\s+/.test(line);
}

function isOrdered(line: string) {
  return /^\s*\d+\.\s+/.test(line);
}

function isList(line: string) {
  return isBullet(line) || isOrdered(line);
}

/** Split a reply into paragraphs, lists, and fenced blocks. */
export function splitContentBlocks(text: string): string[] {
  const lines = text.split("\n");
  const blocks: string[] = [];
  let i = 0;

  while (i < lines.length) {
    if (isBlank(lines[i])) {
      i += 1;
      continue;
    }

    if (isFence(lines[i])) {
      const start = i;
      i += 1;
      while (i < lines.length && !isFence(lines[i])) i += 1;
      if (i < lines.length) i += 1;
      blocks.push(lines.slice(start, i).join("\n"));
      continue;
    }

    if (isList(lines[i])) {
      const start = i;
      const ordered = isOrdered(lines[i]);
      i += 1;
      while (i < lines.length) {
        if (isBlank(lines[i]) || isFence(lines[i])) break;
        if (ordered ? !isOrdered(lines[i]) : !isBullet(lines[i])) break;
        i += 1;
      }
      blocks.push(lines.slice(start, i).join("\n"));
      continue;
    }

    const start = i;
    i += 1;
    while (
      i < lines.length &&
      !isBlank(lines[i]) &&
      !isFence(lines[i]) &&
      !isList(lines[i])
    ) {
      i += 1;
    }
    blocks.push(lines.slice(start, i).join("\n"));
  }

  return blocks;
}

function fenceOpen(text: string) {
  const markers = text.split("\n").filter((line) => isFence(line)).length;
  return markers % 2 === 1;
}

export function completeBlockCount(text: string, streaming: boolean): number {
  const blocks = splitContentBlocks(text);
  if (!streaming) return blocks.length;
  if (blocks.length === 0) return 0;
  if (fenceOpen(text)) return Math.max(0, blocks.length - 1);
  if (/\n\s*\n\s*$/.test(text)) return blocks.length;
  return Math.max(0, blocks.length - 1);
}

export function StreamingBlocks({
  text,
  streaming,
  renderBlock,
}: {
  text: string;
  streaming: boolean;
  renderBlock: (block: string, index: number) => ReactNode;
}) {
  const blocks = splitContentBlocks(text);
  const complete = completeBlockCount(text, streaming);
  const [shown, setShown] = useState(() => (streaming ? 0 : blocks.length));
  const [animateFrom] = useState(() => streaming ? 0 : Number.POSITIVE_INFINITY);

  useEffect(() => {
    if (!streaming) {
      if (shown < blocks.length) {
        const t = window.setTimeout(() => setShown((n) => n + 1), 160);
        return () => window.clearTimeout(t);
      }
      return;
    }

    if (shown >= complete) return;
    const t = window.setTimeout(
      () => setShown((n) => n + 1),
      shown === 0 ? 40 : 220,
    );
    return () => window.clearTimeout(t);
  }, [streaming, complete, shown, blocks.length]);

  if (shown === 0) return null;

  return (
    <div data-design-id="m-c2e9ccec281b" className="flex w-full flex-col gap-3.5">
      {blocks.slice(0, shown).map((block, index) => (
        <div data-design-id="m-4a1b215ba0d6"
          key={index}
          className={index >= animateFrom ? "chat-block-in" : undefined}
        >
          {renderBlock(block, index)}
        </div>
      ))}
    </div>
  );
}
