"use client";

import { TAGS, type TagId } from "@/lib/objects/tags";

export function TagChips({ tagIds }: { tagIds?: TagId[] }) {
  if (!tagIds?.length) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {tagIds.map((id) => {
        const tag = TAGS[id];
        if (!tag) return null;
        return (
          <span
            key={id}
            className="rounded-full px-2 py-0.5 text-[11px] leading-4 font-medium"
            style={{
              color: tag.color,
              background: `${tag.color}14`,
            }}
          >
            {tag.label}
          </span>
        );
      })}
    </span>
  );
}
