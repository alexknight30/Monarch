"use client";

/**
 * Renders a DiagramSpec. Pure presentation — no data fetching, no actions.
 *
 * Layout is flexbox rather than a graph engine, which is what keeps diagrams
 * legible: content is capped upstream, so columns always fit and text never
 * gets scaled down to fit a container.
 *
 * `scale` re-renders at a larger type scale rather than applying a CSS
 * transform — a transform would blur text and freeze the original wrapping.
 */

import {
  diagramHierarchy,
  diagramSteps,
  type DiagramBranch,
  type DiagramNode,
  type DiagramSpec,
} from "@/lib/diagram";

export type DiagramScale = "inline" | "focus";

const COLOR = {
  line: "#ADA6C4",
  border: "#E4E2EC",
  canvas: "#FAFAF8",
  canvasBorder: "#F0EFF4",
  root: "#1D0902",
  accent: "#6A618C",
  chip: "#F6F5FA",
  dot: "#8B82AD",
  label: "#0A0A0A",
  note: "#5E5E5E",
} as const;

const STROKE = 1.8;

type Metrics = {
  gap: number;
  canvasPadY: number;
  canvasPadX: number;
  rootH: number;
  rootText: number;
  rootPadX: number;
  stem: number;
  drop: number;
  cardPad: string;
  cardGap: number;
  titleText: number;
  noteText: number;
  chipH: number;
  chipText: number;
};

const METRICS: Record<DiagramScale, Metrics> = {
  inline: {
    gap: 16,
    canvasPadY: 30,
    canvasPadX: 28,
    rootH: 46,
    rootText: 16,
    rootPadX: 26,
    stem: 20,
    drop: 24,
    cardPad: "15px 16px 16px 16px",
    cardGap: 6,
    titleText: 15,
    noteText: 13,
    chipH: 34,
    chipText: 13,
  },
  focus: {
    gap: 24,
    canvasPadY: 38,
    canvasPadX: 42,
    rootH: 56,
    rootText: 20,
    rootPadX: 34,
    stem: 24,
    drop: 28,
    cardPad: "20px",
    cardGap: 14,
    titleText: 18,
    noteText: 14,
    chipH: 34,
    chipText: 13,
  },
};

/* ------------------------------------------------------------- primitives --- */

function RootPill({ label, m }: { label: string; m: Metrics }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-[10px]"
      style={{
        height: m.rootH,
        paddingLeft: m.rootPadX,
        paddingRight: m.rootPadX,
        background: COLOR.root,
      }}
    >
      <span
        className="font-semibold tracking-[-0.005em] text-white"
        style={{ fontSize: m.rootText, lineHeight: `${m.rootText + 4}px` }}
      >
        {label}
      </span>
    </div>
  );
}

/**
 * The root stem, the horizontal bar, and one drop per child.
 *
 * Each drop sits at the centre of an equal flex cell that shares the children
 * row's gap, so a drop is always exactly above its card. The bar is inset by
 * half a cell via calc rather than a measured pixel value — that keeps it exact
 * as the container resizes.
 */
