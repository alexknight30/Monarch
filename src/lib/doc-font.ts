/** On-screen type is drawn this many pixels larger than the true point size. */
export const FONT_DISPLAY_OFFSET = 6;

export const DEFAULT_BODY_FONT_SIZE = 18;
export const DEFAULT_TITLE_FONT_SIZE = 12;

export function displayFontSize(trueSize: number): number {
  return trueSize + FONT_DISPLAY_OFFSET;
}

export function parseTrueFontSize(value: string | null | undefined): number | null {
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}
