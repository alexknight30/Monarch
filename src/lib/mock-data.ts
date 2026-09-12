// Mock data for the Monarch prototype. No backend yet — every screen reads from here.

import type { DiagramSpec } from "@/lib/diagram";
import type {
  DocChatTurn,
  DocumentBlock,
  DocumentRecord,
  DocumentStatus,
} from "@/lib/documents";
import type { TagId } from "@/lib/objects/tags";

export const CURRENT_USER = {
  firstName: "Alex",
  school: "Westbrook College",
};

/* ---------------------------------------------------------------- home --- */

export const HOME_STATS = [
  { label: "Assignments due", value: "4", note: "this week" },
  { label: "Active courses", value: "5", note: "Fall 2026" },
  { label: "Study streak", value: "12", note: "days in a row" },
  { label: "Artifacts", value: "7", note: "2 shared with you" },
  { label: "Office hours", value: "–", note: "None booked", muted: true },
  { label: "Inbox", value: "3", note: "To review" },
];

export const QUICK_ACTIONS = [
  { label: "New study guide", icon: "doc" },
  { label: "Summarize reading", icon: "list" },
  { label: "Practice quiz", icon: "network" },
  { label: "Office hours", icon: "clock" },
  { label: "Upload syllabus", icon: "upload" },
] as const;

/* --------------------------------------------------------------- admin --- */

export type AdminUser = {
  id: string;
  username: string;
  role: string;
  email: string;
  courses: string;
  lastUsed: string;
  usage: string;
};

export const ADMIN_USER_FIELDS = [
  "username",
  "role",
  "email",
  "courses",
  "lastUsed",
  "usage",
] as const;

export type AdminUserField = (typeof ADMIN_USER_FIELDS)[number];

export const ADMIN_USERS: AdminUser[] = [
  {
    id: "alex-knight",
    username: "Alex Knight",
    role: "",
    email: "",
    courses: "",
    lastUsed: "",
    usage: "",
  },
  {
    id: "alex-seager",
    username: "Alex Seager",
    role: "",
    email: "",
    courses: "",
    lastUsed: "",
    usage: "",
  },
];

/* ----------------------------------------------------------- artifacts --- */

export const ARTIFACT_KINDS = [
  "diagram",
  "document",
  "notes",
  "reading",
  "flashcards",
  "practice-test",
  "lesson",
  "slides",
] as const;

export type ArtifactKind = (typeof ARTIFACT_KINDS)[number];

export const ARTIFACT_KIND_LABEL: Record<ArtifactKind, string> = {
  diagram: "Diagram",
  document: "Document",
  notes: "Notes",
  reading: "Reading",
  flashcards: "Flashcards",
  "practice-test": "Practice test",
  lesson: "Lesson",
  slides: "Slides",
};

export function isArtifactKind(value: string): value is ArtifactKind {
  return (ARTIFACT_KINDS as readonly string[]).includes(value);
}

type ArtifactBase = {
  id: string;
  slug: string;
  title: string;
  description: string;
  createdBy: string;
  updated: string;
  visibility: "Private" | "Shared";
  instructions: string | null;
  context: { name: string; meta: string }[];
  scheduled: { name: string; cadence: string }[];
  chats: { title: string; snippet: string; when: string }[];
  courseId: string;
  courseSlug?: string;
  assignmentId?: string;
  tagIds: TagId[];
};

type TextArtifactFields = {
  shortTitle: string;
  course: string;
  due: string;
  status: DocumentStatus;
  savedAt: string;
  /** TipTap HTML body; falls back to `blocks` when missing. */
  bodyHtml?: string;
  blocks: DocumentBlock[];
  thread: DocChatTurn[];
};

export type DocumentArtifact = ArtifactBase &
  TextArtifactFields & { kind: "document" };

export type NotesArtifact = ArtifactBase & TextArtifactFields & { kind: "notes" };

export type ReadingAnnotation = {
  id: string;
  quote: string;
  note: string;
  start?: number;
  end?: number;
};

export type ReadingArtifact = ArtifactBase & {
  kind: "reading";
  bodyText?: string;
  bodyHtml?: string;
  sourceDocumentId?: string;
  annotations: ReadingAnnotation[];
};

