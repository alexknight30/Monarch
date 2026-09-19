"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useViewId } from "@/components/view-provider";
import {
  createCourseForView,
} from "@/components/ui/create-entity";
import { IconButton } from "@/components/ui/icon-button";
import { NewIssueDialog } from "@/components/ui/new-issue-dialog";
import { PlusSignIcon } from "@/components/ui/plus-sign";

export type BlankCreateKind = "issue" | "artifact" | "course";

type BlankEmptyPlusProps = {
  /** Accessible label for the centered plus button. */
  addLabel: string;
  createKind?: BlankCreateKind;
  /** Custom create handler — used instead of the built-in flow when provided. */
  onCreate?: () => void;
};

/** Centered plus for blank planner / courses / artifacts. */
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
    if (createKind === "artifact") { router.push("/artifacts/new"); return; }
    setBusy(true);
    try {
      const created = await createCourseForView(viewId);
      if (created) router.refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not create.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div data-design-id="m-11f0353a95b1" className="flex min-h-0 flex-1 items-center justify-center">
        <IconButton data-design-id="m-c078b174b4c7" data-design-key="m-c078b174b4c7"
          icon={PlusSignIcon}
          label={addLabel}
          size="l"
          onClick={handleClick}
          disabled={busy}
        />
      </div>

      {createKind === "issue" ? (
        <NewIssueDialog open={open} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}
