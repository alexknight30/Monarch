"use client";

import type { ArtifactKind } from "@/lib/mock-data";
import { ARTIFACT_KIND_LABEL, ARTIFACT_KINDS } from "@/lib/mock-data";
import type { ViewId } from "@/lib/views";

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "Request failed.");
  }
  return data;
}

function promptArtifactKind(): ArtifactKind | null {
  const options = ARTIFACT_KINDS.map((kind) => kind).join(", ");
  const raw = window.prompt(`Artifact type (${options})`, "document");
  if (raw == null) return null;
  const kind = raw.trim().toLowerCase();
  if (kind === "paper") return "reading";
  if ((ARTIFACT_KINDS as readonly string[]).includes(kind)) {
    return kind as ArtifactKind;
  }
  window.alert(`Type must be one of: ${options}.`);
  return null;
}

/** Prompt + POST a new artifact into the active view's local store. */
export async function createArtifactForView(viewId: ViewId) {
  const kind = promptArtifactKind();
  if (!kind) return false;
  const title = window.prompt(`${ARTIFACT_KIND_LABEL[kind]} title`);
  if (!title?.trim()) return false;
  await postJson(`/api/${viewId}/artifacts`, {
    title: title.trim(),
    kind,
  });
  return true;
}

/** Prompt + POST a new course into the active view's local store. */
export async function createCourseForView(viewId: ViewId) {
  const code = window.prompt("Course code (e.g. CHEM 122)");
  if (!code?.trim()) return false;
  const title = window.prompt("Course title", code.trim());
  if (!title?.trim()) return false;
  await postJson(`/api/${viewId}/courses`, {
    code: code.trim(),
    title: title.trim(),
  });
  return true;
}
