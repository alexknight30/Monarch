import type { ViewId } from "@/lib/views";

export function reportCopy(
  viewId: ViewId,
  source: "chat" | "document-paste",
  turn?: string,
) {
  void fetch(`/api/${viewId}/integrity/copy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source, turn }),
  }).catch(() => {
    // Integrity telemetry is best-effort.
  });
}
