"use client";
import { DesignCopy } from "@/components/design/runtime";


/**
 * The chat-facing wrapper around a diagram: title, actions, and the affordances
 * that turn a rendered diagram into something a student can keep.
 *
 * Deliberately sits at the full thread width rather than inside the 640px
 * assistant text column — a diagram that has to fit body-copy width is the
 * reason the old renderer looked cramped.
 *
 * Owns presentation and local UI state only. Saving and re-rendering are the
 * caller's business; this component just reports intent and reflects status.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DiagramView } from "@/components/ui/diagram-view";
import {
  canExpandDiagram,
  describeDiagram,
  diagramToOutline,
  type DiagramDetail,
  type DiagramSpec,
} from "@/lib/diagram";

const ACCENT = "#6A618C";
const ACCENT_SOFT = "#F5F4F8";

const ZOOMS = [1, 1.25, 1.5] as const;

/* ------------------------------------------------------------------ icons --- */

function CopyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" className="shrink-0">
      <rect x="9" y="3.5" width="11.5" height="11.5" rx="2.2" fill="none" stroke="#5E5E5E" strokeWidth="1.7" />
      <path
        d="M15 18.5v1.2a1.8 1.8 0 01-1.8 1.8H5.3a1.8 1.8 0 01-1.8-1.8v-8a1.8 1.8 0 011.8-1.8h1.2"
        fill="none"
        stroke="#5E5E5E"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" className="shrink-0">
      <path
        d="M14.5 3.5H20.5V9.5M9.5 20.5H3.5V14.5M20.5 3.5L13.5 10.5M3.5 20.5L10.5 13.5"
        fill="none"
        stroke="#5E5E5E"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon({ color = "#FFFFFF", size = 14 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0">
      <path d="M12 5v14M5 12h14" fill="none" stroke={color} strokeWidth="2.1" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" className="shrink-0">
      <path d="M3 8.4l3.2 3.1L13 4.8" fill="none" stroke={ACCENT} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CollapseIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" className="shrink-0">
      <path d="M5 12h14" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" className="shrink-0 animate-spin">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeOpacity="0.25" />
      <path d="M21 12a9 9 0 00-9-9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function GhostButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button data-design-id="m-3038b80da8ff"
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex size-[31px] shrink-0 items-center justify-center rounded-lg border border-[#EAEAE8] transition-colors hover:bg-[#FAFAFA]"
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------- focus modal --- */

function FocusDialog({
  spec,
  onClose,
  onSave,
  saved,
  saving,
}: {
  spec: DiagramSpec;
  onClose: () => void;
  onSave?: () => void;
  saved?: string | null;
  saving?: boolean;
}) {
  const [zoom, setZoom] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const copyOutline = async () => {
    try {
      await navigator.clipboard.writeText(diagramToOutline(spec));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard unavailable — nothing useful to say here.
    }
  };

  return (
    <div data-design-id="m-c9fef65ebc00"
      className="fixed inset-0 z-50 flex items-center justify-center p-8"
      style={{ background: "rgba(24,20,32,0.46)" }}
      onClick={onClose}
      role="presentation"
    >
      <div data-design-id="m-dbbe51dd9678"
        role="dialog"
        aria-modal="true"
        aria-label={spec.title}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-full w-full max-w-[1080px] flex-col gap-[22px] rounded-2xl bg-white px-[30px] pt-[26px] pb-[22px] shadow-[0_30px_80px_rgba(20,16,28,0.28)]"
      >
        {/* header */}
        <div data-design-id="m-4dae94605f0d" className="flex shrink-0 items-center justify-between">
          <div data-design-id="m-ca7743d9a369" className="flex min-w-0 flex-col gap-[5px]">
            <span data-design-id="m-6ca7c493d789" className="text-[10px] leading-3 font-semibold tracking-[0.14em]" style={{ color: ACCENT }}><DesignCopy id="m-6ca7c493d789">
              DIAGRAM
            </DesignCopy></span>
            <h2 data-design-id="m-2c1ae59521e0" className="font-display truncate text-[24px] leading-[30px] tracking-[-0.01em] text-[#0A0A0A]">
              {spec.title}
            </h2>
          </div>

          <div data-design-id="m-363fdcded2c0" className="flex shrink-0 items-center gap-2.5">
            <div data-design-id="m-5b957efc6c1c" className="flex items-center gap-0.5 rounded-full p-1" style={{ background: ACCENT_SOFT }}>
              <button data-design-id="m-3ef47aaece75"
                type="button"
                aria-label="Zoom out"
                disabled={zoom === 0}
                onClick={() => setZoom((z) => Math.max(0, z - 1))}
                className="flex size-[26px] shrink-0 items-center justify-center rounded-full disabled:opacity-35"
              >
                <svg width="13" height="13" viewBox="0 0 24 24">
                  <path d="M6 12h12" stroke="#5E5E5E" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
              <span data-design-id="m-bbd66d8904a0" className="w-11 shrink-0 text-center text-[12px] leading-4 font-medium text-[#3D3D3D]">
                {`${Math.round(ZOOMS[zoom] * 100)}%`}
              </span>
              <button data-design-id="m-eb0b11208984"
                type="button"
                aria-label="Zoom in"
                disabled={zoom === ZOOMS.length - 1}
                onClick={() => setZoom((z) => Math.min(ZOOMS.length - 1, z + 1))}
                className="flex size-[26px] shrink-0 items-center justify-center rounded-full disabled:opacity-35"
              >
                <svg width="13" height="13" viewBox="0 0 24 24">
                  <path d="M12 6v12M6 12h12" stroke="#5E5E5E" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <button data-design-id="m-1d01047ba7c2"
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#F5F5F3] hover:bg-[#EDEDEA]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24">
                <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="#3D3D3D" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* canvas — zoom magnifies deliberately; the 100% render stays crisp */}
        <div data-design-id="m-1d710d65db53" className="min-h-0 flex-1 overflow-auto">
          <div data-design-id="m-c3495c38ab6f"
            style={{
              transform: `scale(${ZOOMS[zoom]})`,
              transformOrigin: "top center",
              width: `${100 / ZOOMS[zoom]}%`,
            }}
          >
            <DiagramView spec={spec} scale="focus" />
          </div>
        </div>

        {/* footer */}
        <div data-design-id="m-59acf8a9f302" className="flex shrink-0 items-center justify-between">
          <span data-design-id="m-0ee16634f3ed" className="text-[12px] leading-4 text-[#9A9A98]">
            {`${describeDiagram(spec)} · still editable`}
          </span>
          <div data-design-id="m-17f6e329c6a9" className="flex shrink-0 items-center gap-2.5">
            <button data-design-id="m-0a2510aa2198"
              type="button"
              onClick={copyOutline}
              className="flex h-9 shrink-0 items-center gap-[7px] rounded-lg border border-[#E4E2EC] px-[15px] text-[13px] leading-4 font-medium text-[#3D3D3D] transition-colors hover:bg-[#FAFAFA]"
            >
              <CopyIcon />
              {copied ? "Copied" : "Copy outline"}
            </button>

            {saved ? (
              <Link data-design-id="m-7d8b8db0ecc2"
                href={`/artifacts/${saved}`}
                className="flex h-9 shrink-0 items-center gap-[7px] rounded-lg px-4 text-[13px] leading-4 font-medium"
                style={{ background: ACCENT_SOFT, color: ACCENT }}
              >
                <CheckIcon />
                Open artifact
              </Link>
            ) : onSave ? (
              <button data-design-id="m-59c074e5c5fd"
                type="button"
                onClick={onSave}
                disabled={saving}
                className="flex h-9 shrink-0 items-center gap-[7px] rounded-lg px-4 text-[13px] leading-4 font-medium text-white disabled:opacity-60"
                style={{ background: ACCENT }}
              >
                {saving ? <Spinner /> : <PlusIcon />}
                {saving ? "Saving…" : "Save as artifact"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- card --- */

export function DiagramCard({
  spec,
  savedSlug,
  onSave,
  onChangeDetail,
}: {
  spec: DiagramSpec;
  /** Set once this diagram has been promoted to an artifact. */
  savedSlug?: string | null;
  onSave?: () => Promise<void>;
  onChangeDetail?: (detail: DiagramDetail) => Promise<void>;
}) {
  const [focused, setFocused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyDetail, setBusyDetail] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    if (!onSave || saving || savedSlug) return;
    setError(null);
    setSaving(true);
    try {
      await onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this diagram.");
    } finally {
      setSaving(false);
    }
  }, [onSave, saving, savedSlug]);

  const handleDetail = async (detail: DiagramDetail) => {
    if (!onChangeDetail || busyDetail) return;
    setError(null);
    setBusyDetail(true);
    try {
      await onChangeDetail(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not redraw this diagram.");
    } finally {
      setBusyDetail(false);
    }
  };

  const copyOutline = async () => {
    try {
      await navigator.clipboard.writeText(diagramToOutline(spec));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard unavailable — nothing useful to say here.
    }
  };

  const expandable = canExpandDiagram(spec);
  const showDetailControl = Boolean(onChangeDetail) && (expandable || spec.detail === 2);

  return (
    <>
      <div data-design-id="m-322057ca1c7c" className="my-1 flex w-full flex-col gap-[22px] rounded-[14px] border border-[#E4E2EC] bg-white px-7 pt-[22px] pb-[18px]">
        {/* header */}
        <div data-design-id="m-b116e5d23e62" className="flex items-center justify-between gap-4">
          <div data-design-id="m-ef468432f984" className="flex min-w-0 flex-col gap-[5px]">
            <span data-design-id="m-ff3ffcdcafc9" className="text-[10px] leading-3 font-semibold tracking-[0.14em]" style={{ color: ACCENT }}><DesignCopy id="m-ff3ffcdcafc9">
              DIAGRAM
            </DesignCopy></span>
            <span data-design-id="m-37cb18f74c3f" className="truncate text-base leading-5 font-semibold tracking-[-0.005em] text-[#0A0A0A]">
              {spec.title}
            </span>
          </div>

          <div data-design-id="m-193fa7fb6602" className="flex shrink-0 items-center gap-[7px]">
            <GhostButton label={copied ? "Copied" : "Copy outline"} onClick={copyOutline}>
              {copied ? <CheckIcon /> : <CopyIcon />}
            </GhostButton>
            <GhostButton label="Expand" onClick={() => setFocused(true)}>
              <ExpandIcon />
            </GhostButton>

            {savedSlug ? (
              <Link data-design-id="m-cef7be85aeb8"
                href={`/artifacts/${savedSlug}`}
                className="flex h-[31px] shrink-0 items-center gap-[7px] rounded-lg px-3.5 text-[13px] leading-4 font-medium"
                style={{ background: ACCENT_SOFT, color: ACCENT }}
              >
                <CheckIcon />
                Saved
              </Link>
            ) : onSave ? (
              <button data-design-id="m-c087fcb99b98"
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex h-[31px] shrink-0 items-center gap-[7px] rounded-lg px-3.5 text-[13px] leading-4 font-medium text-white disabled:opacity-60"
                style={{ background: ACCENT }}
              >
                {saving ? <Spinner /> : <PlusIcon />}
                {saving ? "Saving…" : "Save as artifact"}
              </button>
            ) : null}
          </div>
        </div>

        {/* diagram */}
        <div data-design-id="m-ff782a641f31" className={busyDetail ? "opacity-50 transition-opacity" : "transition-opacity"}>
          <DiagramView spec={spec} scale="inline" />
        </div>

        {/* footer */}
        <div data-design-id="m-14302de6bcd7" className="flex items-center justify-between gap-4">
          <span data-design-id="m-01a92e6e5b4f" className="text-[12px] leading-4 text-[#9A9A98]">{describeDiagram(spec)}</span>

          {showDetailControl ? (
            <button data-design-id="m-e18aa3b5d06c"
              type="button"
              onClick={() => handleDetail(expandable ? 2 : 1)}
              disabled={busyDetail}
              className="flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] leading-4 font-medium disabled:opacity-60"
              style={{ background: ACCENT_SOFT, color: ACCENT }}
            >
              {busyDetail ? (
                <span data-design-id="m-bedca9645b9d" style={{ color: ACCENT }}>
                  <Spinner />
                </span>
              ) : expandable ? (
                <PlusIcon color={ACCENT} size={13} />
              ) : (
                <CollapseIcon />
              )}
              {busyDetail
                ? "Redrawing…"
                : expandable
                  ? "Add a level of detail"
                  : "Make it simpler"}
            </button>
          ) : null}
        </div>

        {error ? <p data-design-id="m-230ba1787986" className="text-[13px] leading-[18px] text-[#B42318]">{error}</p> : null}
      </div>

      {focused ? (
        <FocusDialog
          spec={spec}
          onClose={() => setFocused(false)}
          onSave={onSave ? handleSave : undefined}
          saved={savedSlug}
          saving={saving}
        />
      ) : null}
    </>
  );
}