export type Flashcard = { id: string; front: string; back: string };

export type FlashcardsArtifact = ArtifactBase & {
  kind: "flashcards";
  cards: Flashcard[];
};

export type PracticeItem = {
  id: string;
  prompt: string;
  answer: string;
  studentAnswer?: string;
};

export type PracticeTestArtifact = ArtifactBase & {
  kind: "practice-test";
  items: PracticeItem[];
};

export type LessonBlock = {
  id: string;
  type: "text" | "prompt";
  html?: string;
  prompt?: string;
};

export type LessonArtifact = ArtifactBase & {
  kind: "lesson";
  blocks: LessonBlock[];
};

export type Slide = { id: string; title: string; bodyHtml: string };

export type SlidesArtifact = ArtifactBase & {
  kind: "slides";
  slides: Slide[];
};

/**
 * A diagram promoted out of a chat. Stores the spec, not a rendered image, so
 * it re-renders at any size and can still be changed after the fact.
 */
export type DiagramArtifact = ArtifactBase & {
  kind: "diagram";
  spec: DiagramSpec;
  /** Where it came from, so the artifact can link back to the thread. */
  source?: { threadId?: string; threadTitle?: string };
};

export type Artifact =
  | DocumentArtifact
  | NotesArtifact
  | ReadingArtifact
  | FlashcardsArtifact
  | PracticeTestArtifact
  | LessonArtifact
  | SlidesArtifact
  | DiagramArtifact;

export function isDocumentArtifact(a: Artifact): a is DocumentArtifact {
  return a.kind === "document";
}

export function isNotesArtifact(a: Artifact): a is NotesArtifact {
  return a.kind === "notes";
}

export function isTextArtifact(
  a: Artifact,
): a is DocumentArtifact | NotesArtifact {
  return a.kind === "document" || a.kind === "notes";
}

export function isDiagramArtifact(a: Artifact): a is DiagramArtifact {
  return a.kind === "diagram";
}

export function isReadingArtifact(a: Artifact): a is ReadingArtifact {
  return a.kind === "reading";
}

export function isFlashcardsArtifact(a: Artifact): a is FlashcardsArtifact {
  return a.kind === "flashcards";
}

export function isPracticeTestArtifact(a: Artifact): a is PracticeTestArtifact {
  return a.kind === "practice-test";
}

export function isLessonArtifact(a: Artifact): a is LessonArtifact {
  return a.kind === "lesson";
}

export function isSlidesArtifact(a: Artifact): a is SlidesArtifact {
  return a.kind === "slides";
}

export function documentRecordFromArtifact(
  artifact: DocumentArtifact | NotesArtifact,
): DocumentRecord {
  return {
    id: artifact.slug,
    title: artifact.title,
    shortTitle: artifact.shortTitle,
    course: artifact.course,
    due: artifact.due,
    status: artifact.status,
    savedAt: artifact.savedAt,
    bodyHtml: artifact.bodyHtml,
    blocks: artifact.blocks,
    thread: artifact.thread,
  };
}

function seedBase(
  slug: string,
  courseId: string,
  tagIds: TagId[] = [],
): Pick<Artifact, "id" | "slug" | "courseId" | "courseSlug" | "tagIds"> {
  return {
    id: slug,
    slug,
    courseId,
    ...(courseId !== "unassigned" ? { courseSlug: courseId } : {}),
    tagIds,
  };
}

