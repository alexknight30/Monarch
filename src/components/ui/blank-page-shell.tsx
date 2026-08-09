import type { ReactNode } from "react";
import {
  BlankEmptyPlus,
  type BlankCreateKind,
} from "@/components/ui/blank-empty";

type BlankPageShellProps = {
  title: string;
  tabs: string[];
  isEmpty: boolean;
  addLabel: string;
  createKind?: BlankCreateKind;
  headerActions?: ReactNode;
  children: ReactNode;
};

/**
 * Shared page chrome for planner / classes / projects.
 * Blank views: title, italic empty copy, and a centered plus — no tabs, header actions, or cards.
 */
export function BlankPageShell({
  title,
  tabs,
  isEmpty,
  addLabel,
  createKind = "issue",
  headerActions,
  children,
}: BlankPageShellProps) {
  return (
    <div className="flex flex-1 flex-col items-center pt-13 pb-16">
      <div className="flex w-240 min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-[34px] leading-[42px] tracking-[-0.015em] text-[#0A0A0A]">
            {title}
          </h1>
          {!isEmpty ? headerActions : null}
        </div>

        {isEmpty ? (
          <>
            <p className="pt-2.5 text-[15px] leading-[22px] text-[#9A9A98] italic">
              Nothing to see here yet
            </p>
            <BlankEmptyPlus addLabel={addLabel} createKind={createKind} />
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5 pt-[30px]">
              {tabs.map((tab, i) => (
                <button
                  key={tab}
                  type="button"
                  className={`flex h-[34px] items-center rounded-lg px-3.5 text-sm leading-[18px] ${
                    i === 0
                      ? "bg-[#F1F1EF] text-[#0A0A0A]"
                      : "text-[#5E5E5E] hover:bg-[#F7F7F5]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            {children}
          </>
        )}
      </div>
    </div>
  );
}
