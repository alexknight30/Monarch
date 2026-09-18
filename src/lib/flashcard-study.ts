import type { FlashcardStudy } from "./mock-data";

/** Older decks and browser recovery records may contain only part of the study state. */
export function normalizeFlashcardStudy(value: unknown): FlashcardStudy {
  const data = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const ids = (items: unknown) => Array.isArray(items) ? [...new Set(items.filter((id): id is string => typeof id === "string"))] : [];
  return { known: ids(data.known), starred: ids(data.starred), reverse: data.reverse === true };
}