export const ARTIFACTS: Artifact[] = [
  {
    kind: "document",
    ...seedBase("orgo-ii-reaction-maps", "chem-122"),
    title: "Orgo II Reaction Maps",
    shortTitle: "Orgo II Reaction Maps",
    course: "CHEM 122",
    due: "due next Sunday",
    status: "Draft",
    savedAt: "Saved 5 days ago",
    description:
      "Build and drill reaction mechanism maps for CHEM 122. Every answer should show the electron-pushing steps, not just the product.",
    createdBy: "Sam Levine",
    updated: "5 days ago",
    visibility: "Private",
    instructions:
      "Always draw the mechanism before naming the product. Use IUPAC names. When I get something wrong, ask me a leading question instead of correcting me outright.",
    context: [
      { name: "CHEM 122 syllabus.pdf", meta: "PDF · 240 KB" },
      { name: "Carey Ch. 8–11 notes.md", meta: "Markdown · 18 KB" },
      { name: "Midterm 1 review key.pdf", meta: "PDF · 1.1 MB" },
    ],
    scheduled: [{ name: "Weekly mechanism drill", cadence: "Sundays · 7:00 PM" }],
    chats: [
      { title: "E1 vs E2 on secondary carbons", snippet: "Walk me through why heat favors E1 here…", when: "2 hours ago" },
      { title: "Grignard practice set", snippet: "Generate 10 problems from Ch. 10 at midterm difficulty.", when: "Yesterday" },
      { title: "Aldol condensation map", snippet: "Draw the full mechanism with electron arrows.", when: "5 days ago" },
    ],
    blocks: [
      {
        id: "b1",
        text: "E1 vs E2 — quick map. Secondary alkyl halide + strong base + heat: watch the competition. Heat and a polar protic solvent tip toward E1; a bulky strong base tips toward E2.",
      },
      {
        id: "b2",
        highlight: true,
        text: "For every product I write, show the electron-pushing steps first. Name the substrate and the leaving group before naming the alkene.",
      },
      {
        id: "b3",
        text: "Open questions: when does rearrangement beat a clean E2 on a secondary carbon? Drill set for Sunday.",
      },
    ],
    thread: [
      { role: "user", content: "Why does heat favor E1 on a secondary carbon here?" },
      {
        role: "assistant",
        content:
          "Heat helps the unimolecular path because E1 has a higher activation energy to form the carbocation — once that barrier is cleared, entropy favors losing the leaving group and a proton. E2 still competes if the base is strong and unhindered; say which base you're using and we can weigh them.",
        sources: ["Carey Ch. 8 — §8.5", "Midterm 1 review key — Q4"],
      },
    ],
  },
  {
    kind: "reading",
    ...seedBase("thesis-lit-review", "unassigned", ["paper"]),
    title: "Thesis Lit Review",
    description:
      "Track sources for my senior thesis on municipal broadband. Keep a running annotated bibliography and flag contradicting findings.",
    createdBy: "Sam Levine",
    updated: "Jul 15",
    visibility: "Private",
    instructions:
      "Cite in Chicago notes-bibliography. Never summarize a source I haven't uploaded. Flag when two sources disagree and say how.",
    context: [
      { name: "Annotated bibliography.docx", meta: "Word · 96 KB" },
      { name: "Crawford 2019 — Broadband.pdf", meta: "PDF · 3.4 MB" },
    ],
    scheduled: [],
    chats: [
      { title: "Gaps in the 2018–2022 literature", snippet: "What hasn't been studied about rural rollout?", when: "Jul 15" },
      { title: "Chapter 2 outline", snippet: "Turn my notes into a five-section outline.", when: "Jul 9" },
    ],
    bodyText:
      "Track sources for the senior thesis on municipal broadband. Keep a running annotated bibliography and flag contradicting findings.\n\nCite in Chicago notes-bibliography. Never summarize a source that hasn’t been uploaded. Flag when two sources disagree and say how.",
    annotations: [],
  },
  {
    kind: "document",
    ...seedBase("stat-140-problem-sets", "stat-140", ["assignment"]),
    title: "Stat 140 Problem Sets",
    shortTitle: "Stat 140 Problem Sets",
    course: "STAT 140",
    due: "due Thursday 4:00pm",
    status: "Draft",
    savedAt: "Saved Jun 15",
    description:
      "Weekly problem sets for Intro to Statistical Inference. Show the work, then check my answer against it.",
    createdBy: "Sam Levine",
    updated: "Jun 15",
    visibility: "Shared",
    instructions:
      "Solve it yourself first, then compare to my attempt and point at the exact step where I diverged.",
    context: [{ name: "STAT 140 problem set 7.pdf", meta: "PDF · 180 KB" }],
    scheduled: [{ name: "Problem set check-in", cadence: "Thursdays · 4:00 PM" }],
    chats: [
      { title: "Confidence interval intuition", snippet: "Why isn't it a 95% chance the mean is in there?", when: "Jun 15" },
    ],
    blocks: [
      {
        id: "b1",
        text: "Problem set 7 — confidence intervals. For each interval I build: state the parameter, the estimator, and whether I'm using z or t.",
      },
      {
        id: "b2",
        text: "A 95% CI is not \"95% chance the mean is in this interval.\" It's: if we repeated the sampling process, 95% of such intervals would cover the true mean.",
      },
    ],
    thread: [],
  },
  {
    kind: "reading",
    ...seedBase("gov-201-seminar-prep", "gov-201"),
    title: "Gov 201 Seminar Prep",
    description:
      "Prep discussion questions and counterarguments before each Thursday seminar on comparative institutions.",
    createdBy: "Priya Raman",
    updated: "Apr 20",
    visibility: "Shared",
    instructions: null,
    context: [{ name: "Week 9 readings.pdf", meta: "PDF · 820 KB" }],
    scheduled: [{ name: "Seminar prep", cadence: "Wednesdays · 8:00 PM" }],
    chats: [
      { title: "Steelman the federalist position", snippet: "Give me the strongest version of the argument.", when: "Apr 20" },
    ],
    bodyText:
      "Week 9 readings for GOV 201 — comparative institutions. Prep discussion questions and the strongest version of the federalist position before Thursday seminar.",
    annotations: [],
  },
  {
    kind: "document",
    ...seedBase("marshall-plan-response", "hist-210", ["paper"]),
    title: "The Marshall Plan and the limits of postwar generosity",
    shortTitle: "Response paper — Ch. 4",
    course: "HIST 210",
    due: "due Friday 5:00pm",
    status: "Draft",
    savedAt: "Saved 2 min ago",
    description: "HIST 210 response paper on the Marshall Plan's conditions and postwar cooperation.",
    createdBy: "Sam Levine",
    updated: "2 min ago",
    visibility: "Private",
    instructions: null,
    context: [],
    scheduled: [],
    chats: [],
    blocks: [
      {
        id: "b1",
        text: "In the spring of 1947, Secretary of State George Marshall stood at Harvard and described a Europe that was, in his words, running out of the means to pay for what it needed to live. The speech is remembered as an act of generosity. It was also an act of accounting.",
      },
      {
        id: "b2",
        text: "American factories had spent four years building for a war that had ended, and the countries best positioned to buy that output were the same countries least able to afford it. Aid solved a European problem and an American one at the same time, which is precisely why it passed a Congress that had spent the previous year cutting nearly everything else.",
      },
      {
        id: "b3",
        highlight: true,
        text: "The plan's conditions mattered more than its dollars. Recipients had to open their books, coordinate purchasing, and settle on shared production targets — obligations that quietly rebuilt the habit of cooperation that the war had broken.",
      },
      {
        id: "b4",
        text: "Whether that outcome was the point or the byproduct is still argued over, and the answer depends a great deal on",
      },
    ],
    thread: [
      { "role": "user", "content": "Is this claim too strong without a source?" },
      {
        "role": "assistant",
        "content":
          'A little, yes. "Quietly rebuilt the habit of cooperation" is an interpretive claim, and right now it reads as settled fact.\n\nTwo of your assigned readings argue this directly — Hogan on the OEEC, and Milward\'s counterargument. Attributing it to them makes the sentence stronger, not weaker.',
        "sources": ["Hogan, ch. 3 — p. 88", "Milward, ch. 1 — p. 12"],
      },
    ],
  },
  {
    kind: "notes",
    ...seedBase("cs-51-office-hours-notes", "cs-51"),
    title: "CS 51 Office Hours Notes",
    shortTitle: "CS 51 OH Notes",
    course: "CS 51",
    due: "",
    status: "Draft",
    savedAt: "Saved Apr 1",
    description:
      "Turn messy office-hours scribbles into clean notes with runnable OCaml examples for each concept.",
    createdBy: "Sam Levine",
    updated: "Apr 1",
    visibility: "Private",
    instructions: "Every explanation gets a minimal runnable example. No pseudocode.",
    context: [],
    scheduled: [],
    chats: [],
    blocks: [
      {
        id: "b1",
        text: "Fold vs. map — from OH. map preserves length; fold collapses a list into one value. Start every example with the type signature.",
      },
      {
        id: "b2",
        text: "(* map: ('a -> 'b) -> 'a list -> 'b list *)\nlet rec map f = function\n  | [] -> []\n  | x :: xs -> f x :: map f xs",
      },
    ],
    thread: [],
  },
  {
    kind: "document",
    ...seedBase("spring-course-planning", "unassigned"),
    title: "Spring Course Planning",
    shortTitle: "Spring Course Planning",
    course: "",
    due: "registration opens Mar 30",
    status: "Draft",
    savedAt: "Saved Mar 26",
    description:
      "Compare spring schedules against major requirements and flag conflicts before registration opens.",
    createdBy: "Sam Levine",
    updated: "Mar 26",
    visibility: "Private",
    instructions: "Check every proposal against the degree audit before recommending it.",
    context: [{ name: "Degree audit — Fall 2026.pdf", meta: "PDF · 210 KB" }],
    scheduled: [],
    chats: [
      { title: "Three schedules, ranked", snippet: "Build me options that all clear the major requirement.", when: "Mar 26" },
    ],
    blocks: [
      {
        id: "b1",
        text: "Constraints: no Tuesday mornings, keep Wed free for lab, need one more elective toward the major.",
      },
      {
        id: "b2",
        text: "Option A clears the audit with room for a language. Option B front-loads requirements. Option C is the stretch schedule — flag conflicts before recommending it.",
      },
    ],
    thread: [],
  },
  {
    kind: "flashcards",
    ...seedBase("carbonyl-flashcards", "chem-122", ["exam"]),
    title: "Carbonyl flashcards",
    description: "Quizlet-style drill for carbonyl reactions.",
    createdBy: "Sam Levine",
    updated: "3 days ago",
    visibility: "Private",
    instructions: null,
    context: [],
    scheduled: [],
    chats: [],
    cards: [
      { id: "c1", front: "What does LiAlH4 do to a ketone?", back: "Reduces it to a secondary alcohol." },
      { id: "c2", front: "Grignard + aldehyde →", back: "Secondary alcohol after workup." },
    ],
  },
  {
    kind: "practice-test",
    ...seedBase("stat-140-practice-8", "stat-140", ["quiz"]),
    title: "STAT 140 practice set 8",
    description: "Confidence intervals and hypothesis tests.",
    createdBy: "Sam Levine",
    updated: "1 day ago",
    visibility: "Private",
    instructions: null,
    context: [],
    scheduled: [],
    chats: [],
    items: [
      {
        id: "q1",
        prompt: "A 95% CI for $\\mu$ is $(12.1, 15.4)$. What is the point estimate?",
        answer: "The midpoint: $13.75$.",
      },
    ],
  },
  {
    kind: "lesson",
    ...seedBase("fold-vs-map-lesson", "cs-51"),
    title: "Fold vs map",
    description: "A short lesson with an embedded agent prompt.",
    createdBy: "Sam Levine",
    updated: "Apr 2",
    visibility: "Private",
    instructions: null,
    context: [],
    scheduled: [],
    chats: [],
    blocks: [
      {
        id: "lb1",
        type: "text",
        html: "Map preserves length. Fold collapses a list into one value.",
      },
      {
        id: "lb2",
        type: "prompt",
        prompt: "Ask me to write the type of fold_left before showing an example.",
      },
    ],
  },
  {
    kind: "slides",
    ...seedBase("marshall-plan-slides", "hist-210", ["paper"]),
    title: "Marshall Plan — 5 slides",
    description: "Talking points for the response paper.",
    createdBy: "Sam Levine",
    updated: "Mar 28",
    visibility: "Private",
    instructions: null,
    context: [],
    scheduled: [],
    chats: [],
    slides: [
      {
        id: "s1",
        title: "Europe, 1947",
        bodyHtml: "<p>Factories intact, wallets empty.</p>",
      },
      {
        id: "s2",
        title: "Conditions over dollars",
        bodyHtml: "<p>Open books, shared targets, OEEC coordination.</p>",
      },
    ],
  },
];

