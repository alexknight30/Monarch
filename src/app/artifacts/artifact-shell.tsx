"use client";

import type { ReactNode } from "react";
import { BreadcrumbBack } from "@/components/ui/breadcrumb-back";
import { LinkedObjectsPanel } from "@/components/linked-objects-panel";
import { TagChips } from "@/components/ui/tag-chips";
import { ARTIFACT_KIND_LABEL, type Artifact } from "@/lib/mock-data";

export function ArtifactShell({
  artifact,
  children,
}: {
  artifact: Artifact;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 justify-center overflow-y-auto pt-11 pb-16">
      <div className="flex w-[1180px] items-start gap-10">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <div>
            <div className="flex items-center gap-2">
              <BreadcrumbBack
                href="/artifacts"
                className="text-sm leading-[18px] text-[#7A7A7A]"
              >
                Artifacts
              </BreadcrumbBack>
              <span className="text-sm leading-[18px] text-[#C4C4C0]">/</span>
              <span className="text-sm leading-[18px] text-[#0A0A0A]">
                {artifact.title}
              </span>
            </div>
            <h1 className="font-display pt-[22px] text-[32px] leading-[40px] tracking-[-0.015em] text-[#0A0A0A]">
              {artifact.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2 pt-2 text-[13px] text-[#9A9A98]">
              <span>{ARTIFACT_KIND_LABEL[artifact.kind]}</span>
              <span className="text-[#C4C4C0]">·</span>
              <span>{artifact.updated}</span>
              <TagChips tagIds={artifact.tagIds} />
            </div>
            {artifact.description ? (
              <p className="max-w-[640px] pt-3 text-sm leading-[21px] text-[#4E4E4C]">
                {artifact.description}
              </p>
            ) : null}
          </div>
          {children}
        </div>
        <aside className="w-[280px] shrink-0">
          <LinkedObjectsPanel object={{ kind: "artifact", id: artifact.id }} />
        </aside>
      </div>
    </div>
  );
}