function Fork({ count, m }: { count: number; m: Metrics }) {
  const line = { width: STROKE, background: COLOR.line } as const;

  if (count <= 1) {
    return (
      <div className="relative w-full" style={{ height: m.stem + m.drop }}>
        <span className="absolute top-0 left-1/2 h-full -translate-x-1/2" style={line} />
      </div>
    );
  }

  const inset = `calc((100% - ${(count - 1) * m.gap}px) / ${2 * count})`;

  return (
    <div className="w-full">
      <div className="relative w-full" style={{ height: m.stem }}>
        <span className="absolute top-0 left-1/2 h-full -translate-x-1/2" style={line} />
      </div>
      <div className="relative flex w-full" style={{ height: m.drop, gap: m.gap }}>
        <span
          className="absolute top-0"
          style={{ left: inset, right: inset, height: STROKE, background: COLOR.line }}
        />
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="relative flex-1">
            <span className="absolute top-0 left-1/2 h-full -translate-x-1/2" style={line} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Chip({ label, m }: { label: string; m: Metrics }) {
  return (
    <div
      className="flex shrink-0 items-center gap-[9px] rounded-lg px-3"
      style={{ height: m.chipH, background: COLOR.chip }}
    >
      <span
        className="size-[5px] shrink-0 rounded-full"
        style={{ background: COLOR.dot }}
      />
      <span
        className="text-[#3D3D3D]"
        style={{ fontSize: m.chipText, lineHeight: "18px" }}
      >
        {label}
      </span>
    </div>
  );
}

function BranchCard({
  branch,
  m,
  underline,
}: {
  branch: DiagramBranch;
  m: Metrics;
  underline?: boolean;
}) {
  const { node, leaves } = branch;
  return (
    <div
      className="flex flex-1 flex-col rounded-[10px] bg-white"
      style={{
        border: `1px solid ${COLOR.border}`,
        padding: m.cardPad,
        gap: leaves.length ? m.cardGap : 6,
      }}
    >
      <div
        className="flex flex-col gap-1.5"
        style={
          underline
            ? { paddingBottom: 10, borderBottom: `1px solid ${COLOR.canvasBorder}` }
            : undefined
        }
      >
        <span
          className="font-semibold tracking-[-0.005em]"
          style={{
            fontSize: m.titleText,
            lineHeight: `${m.titleText + 4}px`,
            color: COLOR.label,
          }}
        >
          {node.label}
        </span>
        {node.note ? (
          <span
            style={{ fontSize: m.noteText, lineHeight: "20px", color: COLOR.note }}
          >
            {node.note}
          </span>
        ) : null}
      </div>

      {leaves.length ? (
        <div className="flex flex-col gap-[7px]">
          {leaves.map((leaf) => (
            <Chip key={leaf.id} label={leaf.label} m={m} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------- layouts --- */

function Hierarchy({
  spec,
  m,
  underline,
}: {
  spec: DiagramSpec;
  m: Metrics;
  underline?: boolean;
}) {
  const { root, branches } = diagramHierarchy(spec);

  return (
    <div className="flex w-full flex-col items-center">
      <RootPill label={root.label} m={m} />
      <Fork count={branches.length} m={m} />
      <div className="flex w-full items-stretch" style={{ gap: m.gap }}>
        {branches.map((branch) => (
          <BranchCard
            key={branch.node.id}
            branch={branch}
            m={m}
            underline={underline}
          />
        ))}
      </div>
    </div>
  );
}

function StepArrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0 self-center">
      <path
        d="M5 12h13M13 7l5 5-5 5"
        fill="none"
        stroke={COLOR.line}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StepCard({
  node,
  index,
  m,
}: {
  node: DiagramNode;
  index: number;
  m: Metrics;
}) {
  return (
    <div
      className="flex flex-1 flex-col gap-1.5 rounded-[10px] bg-white"
      style={{ border: `1px solid ${COLOR.border}`, padding: m.cardPad }}
    >
      <span
        className="font-semibold"
        style={{ fontSize: 11, letterSpacing: "0.12em", color: COLOR.accent }}
      >
        {`STEP ${index + 1}`}
      </span>
      <span
        className="font-semibold tracking-[-0.005em]"
        style={{
          fontSize: m.titleText,
          lineHeight: `${m.titleText + 4}px`,
          color: COLOR.label,
        }}
      >
        {node.label}
      </span>
      {node.note ? (
        <span style={{ fontSize: m.noteText, lineHeight: "20px", color: COLOR.note }}>
          {node.note}
        </span>
      ) : null}
    </div>
  );
}

function Linear({ spec, m }: { spec: DiagramSpec; m: Metrics }) {
  const steps = diagramSteps(spec);

  return (
    <div className="flex w-full flex-col items-center" style={{ gap: 18 }}>
      <div className="flex w-full items-stretch" style={{ gap: 10 }}>
        {steps.map((node, i) => (
          <div key={node.id} className="flex flex-1 items-stretch" style={{ gap: 10 }}>
            <StepCard node={node} index={i} m={m} />
            {i < steps.length - 1 ? <StepArrow /> : null}
          </div>
        ))}
      </div>

      {spec.layout === "cycle" ? (
        <div
          className="flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5"
          style={{ background: COLOR.chip }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" className="shrink-0">
            <path
              d="M20 11.5a8 8 0 10-2.6 5.9M20 6v5.5h-5.5"
              fill="none"
              stroke={COLOR.accent}
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            className="font-medium"
            style={{ fontSize: 12, lineHeight: "16px", color: COLOR.accent }}
          >
            then it starts again
          </span>
        </div>
      ) : null}
    </div>
  );
}

/* ----------------------------------------------------------------- public --- */

export function DiagramView({
  spec,
  scale = "inline",
}: {
  spec: DiagramSpec;
  scale?: DiagramScale;
}) {
  const m = METRICS[scale];
  const linear = spec.layout === "process" || spec.layout === "cycle";

  return (
    <div
      className="flex w-full flex-col items-center rounded-[11px]"
      style={{
        background: COLOR.canvas,
        border: `1px solid ${COLOR.canvasBorder}`,
        padding: `${m.canvasPadY}px ${m.canvasPadX}px`,
      }}
    >
      {linear ? (
        <Linear spec={spec} m={m} />
      ) : (
        <Hierarchy spec={spec} m={m} underline={spec.layout === "compare"} />
      )}
    </div>
  );
}

export { COLOR as DIAGRAM_COLOR };
