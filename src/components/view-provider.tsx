"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  DEFAULT_VIEW_ID,
  VIEW_COOKIE,
  VIEW_COOKIE_MAX_AGE,
  getViewDataset,
  type ViewDataset,
  type ViewId,
} from "@/lib/views";

const ViewContext = createContext<ViewId>(DEFAULT_VIEW_ID);

/**
 * Seeded by the root layout from the request cookie, so the client renders the
 * same view the server did — no flash, no hydration mismatch.
 */
export function ViewProvider({
  viewId,
  children,
}: {
  viewId: ViewId;
  children: ReactNode;
}) {
  return <ViewContext value={viewId}>{children}</ViewContext>;
}

export function useViewId(): ViewId {
  return useContext(ViewContext);
}

export function useViewDataset(): ViewDataset {
  const id = useViewId();
  return useMemo(() => getViewDataset(id), [id]);
}

/**
 * Persist a view and hard-navigate so server components re-render against the
 * new cookie. A full load rather than router.push — the artifacts and admin
 * screens are server-rendered and would otherwise serve cached output.
 */
export function applyView(viewId: ViewId, destination = "/") {
  document.cookie = `${VIEW_COOKIE}=${encodeURIComponent(viewId)}; path=/; max-age=${VIEW_COOKIE_MAX_AGE}; samesite=lax`;
  window.location.assign(destination);
}
