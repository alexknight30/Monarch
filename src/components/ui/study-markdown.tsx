"use client";
import type { ReactNode } from "react";
import { StudyInline } from "./study-inline";

/** Safe study prose: render structure as React elements, never interpret source HTML. */
export function StudyMarkdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const output: ReactNode[] = [];
  const beginsBlock = (line: string) => /^(#{1,6}\s|\s*[-*+]\s|\s*\d+[.)]\s|```|>|\$\$)/.test(line);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const key = i;
    if (!line.trim()) { i++; continue; }
    if (/^```/.test(line)) {
      const code: string[] = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]);
      i++;
      output.push(<pre key={key} className="overflow-x-auto rounded-xl bg-stone-100 p-4 text-sm"><code>{code.join("\n")}</code></pre>); continue;
    }
    if (line.trim().startsWith("$$")) {
      const math = [line]; i++;
      if (!(line.trim().endsWith("$$") && line.trim().length > 4)) while (i < lines.length) { const next = lines[i++]; math.push(next); if (next.trim().endsWith("$$")) break; }
      output.push(<div key={key}><StudyInline text={math.join("\n")} /></div>); continue;
    }
    const heading = /^(#{1,6})\s+(.+?)(?:\s+#+)?$/.exec(line);
    if (heading) { output.push(<h2 key={key} className={heading[1].length <= 2 ? "pt-2 text-2xl font-semibold tracking-tight text-stone-900" : "pt-1 text-lg font-semibold text-stone-900"}><StudyInline text={heading[2]} /></h2>); i++; continue; }
    const ordered = /^\s*\d+[.)]\s+/.test(line);
    if (ordered || /^\s*[-*+]\s+/.test(line)) {
      const pattern = ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*+]\s+/;
      const items: ReactNode[] = [];
      while (i < lines.length && pattern.test(lines[i])) { items.push(<li key={i}><StudyInline text={lines[i].replace(pattern, "")} /></li>); i++; }
      output.push(ordered ? <ol key={key} start={parseInt(line.trim(), 10)} className="list-decimal space-y-2 pl-6">{items}</ol> : <ul key={key} className="list-disc space-y-2 pl-6">{items}</ul>); continue;
    }
    if (/^>/.test(line)) { const quote: string[] = []; while (i < lines.length && /^>/.test(lines[i])) quote.push(lines[i++].replace(/^>\s?/, "")); output.push(<blockquote key={key} className="border-l-2 border-violet-300 pl-4 text-stone-600"><StudyInline text={quote.join("\n")} /></blockquote>); continue; }
    const paragraph = [line]; i++;
    while (i < lines.length && lines[i].trim() && !beginsBlock(lines[i])) paragraph.push(lines[i++]);
    output.push(<p key={key}><StudyInline text={paragraph.join("\n")} /></p>);
  }
  return <div className="space-y-4 break-words text-[15px] leading-7 text-stone-700">{output}</div>;
}
