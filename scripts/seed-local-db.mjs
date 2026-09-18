/**
 * Ensure data/<viewId>/ exists for each admin view.
 * Blank views get empty JSON arrays. Mock One is seeded on first app read
 * (see src/lib/local-db.ts) if its files are missing.
 *
 * Usage: node scripts/seed-local-db.mjs
 */

import { mkdir, writeFile, access } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data");
const views = ["mock-one", "alex-knight", "alex-seager", "test-one"];
const files = [
  "planner.json",
  "artifacts.json",
  "courses.json",
  "assignments.json",
  "calendar.json",
  "documents.json",
  "ingestRuns.json",
  "links.json",
  "memory.json",
];

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

for (const view of views) {
  const dir = path.join(root, view);
  await mkdir(dir, { recursive: true });
  for (const file of files) {
    const target = path.join(dir, file);
    if (await exists(target)) {
      console.log("keep", path.relative(root, target));
      continue;
    }
    await writeFile(
      target,
      file === "memory.json"
        ? `${JSON.stringify({ summary: "", events: [], copyFlags: [] }, null, 2)}\n`
        : "[]\n",
      "utf8",
    );
    console.log("write", path.relative(root, target));
  }
}
