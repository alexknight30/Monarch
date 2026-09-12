import { cookies } from "next/headers";
import { listAdminUsers, readViewStore } from "@/lib/local-db";
import {
  documentRecordFromArtifact,
  isTextArtifact,
} from "@/lib/mock-data";
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
 * Dataset for the active view. Planner / artifacts / courses / calendar come
 * from the per-view folder under `data/<viewId>/`; admin users live in a shared
 * `data/admin-users.json`. Seeded calendar mocks stay in-memory for mock-one.
 * Document records are projected from document artifacts.
 */
export async function getServerViewDataset(): Promise<ViewDataset> {
  const id = await getServerViewId();
  const base = getViewDataset(id);
  const stored = await readViewStore(id);
  const artifacts = stored.artifacts;
  return {
    ...base,
    view: getViewMeta(id),
    planner: stored.planner,
    artifacts,
    documents: artifacts
      .filter(isTextArtifact)
      .map(documentRecordFromArtifact),
    courses: stored.courses,
    storedCalendar: stored.calendar,
    adminUsers: await listAdminUsers(),
  };
}
