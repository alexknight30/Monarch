export const HAIKU_MODEL = "claude-haiku-4-5";
export const SONNET_MODEL = "claude-sonnet-5";
export const GROK_MODEL = "grok-4";

export type TeachingProvider = "anthropic" | "xai";

export type ModelChoice = {
  provider: TeachingProvider;
  model: string;
  reason: string;
};

export function hasXaiKey() {
  return Boolean(process.env.XAI_API_KEY?.trim());
}

export function hasAnthropicKey() {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

/** Pick once per request. Never switch providers mid-loop. */
export function decideTeachingModel(hint?: "haiku" | "grok" | "sonnet"): ModelChoice {
  if (hint === "haiku") {
    return {
      provider: "anthropic",
      model: HAIKU_MODEL,
      reason: "Cheap side task.",
    };
  }
  if (hint === "sonnet" || !hasXaiKey()) {
    return {
      provider: "anthropic",
      model: SONNET_MODEL,
      reason: hasXaiKey()
        ? "Sonnet chosen for this request."
        : "Grok unavailable; using Claude Sonnet.",
    };
  }
  return {
    provider: "xai",
    model: GROK_MODEL,
    reason: "Default teaching model.",
  };
}

export function anthropicCacheSystem(policy: string, session: string) {
  return [
    {
      type: "text" as const,
      text: policy,
      cache_control: { type: "ephemeral" as const },
    },
    {
      type: "text" as const,
      text: session,
    },
  ];
}
