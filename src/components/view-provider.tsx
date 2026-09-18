"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { hydrateChatHistory, flushChatHistory } from "@/lib/chat-history";
import { emptyProfile, type StudentProfile } from "@/lib/profile";
import { ArtifactConflicts } from "./artifact-conflicts";
import {
  DEFAULT_VIEW_ID,
  VIEW_COOKIE,
  VIEW_COOKIE_MAX_AGE,
  getViewDataset,
  type ViewDataset,
  type ViewId,
} from "@/lib/views";

const ViewContext = createContext<ViewId>(DEFAULT_VIEW_ID);
const ProfileContext = createContext<StudentProfile>(emptyProfile());

/**
 * Seeded by the root layout from the request cookie, so the client renders the
 * same view the server did — no flash, no hydration mismatch.
 */
export function ViewProvider({
  viewId,
  profile,
  children,
}: {
  viewId: ViewId;
  profile: StudentProfile;
  children: ReactNode;
}) {
  useEffect(() => {
    void hydrateChatHistory();
    const online=()=>{void hydrateChatHistory().then(flushChatHistory);};
    window.addEventListener("online",online);
    return ()=>{window.removeEventListener("online",online);void flushChatHistory();};
  },[viewId]);
  return <ViewContext value={viewId}><ProfileContext value={profile}><ArtifactConflicts>{children}</ArtifactConflicts></ProfileContext></ViewContext>;
}

export function useViewId(): ViewId {
  return useContext(ViewContext);
}

export function useViewDataset(): ViewDataset {
  const id = useViewId();
  const profile = useContext(ProfileContext);
  return useMemo(() => {
    const dataset = getViewDataset(id);
    return { ...dataset, user: {
      firstName: profile.preferredName || profile.fullName.split(" ")[0] || dataset.user.firstName,
      school: profile.school || dataset.user.school,
    } };
  }, [id, profile]);
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
