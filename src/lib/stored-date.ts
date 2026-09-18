import { parseStoredDate } from "./calendar-events";

/** ISO calendar dates are kept as local dates; timestamps may include an offset. */
export function validateStoredDate(value: unknown, required = false): string | null {
  if (value === null || value === "" || value === undefined) {
    if (required) throw new Error("Choose a date and time.");
    return null;
  }
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?)?$/.test(value) || Number.isNaN(parseStoredDate(value).getTime())) throw new Error("Use a valid date or date and time.");
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const check = new Date(year, month - 1, day);
  if (check.getFullYear() !== year || check.getMonth() !== month - 1 || check.getDate() !== day) throw new Error("That calendar date does not exist.");
  const clock = /T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(value);
  if (clock && (+clock[1] > 23 || +clock[2] > 59 || +(clock[3] || 0) > 59)) throw new Error("That time does not exist.");
  return value;
}
