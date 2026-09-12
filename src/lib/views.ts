/**
 * Admin view switching.
 *
 * The prototype has no backend, so "signing in as someone" is modelled as
 * picking a dataset. `/admin` writes the chosen view to a cookie; every screen
 * reads its data through `getViewDataset` instead of importing the mock
 * constants directly. A cookie (rather than localStorage) because the artifacts
 * and admin screens are server components and have to see it too.
 */

import {
  ADMIN_USERS,
  CALENDAR_COURSES,
  COURSES,
  CURRENT_USER,
  DEADLINES,
  HOME_STATS,
  OFFICE_HOURS,
  ARTIFACTS,
  STUDY_SESSIONS,
  documentRecordFromArtifact,
  isTextArtifact,
  type AdminUser,
  type Artifact,
  type CalendarCourse,
  type Course,
} from "@/lib/mock-data";
import type { StoredCalendarEvent } from "@/lib/calendar-events";
import type { DocumentRecord } from "@/lib/documents";
import { PLANNER_ISSUES, type PlannerIssue } from "@/lib/planner";

export const VIEW_COOKIE = "monarch.view";
/** Cookie lifetime, in seconds. A year — this is a demo switch, not a session. */
export const VIEW_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type ViewId = "mock-one" | "alex-knight" | "alex-seager" | "test-one";

export type ViewMeta = {
  id: ViewId;
  /** Shown in the admin dropdown. */
  label: string;
  firstName: string;
  school: string;
};

/** The seeded development dataset. Visibility (the admin console) only appears here. */
export const DEV_VIEW_ID: ViewId = "mock-one";

export function isDevView(id: ViewId): boolean {
  return id === DEV_VIEW_ID;
}

export const VIEWS: ViewMeta[] = [
  {
    id: "mock-one",
    label: "Dev",
    firstName: CURRENT_USER.firstName,
    school: CURRENT_USER.school,
  },
  {
    id: "alex-knight",
    label: "Alex Knight",
    firstName: "Alex",
    school: CURRENT_USER.school,
  },
  {
    id: "alex-seager",
    label: "Alex Seager",
    firstName: "Alex",
    school: CURRENT_USER.school,
  },
  {
    id: "test-one",
    label: "Test one",
    firstName: "Test",
    school: CURRENT_USER.school,
  },
];

export const DEFAULT_VIEW_ID: ViewId = "mock-one";

export function resolveViewId(raw: string | undefined | null): ViewId {
  return VIEWS.some((v) => v.id === raw) ? (raw as ViewId) : DEFAULT_VIEW_ID;
}

export function getViewMeta(id: ViewId): ViewMeta {
  return VIEWS.find((v) => v.id === id) ?? VIEWS[0];
}

/* --------------------------------------------------------------- datasets --- */

export type HomeStat = {
  label: string;
  value: string;
  note: string;
  muted?: boolean;
};
export type OfficeHour = (typeof OFFICE_HOURS)[number];
export type Deadline = (typeof DEADLINES)[number];
export type StudySession = (typeof STUDY_SESSIONS)[number];

export type ViewDataset = {
  view: ViewMeta;
  user: { firstName: string; school: string };
  homeStats: HomeStat[];
  adminUsers: AdminUser[];
  artifacts: Artifact[];
  planner: PlannerIssue[];
  documents: DocumentRecord[];
  /** Enrolled courses shown on the Courses page. */
  courses: Course[];
  /** Recurring meetings used by the calendar grid. */
  calendarCourses: CalendarCourse[];
  officeHours: OfficeHour[];
  deadlines: Deadline[];
  studySessions: StudySession[];
  /** ISO-dated events written by syllabus ingest (and later, the student). */
  storedCalendar: StoredCalendarEvent[];
};

/** The seeded seed-data view. */
function seededDataset(view: ViewMeta): ViewDataset {
  return {
    view,
    user: { firstName: view.firstName, school: view.school },
    homeStats: HOME_STATS as HomeStat[],
    adminUsers: ADMIN_USERS,
    artifacts: ARTIFACTS,
    planner: PLANNER_ISSUES,
    documents: ARTIFACTS.filter(isTextArtifact).map(documentRecordFromArtifact),
    courses: COURSES,
    calendarCourses: CALENDAR_COURSES,
    officeHours: OFFICE_HOURS,
    deadlines: DEADLINES,
    studySessions: STUDY_SESSIONS,
    storedCalendar: [],
  };
}

/** A fresh account — every screen renders its own empty state. */
function blankDataset(view: ViewMeta): ViewDataset {
  return {
    view,
    user: { firstName: view.firstName, school: view.school },
    homeStats: [],
    adminUsers: [],
    artifacts: [],
    planner: [],
    documents: [],
    courses: [],
    calendarCourses: [],
    officeHours: [],
    deadlines: [],
    studySessions: [],
    storedCalendar: [],
  };
}

export function getViewDataset(id: ViewId): ViewDataset {
  const view = getViewMeta(id);
  return isDevView(view.id) ? seededDataset(view) : blankDataset(view);
}

/* ----------------------------------------------------------- client read --- */

/**
 * Read the active view from `document.cookie`. Used by plain (non-React)
 * client helpers like chat history that can't reach the provider's context.
 * Returns the default during SSR.
 */
export function readViewIdFromDocument(): ViewId {
  if (typeof document === "undefined") return DEFAULT_VIEW_ID;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${VIEW_COOKIE}=([^;]*)`),
  );
  return resolveViewId(match ? decodeURIComponent(match[1]) : null);
}
