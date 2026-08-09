import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type TitleRequestBody = {
  message?: string;
  reply?: string;
};

const MAX_LEN = 2000;

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured." },
      { status: 500 },
    );
  }

  let body: TitleRequestBody;
  try {
    body = (await request.json()) as TitleRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const reply =
    typeof body.reply === "string" ? body.reply.trim().slice(0, MAX_LEN) : "";

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 40,
      system:
        "You name student study chats. Reply with a short title only (3–6 words). No quotes, no trailing punctuation, no explanation. Capture the topic, not the student's exact wording.",
      messages: [
        {
          role: "user",
          content: reply
            ? `Student message:\n${message.slice(0, MAX_LEN)}\n\nAssistant reply (excerpt):\n${reply}\n\nTitle:`
            : `Student message:\n${message.slice(0, MAX_LEN)}\n\nTitle:`,
        },
      ],
    });

    const raw = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join(" ")
      .trim();

    const title = raw
      .replace(/^["'“”]+|["'“”]+$/g, "")
      .replace(/[.!?]+$/g, "")
      .trim()
      .slice(0, 60);

    if (!title) {
      return NextResponse.json(
        { error: "Model returned an empty title." },
        { status: 502 },
      );
    }

    return NextResponse.json({ title });
  } catch (error) {
    console.error("[api/chat/title]", error);
    const messageText =
      error instanceof Error ? error.message : "Failed to generate title.";
    return NextResponse.json({ error: messageText }, { status: 502 });
  }
}
