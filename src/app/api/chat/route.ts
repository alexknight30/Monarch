import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import type { DocumentChatContext } from "@/lib/document-tools";
import {
  formatDiagramBlock,
  normalizeDiagramSpec,
} from "@/lib/diagram";
import {
  DIAGRAM_TOOL,
  DIAGRAM_TOOL_NAME,
  buildDiagramMessage,
  readDiagramToolInput,
} from "@/lib/diagram-tool";
import { buildPolicyText } from "@/lib/harness/policy";
import { runHarnessStream } from "@/lib/harness/loop";
import { toolCatalog } from "@/lib/harness/tools";
import { buildSessionContext } from "@/lib/harness/session";
import {
  MAX_ATTACHMENTS,
  filesToContentBlocks,
  isSupportedAttachment,
  stripAttachmentNote,
} from "@/lib/chat-attachments";
import { buildSkillUserMessage } from "@/lib/skill-prompts";
import { getServerViewId } from "@/lib/views-server";
import { BUILTIN_SKILLS } from "@/lib/skills";

export const runtime = "nodejs";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type SkillPayload = {
  command?: string;
  prompt?: string;
  toolName?: string;
};

type ChatRequestBody = {
  message?: string;
  messages?: ChatMessage[];
  skill?: SkillPayload;
  document?: DocumentChatContext;
  courseSlug?: string;
};

const MAX_MESSAGE_LENGTH = 8000;
const MAX_HISTORY = 20;
const MAX_SKILL_PROMPT = 4000;

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const msg = value as ChatMessage;
  return (
    (msg.role === "user" || msg.role === "assistant") &&
    typeof msg.content === "string" &&
    msg.content.trim().length > 0
  );
}

function parseDocumentContext(
  value: unknown,
): DocumentChatContext | undefined {
  if (!value || typeof value !== "object") return undefined;
  const doc = value as DocumentChatContext;
  if (typeof doc.slug !== "string" || !doc.slug.trim()) return undefined;
  return {
    slug: doc.slug.trim(),
    ...(typeof doc.title === "string" ? { title: doc.title } : {}),
    ...(typeof doc.bodyHtml === "string" ? { bodyHtml: doc.bodyHtml } : {}),
    ...(typeof doc.bodyText === "string" ? { bodyText: doc.bodyText } : {}),
    ...(typeof doc.selection === "string" ? { selection: doc.selection } : {}),
  };
}

async function parseChatRequest(request: Request): Promise<{
  body: ChatRequestBody;
  files: File[];
}> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const raw = form.get("payload");
    if (typeof raw !== "string") {
      throw new Error("Invalid multipart payload.");
    }
    const body = JSON.parse(raw) as ChatRequestBody;
    const files = form
      .getAll("files")
      .filter((value): value is File => value instanceof File);
    return { body, files };
  }

  const body = (await request.json()) as ChatRequestBody;
  return { body, files: [] };
}

async function contentBlocksForFiles(files: File[]) {
  if (files.length > MAX_ATTACHMENTS) {
    throw new Error(`You can attach up to ${MAX_ATTACHMENTS} files.`);
  }
  for (const file of files) {
    if (!isSupportedAttachment(file.name, file.type)) {
      throw new Error(`${file.name} isn’t a supported file type.`);
    }
  }
  return filesToContentBlocks(files);
}

export async function POST(request: Request) {
  let body: ChatRequestBody;
  let uploadedFiles: File[] = [];
  try {
    const parsed = await parseChatRequest(request);
    body = parsed.body;
    uploadedFiles = parsed.files;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  let fileBlocks: Anthropic.ContentBlockParam[] = [];
  try {
    fileBlocks = await contentBlocksForFiles(uploadedFiles);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not read that file." },
      { status: 400 },
    );
  }

  const document = parseDocumentContext(body.document);
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
  const registered = skillCommand
    ? BUILTIN_SKILLS.find((skill) => skill.command === skillCommand)
    : undefined;
  const skillToolName =
    typeof body.skill?.toolName === "string"
      ? body.skill.toolName
      : registered?.toolName;

  const latest =
    typeof body.message === "string" && body.message.trim()
      ? body.message.trim()
      : history.filter((m) => m.role === "user").at(-1)?.content?.trim();

  if (!latest && !skillCommand && fileBlocks.length === 0) {
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
        : fileBlocks.length > 0
          ? [{ role: "user" as const, content: "Please read the attached file(s)." }]
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

    const rawExtra = latest ?? "";
    const extra = rawExtra
      .replace(new RegExp(`^/${skillCommand}\\b\\s*`, "i"), "")
      .trim();

    const skillMessage =
      skillCommand === "diagram" || skillToolName === DIAGRAM_TOOL_NAME
        ? buildDiagramMessage({ source: lastAssistant.content, extra })
        : buildSkillUserMessage({
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

  if (messages.at(-1)?.role !== "user") {
    if (!latest && fileBlocks.length === 0) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 },
      );
    }
    messages.push({
      role: "user",
      content: latest || "Please read the attached file(s).",
    });
  }

  if (fileBlocks.length > 0 && !skillCommand && messages.at(-1)?.role === "user") {
    const last = messages.at(-1);
    const text =
      typeof last?.content === "string"
        ? stripAttachmentNote(last.content)
        : "";
    messages = [
      ...messages.slice(0, -1),
      {
        role: "user",
        content: [
          ...fileBlocks,
          {
            type: "text" as const,
            text:
              text ||
              "Please read the attached file(s) and help me with them.",
          },
        ],
      },
    ];
  }

  const viewId = await getServerViewId();
  const courseSlug =
    typeof body.courseSlug === "string" ? body.courseSlug.trim() : "";
  const isDiagram =
    skillCommand === "diagram" || skillToolName === DIAGRAM_TOOL_NAME;
  const toolsEnabled = !skillCommand || Boolean(skillToolName);

  if (isDiagram) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured." },
        { status: 500 },
      );
    }
    const client = new Anthropic({ apiKey });
    const system = [
      {
        type: "text" as const,
        text: buildPolicyText(toolCatalog()),
        cache_control: { type: "ephemeral" as const },
      },
      {
        type: "text" as const,
        text: (await buildSessionContext(viewId, { courseSlug, document })) || " ",
      },
    ];
    try {
      const response = await client.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 2048,
        system,
        messages,
        tools: [DIAGRAM_TOOL],
        tool_choice: { type: "tool" as const, name: DIAGRAM_TOOL_NAME },
      });
      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim();
      const spec = normalizeDiagramSpec(readDiagramToolInput(response));
      if (!spec) {
        return NextResponse.json(
          {
            error:
              "Could not build a diagram from that reply. Try asking about it in a bit more detail first.",
          },
          { status: 502 },
        );
      }
      const caption = spec.caption ?? text;
      return NextResponse.json({
        message: {
          role: "assistant" as const,
          content: caption
            ? `${caption}\n\n${formatDiagramBlock(spec)}`
            : formatDiagramBlock(spec),
        },
        actions: [],
      });
    } catch (error) {
      console.error("[api/chat] diagram", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to reach Claude." },
        { status: 502 },
      );
    }
  }

  const stream = runHarnessStream({
    viewId,
    messages,
    document,
    courseSlug: courseSlug || undefined,
    toolsEnabled,
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
