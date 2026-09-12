import type { ChatTurnAction } from "@/lib/chat-history";

export type ChatStreamDone = {
  type: "done";
  actions?: ChatTurnAction[];
  plannerChanged?: boolean;
  documentChanged?: boolean;
  documentHtml?: string;
};

export type ChatStreamEvent =
  | { type: "delta"; text: string }
  | ChatStreamDone
  | { type: "error"; error: string };

export async function consumeChatSse(
  response: Response,
  handlers: {
    onDelta: (text: string) => void;
    onDone: (event: ChatStreamDone) => void;
  },
): Promise<void> {
  if (!response.body) throw new Error("Empty response.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finished = false;

  const handleChunk = (chunk: string) => {
    const line = chunk.split("\n").find((entry) => entry.startsWith("data:"));
    if (!line) return;
    const payload = line.replace(/^data:\s?/, "").trim();
    if (!payload || payload === "[DONE]") return;

    const event = JSON.parse(payload) as ChatStreamEvent;
    if (event.type === "error") throw new Error(event.error);
    if (event.type === "delta") handlers.onDelta(event.text);
    if (event.type === "done") {
      finished = true;
      handlers.onDone(event);
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) handleChunk(part);
  }

  if (buffer.trim()) handleChunk(buffer);
  if (!finished) throw new Error("Chat stream ended early.");
}
