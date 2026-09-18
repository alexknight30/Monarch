import { AsyncLocalStorage } from "node:async_hooks";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { ViewStore } from "./local-db";
import type { ViewId } from "./views";

type Transaction = { viewId: ViewId; value: ViewStore; dirty: boolean };
const transactions = new AsyncLocalStorage<Transaction>();
const root = () => process.env.MONARCH_DATA_ROOT || path.join(process.cwd(), "data");
const folder = (id: ViewId) => path.join(/*turbopackIgnore: true*/ root(), id);
const filename = (id: ViewId) => path.join(folder(id), "workspace.json");

function missing(error: unknown) { return (error as NodeJS.ErrnoException)?.code === "ENOENT"; }

async function readDisk(viewId: ViewId, seed: ViewStore): Promise<ViewStore> {
  try {
    const parsed = JSON.parse(await fs.readFile(filename(viewId), "utf8")) as ViewStore;
    for (const key of Object.keys(seed) as (keyof ViewStore)[]) {
      if (key === "profile" || key === "memory") continue;
      if ((key === "chats" || key === "trash") && parsed[key] === undefined) continue; // Added after the original snapshot format.
      if (!Array.isArray(parsed[key])) throw new Error(`Workspace collection ${key} is damaged. Restore a backup before saving.`);
    }
    return { ...seed, ...parsed };
  } catch (error) { if (!missing(error)) throw error; }
  // Migration is lazy and non-destructive: original JSON files remain untouched.
  const entries = await Promise.all((Object.keys(seed) as (keyof ViewStore)[]).map(async (key) => {
    try { return [key, JSON.parse(await fs.readFile(path.join(folder(viewId), `${key}.json`), "utf8"))]; }
    catch (error) { if (!missing(error)) throw error; return [key, seed[key]]; }
  }));
  return Object.fromEntries(entries) as ViewStore;
}

export async function readWorkspace(viewId: ViewId, seed: ViewStore) {
  const current = transactions.getStore();
  return structuredClone(current?.viewId === viewId ? current.value : await readDisk(viewId, seed));
}

async function acquire(viewId: ViewId) {
  await fs.mkdir(folder(viewId), { recursive: true });
  const lock = path.join(folder(viewId), ".write-lock");
  const deadline = Date.now() + 15_000;
  while (true) {
    try {
      await fs.mkdir(lock);
      await fs.writeFile(path.join(lock, "owner"), String(process.pid));
      return async () => { await fs.rm(lock, { recursive: true, force: true }); };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      try {
        const pid = Number(await fs.readFile(path.join(lock, "owner"), "utf8"));
        if (pid > 0) {
          try { process.kill(pid, 0); }
          catch (probe) {
            if ((probe as NodeJS.ErrnoException).code === "ESRCH") {
              await fs.rm(lock, { recursive: true, force: true });
              continue;
            }
          }
        }
      } catch { /* Another writer may be creating the owner file. */ }
      if (Date.now() >= deadline) throw new Error("Another save is still in progress. Please retry shortly.");
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
  }
}

async function commit(viewId: ViewId, value: ViewStore, before: ViewStore) {
  const backupDir = path.join(root(), "backups", viewId);
  await fs.mkdir(backupDir, { recursive: true });
  await fs.writeFile(path.join(backupDir, `${Date.now()}-${crypto.randomUUID()}.json`), JSON.stringify(before));
  const tmp = `${filename(viewId)}.${crypto.randomUUID()}.tmp`;
  const file = await fs.open(tmp, "wx");
  try { await file.writeFile(`${JSON.stringify(value, null, 2)}\n`); await file.sync(); }
  finally { await file.close(); }
  await fs.rename(tmp, filename(viewId));
  // Only prune backups created by this store. Never touch original collection files.
  const backups = (await fs.readdir(backupDir).catch(() => [])).filter((name) => /^\d+-[a-f0-9-]+\.json$/.test(name)).sort();
  // A retention failure must not report an already committed save as failed.
  await Promise.allSettled(backups.slice(0, -30).map((name) => fs.unlink(path.join(backupDir, name))));
}

export async function withWorkspaceTransaction<T>(viewId: ViewId, seed: ViewStore, operation: () => Promise<T>): Promise<T> {
  const parent = transactions.getStore();
  if (parent?.viewId === viewId) return operation();
  const release = await acquire(viewId);
  try {
    const before = await readDisk(viewId, seed);
    const transaction: Transaction = { viewId, value: structuredClone(before), dirty: false };
    const result = await transactions.run(transaction, operation);
    if (transaction.dirty) await commit(viewId, transaction.value, before);
    return result;
  } finally { await release(); }
}

export async function writeWorkspaceCollections(viewId: ViewId, seed: ViewStore, patch: Partial<ViewStore>) {
  await withWorkspaceTransaction(viewId, seed, async () => {
    const current = transactions.getStore()!;
    Object.assign(current.value, structuredClone(patch));
    current.dirty = true;
  });
}
