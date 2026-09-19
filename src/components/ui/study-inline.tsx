"use client";
import { MathText } from "./math-text";

/** Tokenize equations before emphasis so asterisks inside math remain intact. */
export function StudyInline({ text }: { text:string }) {
  const parts=text.split(/(`[^`\n]+`|\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|(?<!\\)\$[^$\n]+?\$|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\))/g);
  return <>{parts.map((part,index)=>{
    if(part.startsWith("`")&&part.endsWith("`"))return <code data-design-id="m-fd3d9f16f45d" key={index} className="rounded bg-stone-100 px-1 font-mono text-[0.9em]">{part.slice(1,-1)}</code>;
    if(part.startsWith("$")||part.startsWith("\\(")||part.startsWith("\\["))return <MathText key={index} text={part}/>;
    if(part.startsWith("**")&&part.endsWith("**"))return <strong data-design-id="m-384b5a3cb5fd" key={index} className="font-semibold">{part.slice(2,-2)}</strong>;
    if(part.startsWith("*")&&part.endsWith("*"))return <em data-design-id="m-1c211ee24f44" key={index}>{part.slice(1,-1)}</em>;
    const link=/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/.exec(part);
    if(link)return <a data-design-id="m-1fba91553125" key={index} href={link[2]} target="_blank" rel="noreferrer" className="underline underline-offset-2">{link[1]}</a>;
    return <span data-design-id="m-1ca34509a508" key={index}>{part}</span>;
  })}</>;
}