export function getArtifact(slug: string) {
  return ARTIFACTS.find((a) => a.slug === slug);
}

/* ------------------------------------------------------------- courses --- */

export type MeetingKind = "lecture" | "lab" | "discussion" | "seminar";

export type CourseMeeting = {
  kind: MeetingKind;
  days: number[];
  start: string;
  end: string;
  location?: string;
};

export type CourseOfficeHour = {
  host: string;
  day: number;
  start: string;
  end: string;
  location?: string;
  mode?: "in-person" | "virtual" | "by-appointment";
};

export type Course = {
  id: string;
  slug: string;
  code: string;
  title: string;
  description: string;
  instructor: string;
  schedule: string;
  term: string;
  termStartsAt?: string;
  termEndsAt?: string;
  instructorEmail?: string;
  instructorOffice?: string;
  meetings?: CourseMeeting[];
  officeHours?: CourseOfficeHour[];
  grading?: { component: string; weight: number }[];
  policies?: {
    late?: string;
    attendance?: string;
    ai?: string;
    integrity?: string;
  };
  sourceDocumentId?: string;
  needsReview?: string[];
};

const DAY_CODES = ["U", "M", "T", "W", "R", "F", "S"];

function formatClock(time: string) {
  const [hRaw, mRaw] = time.split(":");
  const h24 = Number(hRaw);
  const m = Number(mRaw);
  if (!Number.isFinite(h24) || !Number.isFinite(m)) return time;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const minutes = String(m).padStart(2, "0");
  const ampm = h24 >= 12 ? "PM" : "AM";
  return `${h12}:${minutes} ${ampm}`;
}

