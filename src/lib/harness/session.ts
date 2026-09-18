import { readViewStore } from "@/lib/local-db";
import { htmlToPlainText } from "@/lib/documents";
import {
  artifactExcerpt,
  findTask,
  linksFor,
  otherEnd,
  summarizeArtifact,
  summarizeEvent,
  summarizeTask,
} from "@/lib/objects/summaries";
import type { ObjectRef } from "@/lib/objects/types";
import type { ViewId } from "@/lib/views";
import type { DocumentChatContext } from "@/lib/document-tools";

export type SessionFocus = {
  courseSlug?: string;
  artifactId?: string;
  document?: DocumentChatContext;
};

export async function buildSessionContext(
  viewId: ViewId,
  focus: SessionFocus,
): Promise<string> {
  const store = await readViewStore(viewId);
  const lines: string[] = ["## Session context"];
  lines.push(`Current date and time: ${new Date().toISOString()}. Local timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}.`);
  lines.push(`Courses: ${store.courses.map((item) => `${item.code} — ${item.title} (${item.id})`).join("; ")}. Use get_course for full details, deadlines and policies.`);

  const course = focus.courseSlug
    ? store.courses.find(
        (item) => item.slug === focus.courseSlug || item.id === focus.courseSlug,
      )
    : undefined;

  const openArtifact = focus.document?.slug
    ? store.artifacts.find(
        (item) =>
          item.slug === focus.document?.slug || item.id === focus.document?.slug,
      )
    : focus.artifactId
      ? store.artifacts.find(
          (item) => item.id === focus.artifactId || item.slug === focus.artifactId,
        )
      : undefined;

  if (openArtifact) {
    lines.push(
      `Page: the student is on the ${openArtifact.kind} artifact “${openArtifact.title}” (${openArtifact.id}).`,
    );
    const excerpt =
      focus.document?.selection?.trim() ||
      (focus.document?.bodyText
        ? focus.document.bodyText.slice(0, 500)
        : artifactExcerpt(openArtifact));
    if (excerpt) {
      lines.push(`Open excerpt:\n"""${excerpt.slice(0, 500)}"""`);
    }
  } else if (course) {
    lines.push(
      `Page: the student started this chat from ${course.code} — ${course.title}. Stay on this course unless they change the subject.`,
    );
    lines.push(`Instructor: ${course.instructor}. Term: ${course.term}. Schedule: ${course.schedule}.`);
  } else {
    lines.push("Page: main chat.");
  }

  const summaries = [];
  if (openArtifact) {
    summaries.push(summarizeArtifact(openArtifact, store.courses));
    const ref: ObjectRef = { kind: "artifact", id: openArtifact.id };
    for (const link of linksFor(store.links, ref)) {
      const other = otherEnd(link, ref);
      if (other.kind === "artifact") {
        const hit = store.artifacts.find((item) => item.id === other.id);
        if (hit) summaries.push(summarizeArtifact(hit, store.courses));
      } else if (other.kind === "event") {
        const hit = store.calendar.find((item) => item.id === other.id);
        if (hit) summaries.push(summarizeEvent(hit, store.courses));
      } else {
        const hit = findTask(store.planner, other.id);
        if (hit) summaries.push(summarizeTask(hit, store.courses));
      }
    }
  }

  if (course && !openArtifact) {
    const tasks = store.planner.filter(
      (issue) => issue.courseId === course.id || issue.courseSlug === course.slug,
    );
    if (tasks.length) {
      lines.push(
        `Tasks:\n${tasks
          .slice(0, 12)
          .map((task) => `- ${task.key}: ${task.title}${task.due ? ` (${task.due})` : ""}`)
          .join("\n")}`,
      );
    }
    lines.push(`Course policies: ${JSON.stringify(course.policies ?? {})}`);
    lines.push(`Office hours: ${JSON.stringify(course.officeHours ?? [])}`);
    const upcoming = store.calendar
      .filter((event) => (event.courseId === course.id || event.courseSlug === course.slug) && event.startsAt >= new Date().toISOString().slice(0, 10))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .slice(0, 8);
    if (upcoming.length) {
      lines.push(
        `Upcoming calendar:\n${upcoming
          .map((event) => `- ${event.title} (${event.kind}) ${event.startsAt}`)
          .join("\n")}`,
      );
    }
  }

  if (summaries.length) {
    lines.push("Object summaries (not full bodies):");
    for (const summary of summaries) {
      lines.push(
        `- ${summary.kind} ${summary.id}: ${summary.title} [${summary.tagIds.join(", ") || "untagged"}] ${summary.courseLabel ?? ""} · ${summary.bodyChars} chars`,
      );
    }
  }

  if (store.memory.summary) {
    lines.push(`Temporal memory:\n${store.memory.summary}`);
  } else if (store.memory.events.length) {
    lines.push(
      `Recent activity:\n${store.memory.events
        .slice(0, 8)
        .map((event) => `- ${event.text}`)
        .join("\n")}`,
    );
  }

  if (store.memory.copyFlags.length) {
    const latest = store.memory.copyFlags[0];
    lines.push(
      `Integrity: student copied ${latest.source === "document-paste" ? "into a document" : "from chat"} at ${latest.at}${latest.turn ? ` (${latest.turn})` : ""}. Do not continue producing paste-ready work.`,
    );
  }

  if (focus.document?.bodyText) {
    lines.push(
      "A document is open. Use read_object for a fresh full body and update_document for edits. Stay within academic guardrails.",
    );
  }

  return lines.join("\n");
}

export function pageExcerptFromDocument(document?: DocumentChatContext) {
  if (!document) return "";
  const selection = document.selection?.trim();
  if (selection) return selection.slice(0, 500);
  const body =
    document.bodyText?.trim() ||
    (document.bodyHtml ? htmlToPlainText(document.bodyHtml) : "");
  return body.slice(0, 500);
}
