"use client";
import { DesignCopy } from "@/components/design/runtime";


import { useEffect, useId, useRef, useState } from "react";

/**
 * Fallback renderer for raw ```mermaid fences.
 *
 * /diagram now emits a bounded spec (see lib/diagram.ts), so this only handles
 * what that path can't express — custom skills, or a model that ignores the
 * tool. It still gets a container and an escape hatch, because the old failure
 * mode was worse than ugly: `max-w-full` on an auto-laid-out SVG scaled wide
 * graphs down until labels were smaller than the body copy around them.
 *
 * So: let the SVG keep its natural size, cap the height, and scroll. Cramped
 * but readable beats neat and illegible.
 */
export function MermaidDiagram({ chart }: { chart: string }) {
  const reactId = useId().replace(/:/g, "");
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "neutral",
          securityLevel: "strict",
          fontFamily: "inherit",
          // Without this, Mermaid stamps width:100% on the SVG and every label
          // shrinks to fit the column. Natural size + scroll instead.
          flowchart: { useMaxWidth: false },
          sequence: { useMaxWidth: false },
        });
        const { svg } = await mermaid.render(
          `mermaid-${reactId}-${Date.now()}`,
          chart,
        );
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError("Could not render this diagram.");
          if (ref.current) ref.current.innerHTML = "";
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chart, reactId]);

  if (error) {
    return (
      <pre data-design-id="m-f6dbab71eea3" className="my-2 max-w-[640px] overflow-x-auto rounded-lg bg-[#F7F7F5] px-3 py-2 text-[13px] leading-5 text-[#5E5E5E]">
        {chart}
      </pre>
    );
  }

  return (
    <div data-design-id="m-07c274f71b95" className="my-1 flex w-full flex-col gap-3 rounded-[14px] border border-[#E4E2EC] bg-white px-7 pt-[22px] pb-[18px]">
      <div data-design-id="m-005cf91d48c8" className="flex items-center justify-between gap-4">
        <span data-design-id="m-b6a758000540" className="text-[10px] leading-3 font-semibold tracking-[0.14em] text-[#6A618C]"><DesignCopy id="m-b6a758000540">
          DIAGRAM
        </DesignCopy></span>
        <button data-design-id="m-ece93b24aee5"
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 text-[12px] leading-4 font-medium text-[#6A618C]"
        >
          {expanded ? "Collapse" : "Show full size"}
        </button>
      </div>

      <div data-design-id="m-866fc5d06b34"
        ref={ref}
        className="w-full overflow-auto rounded-[11px] border border-[#F0EFF4] bg-[#FAFAF8] px-6 py-7 [&_svg]:mx-auto [&_svg]:max-w-none"
        style={{ maxHeight: expanded ? "none" : 420 }}
      />
    </div>
  );
}
