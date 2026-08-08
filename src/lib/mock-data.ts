// Mock data for the Lumis prototype. No backend yet — every screen reads from here.

export const CURRENT_USER = {
  firstName: "Alex",
  school: "Westbrook College",
};

/* ---------------------------------------------------------------- home --- */

export const HOME_STATS = [
  { label: "Assignments due", value: "4", note: "this week" },
  { label: "Active courses", value: "5", note: "Fall 2026" },
  { label: "Study streak", value: "12", note: "days in a row" },
  { label: "Projects", value: "6", note: "2 shared with you" },
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
  username: string;
  role: "Student" | "Professor" | "Admin";
  email: string;
  courses: number;
  lastUsed: string;
  usage: string;
};

export const ADMIN_USERS: AdminUser[] = [
  { username: "m.okafor", role: "Student", email: "m.okafor@westbrook.edu", courses: 5, lastUsed: "Aug 7, 2026 · 8:11 AM", usage: "72%" },
  { username: "r.delacruz", role: "Professor", email: "r.delacruz@westbrook.edu", courses: 3, lastUsed: "Aug 7, 2026 · 9:22 AM", usage: "41%" },
  { username: "j.whitfield", role: "Student", email: "j.whitfield@westbrook.edu", courses: 4, lastUsed: "Aug 7, 2026 · 10:33 AM", usage: "88%" },
  { username: "a.brennan", role: "Admin", email: "a.brennan@westbrook.edu", courses: 12, lastUsed: "Aug 7, 2026 · 11:44 AM", usage: "96%" },
  { username: "s.nakamura", role: "Student", email: "s.nakamura@westbrook.edu", courses: 6, lastUsed: "Aug 7, 2026 · 1:05 PM", usage: "34%" },
  { username: "p.ellison", role: "Professor", email: "p.ellison@westbrook.edu", courses: 2, lastUsed: "Aug 7, 2026 · 2:20 PM", usage: "63%" },
  { username: "t.marchetti", role: "Student", email: "t.marchetti@westbrook.edu", courses: 5, lastUsed: "Aug 7, 2026 · 3:48 PM", usage: "19%" },
  { username: "l.abara", role: "Student", email: "l.abara@westbrook.edu", courses: 4, lastUsed: "Aug 7, 2026 · 4:36 PM", usage: "77%" },
  { username: "k.svensson", role: "Professor", email: "k.svensson@westbrook.edu", courses: 3, lastUsed: "Aug 6, 2026 · 5:40 PM", usage: "52%" },
  { username: "d.reyes", role: "Admin", email: "d.reyes@westbrook.edu", courses: 9, lastUsed: "Aug 6, 2026 · 5:12 PM", usage: "84%" },
  { username: "c.holloway", role: "Student", email: "c.holloway@westbrook.edu", courses: 5, lastUsed: "Aug 6, 2026 · 6:02 PM", usage: "28%" },
  { username: "n.farouk", role: "Professor", email: "n.farouk@westbrook.edu", courses: 4, lastUsed: "Aug 5, 2026 · 9:15 AM", usage: "67%" },
];

/* ------------------------------------------------------------ projects --- */

export type Project = {
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
};

export const PROJECTS: Project[] = [
  {
    slug: "orgo-ii-reaction-maps",
    title: "Orgo II Reaction Maps",
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
  },
  {
    slug: "thesis-lit-review",
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
  },
  {
    slug: "stat-140-problem-sets",
    title: "Stat 140 Problem Sets",
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
  },
  {
    slug: "gov-201-seminar-prep",
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
  },
  {
    slug: "cs-51-office-hours-notes",
    title: "CS 51 Office Hours Notes",
    description:
      "Turn messy office-hours scribbles into clean notes with runnable OCaml examples for each concept.",
    createdBy: "Sam Levine",
    updated: "Apr 1",
    visibility: "Private",
    instructions: "Every explanation gets a minimal runnable example. No pseudocode.",
    context: [],
    scheduled: [],
    chats: [],
  },
  {
    slug: "spring-course-planning",
    title: "Spring Course Planning",
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
  },
];

export function getProject(slug: string) {
  return PROJECTS.find((p) => p.slug === slug);
}
