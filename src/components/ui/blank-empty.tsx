"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useViewId } from "@/components/view-provider";
import {
  createClassForView,
  createProjectForView,
} from "@/components/ui/create-entity";
import { NewIssueDialog } from "@/components/ui/new-issue-dialog";

export type BlankCreateKind = "issue" | "project" | "class";

type BlankEmptyPlusProps = {
  /** Accessible label for the centered plus button. */
  addLabel: string;
  createKind?: BlankCreateKind;
  /** Custom create handler — used instead of the built-in flow when provided. */
  onCreate?: () => void;
};

/** Centered plus for blank planner / classes / projects. */
export function BlankEmptyPlus({
  addLabel,
  createKind = "issue",
  onCreate,
}: BlankEmptyPlusProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const viewId = useViewId();

  const handleClick = async () => {
    if (onCreate) {
      onCreate();
      return;
    }
    if (createKind === "issue") {
      setOpen(true);
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const created =
        createKind === "project"
          ? await createProjectForView(viewId)
          : await createClassForView(viewId);
      if (created) router.refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not create.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <button
          type="button"
          aria-label={addLabel}
          onClick={handleClick}
          disabled={busy}
          className="flex h-18 w-18 items-center justify-center rounded-full border border-[#E6E6E6] bg-white text-[#0A0A0A] transition-colors hover:bg-[#FAFAFA] disabled:opacity-50"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" className="shrink-0">
            <path
              d="M12 5v14M5 12h14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {createKind === "issue" ? (
        <NewIssueDialog open={open} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}