export function deriveSchedule(meetings?: CourseMeeting[]): string {
  if (!meetings?.length) return "Schedule TBD";
  const primary = meetings[0];
  const days = primary.days.map((day) => DAY_CODES[day] ?? "").join("");
  const start = formatClock(primary.start);
  const end = formatClock(primary.end);
  const startParts = start.split(" ");
  const endParts = end.split(" ");
  const range =
    startParts[1] === endParts[1]
      ? `${startParts[0]}–${end}`
      : `${start}–${end}`;
  return `${days} · ${range}`;
}

export const COURSES: Course[] = [
  {
    id: "chem-122",
    slug: "chem-122",
    code: "CHEM 122",
    title: "Organic Chemistry II",
    description:
      "Mechanisms, spectroscopy, and synthesis of organic compounds. Builds on CHEM 121 with a focus on carbonyl chemistry and multi-step routes.",
    instructor: "Prof. Nadia Farouk",
    schedule: "MWF · 10:00–10:50 AM",
    term: "Fall 2026",
  },
  {
    id: "stat-140",
    slug: "stat-140",
    code: "STAT 140",
    title: "Intro to Statistical Inference",
    description:
      "Probability, estimation, hypothesis testing, and regression. Weekly problem sets plus a midterm and final project.",
    instructor: "Prof. Marcus Chen",
    schedule: "TTh · 1:30–2:45 PM",
    term: "Fall 2026",
  },
  {
    id: "gov-201",
    slug: "gov-201",
    code: "GOV 201",
    title: "Comparative Institutions",
    description:
      "Seminar on constitutional design, federalism, and legislative organization across democracies. Discussion-heavy; short weekly memos.",
    instructor: "Prof. Elena Vasquez",
    schedule: "Th · 3:00–5:30 PM",
    term: "Fall 2026",
  },
  {
    id: "cs-51",
    slug: "cs-51",
    code: "CS 51",
    title: "Abstraction & Design",
    description:
      "Functional programming in OCaml, modular design, and data structures. Pair programming labs every Friday.",
    instructor: "Prof. James Okonkwo",
    schedule: "MWF · 11:15–12:05 PM",
    term: "Fall 2026",
  },
  {
    id: "hist-210",
    slug: "hist-210",
    code: "HIST 210",
    title: "Modern Europe",
    description:
      "Survey of European political and cultural history from 1789 to the present. Heavy reading load; two papers.",
    instructor: "Prof. Claire Beaumont",
    schedule: "TTh · 10:00–11:15 AM",
    term: "Spring 2025",
  },
];

