import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { ACADEMIC_GUARDRAILS_SYSTEM } from "@/lib/guardrails";

export const runtime = "nodejs";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatRequestBody = {
  message?: string;
  messages?: ChatMessage[];
};

const MAX_MESSAGE_LENGTH = 8000;
const MAX_HISTORY = 20;

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const msg = value as ChatMessage;
  return (
    (msg.role === "user" || msg.role === "assistant") &&
    typeof msg.content === "string" &&
    msg.content.trim().length > 0
  );
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured." },
      { status: 500 },
    );
  }

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const history = Array.isArray(body.messages)
    ? body.messages.filter(isChatMessage).slice(-MAX_HISTORY)
    : [];

  const latest =
    typeof body.message === "string" && body.message.trim()
      ? body.message.trim()
      : history.filter((m) => m.role === "user").at(-1)?.content?.trim();

  if (!latest) {
    return NextResponse.json(
      { error: "Message is required." },
      { status: 400 },
    );
  }

  if (latest.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: "Message is too long." },
      { status: 400 },
    );
  }

  const messages: ChatMessage[] =
    history.length > 0
      ? history.map((m) => ({
          role: m.role,
          content: m.content.slice(0, MAX_MESSAGE_LENGTH),
        }))
      : [{ role: "user", content: latest }];

  // Anthropic requires the conversation to end with a user turn
  if (messages.at(-1)?.role !== "user") {
    messages.push({ role: "user", content: latest });
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      system: ACADEMIC_GUARDRAILS_SYSTEM,
      messages,
    });

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    if (!text) {
      return NextResponse.json(
        { error: "Model returned an empty response." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      message: {
        role: "assistant" as const,
        content: text,
      },
    });
  } catch (error) {
    console.error("[api/chat]", error);
    const message =
      error instanceof Error ? error.message : "Failed to reach Claude.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
