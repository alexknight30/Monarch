import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { validateDesign, type DesignDocument } from "./model";

export class DesignConflict extends Error {}
const digest = (text: string) => createHash("sha256").update(text).digest("hex");
export async function readDesign(root = process.cwd()) {
  const raw = await fs.readFile(path.join(root, "src/design/overrides.json"), "utf8");
  return { document: validateDesign(JSON.parse(raw)), revision: digest(raw) };
}
export async function saveDesign(document: unknown, revision: unknown, root = process.cwd()) {
  const checked = validateDesign(document);
  const file = path.join(root, "src/design/overrides.json");
  const lock = path.join(root, "src/design/.save-lock");
  try { await fs.mkdir(lock); } catch { throw new DesignConflict("Another design save is running. Retry in a moment."); }
  try {
    const current = await readDesign(root);
    if (current.revision !== revision) throw new DesignConflict("The design changed in another tab or editor. Reload saved changes before saving again.");
    const backup = path.join(root, ".design-history");
    await fs.mkdir(backup, { recursive: true });
    await fs.writeFile(path.join(backup, Date.now() + "-" + randomUUID() + ".json"), JSON.stringify(current.document, null, 2) + "\n");
    const text = JSON.stringify(checked, null, 2) + "\n";
    const temp = file + "." + randomUUID() + ".tmp";
    try { await fs.writeFile(temp, text, { flag: "wx" }); await fs.rename(temp, file); }
    finally { await fs.rm(temp, { force: true }); }
    const snapshots = (await fs.readdir(backup)).filter(x => x.endsWith(".json")).sort();
    await Promise.all(snapshots.slice(0, -50).map(x => fs.rm(path.join(backup, x))));
    return { document: checked as DesignDocument, revision: digest(text) };
  } finally { await fs.rmdir(lock); }
}
export type SourceNode = { file: string; line: number; text: boolean };
export async function sourceIndex(root = process.cwd()) {
  const nodes: Record<string, SourceNode> = {};
  async function walk(dir: string) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { if (!["api", "design"].includes(entry.name)) await walk(full); continue; }
      if (!entry.name.endsWith(".tsx")) continue;
      const raw = await fs.readFile(full, "utf8");
      for (const match of raw.matchAll(/data-design-id="(m-[a-f0-9]{12})"/g)) {
        nodes[match[1]] = { file: path.relative(root, full), line: raw.slice(0, match.index).split("\n").length, text: raw.includes(`<DesignCopy id="${match[1]}"`) };
      }
    }
  }
  await walk(path.join(root, "src/app")); await walk(path.join(root, "src/components"));
  return nodes;
}

export async function designHistory(root = process.cwd()) {
  const directory = path.join(root, ".design-history");
  try {
    return (await fs.readdir(directory)).filter(name => /^\d+-[a-f0-9-]+\.json$/.test(name)).sort().reverse().slice(0, 50).map(id => ({ id, time: Number(id.split("-")[0]) }));
  } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
}
export async function readDesignSnapshot(id: string, root = process.cwd()) {
  if (!/^\d+-[a-f0-9-]+\.json$/.test(id)) throw new Error("Invalid snapshot identity.");
  return validateDesign(JSON.parse(await fs.readFile(path.join(root, ".design-history", id), "utf8")));
}