/* ------------------------------------------------------------ calendar --- */

export type CalendarKind = "course" | "office-hours" | "deadline" | "session";

export type CalendarCourse = {
  code: string;
  title: string;
  /** Weekdays the course meets, 0 = Sunday. */
  days: number[];
  start: string;
  end: string;
  location: string;
};

/** Fall 2026 course load — matches the "5 active courses" home stat. */
export const CALENDAR_COURSES: CalendarCourse[] = [
  { code: "CHEM 122", title: "General Chemistry II", days: [1, 3, 5], start: "09:00", end: "09:50", location: "Keck 101" },
  { code: "SPAN 101", title: "Intermediate Spanish", days: [1, 2, 3, 4], start: "10:00", end: "10:50", location: "Kravis 118" },
  { code: "HIST 210", title: "Modern Europe", days: [2, 4], start: "11:00", end: "12:15", location: "Kravis 205" },
  { code: "STAT 140", title: "Intro to Statistics", days: [1, 3, 5], start: "13:00", end: "13:50", location: "Adams 118" },
  { code: "ENGL 185", title: "Literary Theory", days: [2, 4], start: "14:30", end: "15:45", location: "Story House" },
];

/** Weekly office hours. */
export const OFFICE_HOURS = [
  { code: "CHEM 122", title: "Prof. Ibarra — office hours", day: 3, start: "15:00", end: "16:30", location: "Keck 340" },
  { code: "STAT 140", title: "Ravi (TA) — office hours", day: 4, start: "10:00", end: "11:00", location: "Adams 12" },
  { code: "ENGL 185", title: "Prof. Whitlock — office hours", day: 2, start: "16:00", end: "17:00", location: "Story House 2" },
];

