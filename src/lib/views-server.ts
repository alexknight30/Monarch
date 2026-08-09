import { cookies } from "next/headers";
import { readViewStore } from "@/lib/local-db";
import {
  VIEW_COOKIE,
  getViewDataset,
  getViewMeta,
  resolveViewId,
  type ViewDataset,
  type ViewId,
} from "@/lib/views";

/** Active view for this request. Server components only. */
export async function getServerViewId(): Promise<ViewId> {
  const store = await cookies();
  return resolveViewId(store.get(VIEW_COOKIE)?.value);
}

/**
 * Dataset for the active view. Planner / projects / classes come from the
 * per-view folder under `data/<viewId>/`; everything else stays in-memory.
 */
export async function getServerViewDataset(): Promise<ViewDataset> {
  const id = await getServerViewId();
  const base = getViewDataset(id);
  const stored = await readViewStore(id);
  return {
    ...base,
    view: getViewMeta(id),
    planner: stored.planner,
    projects: stored.projects,
    classes: stored.classes,
  };
}
