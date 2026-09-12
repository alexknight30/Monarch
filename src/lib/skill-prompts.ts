/** Server-safe skill prompt builders (no localStorage). */

export function buildSkillUserMessage(opts: {
  command: string;
  lastAssistant: string;
  /** Optional extra text the student typed after selecting the skill. */
  extra?: string;
  /** Custom skill instruction from the client. */
  customPrompt?: string;
}): string {
  const extra = opts.extra?.trim();
  const source = opts.lastAssistant.trim();
  const extraBlock = extra
    ? `\n\nAdditional direction from the student:\n${extra}`
    : "";

  if (opts.command === "simplify") {
    return (
      `Rewrite the following reply in simple terms a curious 10-year-old would understand. ` +
      `Keep the meaning accurate. Use everyday words and short sentences. ` +
      `Do not mention that you are simplifying or talking to a child.\n\n` +
      `---\n${source}\n---` +
      extraBlock
    );
  }

  // /diagram is handled by buildDiagramMessage in diagram-tool.ts — it needs a
  // forced tool call, not a prose instruction, so it never routes through here.

  const instruction = opts.customPrompt?.trim();
  if (!instruction) {
    return (
      `Apply the /${opts.command} skill to the following reply.\n\n` +
      `---\n${source}\n---` +
      extraBlock
    );
  }

  return (
    `${instruction}\n\nUse this previous reply as the source material:\n\n` +
    `---\n${source}\n---` +
    extraBlock
  );
}
