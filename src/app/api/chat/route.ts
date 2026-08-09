import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  executePlannerTool,
  PLANNER_TOOLS,
  type ChatToolAction,
} from "@/lib/chat-tools";
import { ACADEMIC_GUARDRAILS_SYSTEM } from "@/lib/guardrails";
import { buildSkillUserMessage } from "@/lib/skill-prompts";
import { getServerViewId } from "@/lib/views-server";

export const runtime = "nodejs";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type SkillPayload = {
  command?: string;
  prompt?: string;
};

type ChatRequestBody = {
  message?: string;
  messages?: ChatMessage[];
  skill?: SkillPayload;
};

const MAX_MESSAGE_LENGTH = 8000;
const MAX_HISTORY = 20;
const MAX_SKILL_PROMPT = 4000;
const MAX_TOOL_ROUNDS = 6;

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

  const skillCommand =
    typeof body.skill?.command === "string"
      ? body.skill.command.replace(/^\//, "").trim().toLowerCase()
      : "";
  const skillPrompt =
    typeof body.skill?.prompt === "string"
      ? body.skill.prompt.trim().slice(0, MAX_SKILL_PROMPT)
      : "";

  const latest =
    typeof body.message === "string" && body.message.trim()
      ? body.message.trim()
      : history.filter((m) => m.role === "user").at(-1)?.content?.trim();

  // Skills can run with only a slash command (no free text).
  if (!latest && !skillCommand) {
    return NextResponse.json(
      { error: "Message is required." },
      { status: 400 },
    );
  }

  if (latest && latest.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: "Message is too long." },
      { status: 400 },
    );
  }

  let messages: Anthropic.MessageParam[] =
    history.length > 0
      ? history.map((m) => ({
          role: m.role,
          content: m.content.slice(0, MAX_MESSAGE_LENGTH),
        }))
      : latest
        ? [{ role: "user" as const, content: latest }]
        : [];

  if (skillCommand) {
    const prior =
      messages.at(-1)?.role === "user" ? messages.slice(0, -1) : messages;
    const lastAssistant = [...prior]
      .reverse()
      .find((m) => m.role === "assistant");

    if (!lastAssistant || typeof lastAssistant.content !== "string") {
      return NextResponse.json(
        {
          error:
            "Nothing to run this skill on yet. Ask something first, then use /simplify or /diagram.",
        },
        { status: 400 },
      );
    }

    // Optional free text after the slash command (strip leading /command).
    const rawExtra = latest ?? "";
    const extra = rawExtra
      .replace(new RegExp(`^/${skillCommand}\\b\\s*`, "i"), "")
      .trim();

    const skillMessage = buildSkillUserMessage({
      command: skillCommand,
      lastAssistant: lastAssistant.content,
      extra,
      customPrompt: skillPrompt || undefined,
    });

    messages = [
      ...prior,
      { role: "user", content: skillMessage.slice(0, MAX_MESSAGE_LENGTH) },
    ];
  }

  // Anthropic requires the conversation to end with a user turn
  if (messages.at(-1)?.role !== "user") {
    if (!latest) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 },
      );
    }
    messages.push({ role: "user", content: latest });
  }

  const viewId = await getServerViewId();
  // Slash skills rewrite the last reply — no planner mutations.
  const toolsEnabled = !skillCommand;
  const actions: ChatToolAction[] = [];

  try {
    const client = new Anthropic({ apiKey });
    let response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: skillCommand === "diagram" ? 2048 : 1024,
      system: ACADEMIC_GUARDRAILS_SYSTEM,
      messages,
      ...(toolsEnabled ? { tools: PLANNER_TOOLS } : {}),
    });

    let rounds = 0;
    while (
      toolsEnabled &&
      response.stop_reason === "tool_use" &&
      rounds < MAX_TOOL_ROUNDS
    ) {
      rounds += 1;
      const toolUses = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
      );

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const use of toolUses) {
        const input =
          use.input && typeof use.input === "object"
            ? (use.input as Record<string, unknown>)
            : {};
        try {
          const { result, action } = await executePlannerTool(
            viewId,
            use.name,
            input,
          );
          if (action) actions.push(action);
          toolResults.push({
            type: "tool_result",
            tool_use_id: use.id,
            content: JSON.stringify(result),
          });
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Tool execution failed.";
          toolResults.push({
            type: "tool_result",
            tool_use_id: use.id,
            is_error: true,
            content: JSON.stringify({ error: message }),
          });
        }
      }

      messages = [
        ...messages,
        { role: "assistant", content: response.content },
        { role: "user", content: toolResults },
      ];

      response = await client.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 1024,
        system: ACADEMIC_GUARDRAILS_SYSTEM,
        messages,
        tools: PLANNER_TOOLS,
      });
    }

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
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
      actions,
      plannerChanged: actions.length > 0,
    });
  } catch (error) {
    console.error("[api/chat]", error);
    const message =
      error instanceof Error ? error.message : "Failed to reach Claude.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