/**
 * Assignment deadlines, keyed by day of month so the calendar stays populated
 * whichever month the student is looking at.
 */
export const DEADLINES = [
  { code: "SPAN 101", title: "Vocab quiz 4", day: 2, at: "10:00" },
  { code: "CHEM 122", title: "Problem set 7", day: 4, at: "23:59" },
  { code: "STAT 140", title: "Lab writeup 3", day: 6, at: "23:59" },
  { code: "HIST 210", title: "Reading response — Ch. 4", day: 9, at: "17:00" },
  { code: "CHEM 122", title: "Midterm exam", day: 12, at: "09:00" },
  { code: "ENGL 185", title: "Essay outline", day: 19, at: "23:59" },
  { code: "STAT 140", title: "Problem set 8", day: 21, at: "23:59" },
  { code: "HIST 210", title: "Response paper", day: 26, at: "17:00" },
  { code: "CHEM 122", title: "Lab report — titration", day: 28, at: "23:59" },
];

/** Study sessions the student logged themselves — totals 18h 45m. */
export const STUDY_SESSIONS = [
  { code: "SPAN 101", title: "Vocab drilling", day: 2, start: "19:00", end: "20:30" },
  { code: "CHEM 122", title: "Problem set 7", day: 4, start: "13:00", end: "15:45" },
  { code: "STAT 140", title: "Lab writeup 3", day: 5, start: "20:00", end: "21:30" },
  { code: "HIST 210", title: "Ch. 4 reading", day: 8, start: "10:00", end: "12:00" },
  { code: "CHEM 122", title: "Midterm review", day: 11, start: "19:00", end: "21:00" },
  { code: "STAT 140", title: "Practice problems", day: 15, start: "14:00", end: "16:00" },
  { code: "ENGL 185", title: "Essay reading", day: 19, start: "16:00", end: "17:30" },
  { code: "HIST 210", title: "Response paper notes", day: 22, start: "13:00", end: "15:00" },
  { code: "CHEM 122", title: "Titration lab prep", day: 25, start: "18:00", end: "20:00" },
  { code: "ENGL 185", title: "Theory seminar prep", day: 27, start: "19:30", end: "21:00" },
];
