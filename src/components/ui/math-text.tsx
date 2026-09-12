"use client";

import { useMemo } from "react";
import katex from "katex";

/** Renders `$inline$` and `$$block$$` with KaTeX. */
export function MathText({ text }: { text: string }) {
  const nodes = useMemo(() => tokenize(text), [text]);
  return (
    <>
      {nodes.map((node, index) => {
        if (node.type === "text") return <span key={index}>{node.value}</span>;
        return (
          <span
            key={index}
            className={node.block ? "my-3 block overflow-x-auto" : "inline"}
            dangerouslySetInnerHTML={{ __html: node.html }}
          />
        );
      })}
    </>
  );
}

type Token =
  | { type: "text"; value: string }
  | { type: "math"; html: string; block: boolean };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  const pattern = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(input))) {
    if (match.index > last) {
      tokens.push({ type: "text", value: input.slice(last, match.index) });
    }
    const block = Boolean(match[1]);
    const tex = (match[1] ?? match[2] ?? "").trim();
    tokens.push({ type: "math", html: renderKatex(tex, block), block });
    last = match.index + match[0].length;
  }
  if (last < input.length) {
    tokens.push({ type: "text", value: input.slice(last) });
  }
  return tokens.length ? tokens : [{ type: "text", value: input }];
}

function renderKatex(tex: string, displayMode: boolean) {
  try {
    return katex.renderToString(tex, { displayMode, throwOnError: false });
  } catch {
    return `<code>${escapeHtml(tex)}</code>`;
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
