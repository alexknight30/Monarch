"use client";

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

/** Prompt + POST a new project into the active view's local store. */
export async function createProjectForView(viewId: ViewId) {
  const title = window.prompt("Project name");
  if (!title?.trim()) return false;
  await postJson(`/api/${viewId}/projects`, { title: title.trim() });
  return true;
}

/** Prompt + POST a new class into the active view's local store. */
export async function createClassForView(viewId: ViewId) {
  const code = window.prompt("Course code (e.g. CHEM 122)");
  if (!code?.trim()) return false;
  const title = window.prompt("Course title", code.trim());
  if (!title?.trim()) return false;
  await postJson(`/api/${viewId}/classes`, {
    code: code.trim(),
    title: title.trim(),
  });
  return true;
}
