export type RecurrenceKind = "class" | "office-hours";

export type RecurrenceRule = {
  kind: RecurrenceKind;
  title: string;
  days: number[];
  start: string;
  end: string;
  location?: string;
  from?: string;
  to?: string;
  skipDates: string[];
};

export type ExtractedAssignment = {
  title: string;
  type: string;
  dueAt: string;
  weight: number | null;
  description: string;
  quote: string;
  page: number | null;
  needsReview: boolean;
};

export type ExtractedMeeting = {
  kind: string;
  days: number[];
  start: string;
  end: string;
  location: string;
};

export type ExtractedOfficeHour = {
  host: string;
  day: number;
  start: string;
  end: string;
  location: string;
  mode: string;
};

export type ExtractedOneOff = {
  kind: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string;
};

export type ExtractedWarning = {
  severity: string;
  field: string;
  message: string;
  quote: string;
};

export type SyllabusExtraction = {
  course: {
    code: string;
    title: string;
    description: string;
    instructor: string;
    instructorEmail: string;
    instructorOffice: string;
    term: string;
    termStartsAt: string;
    termEndsAt: string;
    scheduleText: string;
  };
  meetings: ExtractedMeeting[];
  officeHours: ExtractedOfficeHour[];
  assignments: ExtractedAssignment[];
  recurrence: RecurrenceRule[];
  oneOffs: ExtractedOneOff[];
  grading: { component: string; weight: number }[];
  policies: {
    late: string;
    attendance: string;
    ai: string;
    integrity: string;
  };
  warnings: ExtractedWarning[];
};

function objectSchema(
  properties: Record<string, unknown>,
  required: string[],
) {
  return {
    type: "object",
    additionalProperties: false,
    properties,
    required,
  };
}

export const SYLLABUS_SCHEMA = objectSchema(
  {
    course: objectSchema(
      {
        code: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        instructor: { type: "string" },
        instructorEmail: { type: "string" },
        instructorOffice: { type: "string" },
        term: { type: "string" },
        termStartsAt: { type: "string" },
        termEndsAt: { type: "string" },
        scheduleText: { type: "string" },
      },
      [
        "code",
        "title",
        "description",
        "instructor",
        "instructorEmail",
        "instructorOffice",
        "term",
        "termStartsAt",
        "termEndsAt",
        "scheduleText",
      ],
    ),
    meetings: {
      type: "array",
      items: objectSchema(
        {
          kind: { type: "string" },
          days: { type: "array", items: { type: "integer" } },
          start: { type: "string" },
          end: { type: "string" },
          location: { type: "string" },
        },
        ["kind", "days", "start", "end", "location"],
      ),
    },
    officeHours: {
      type: "array",
      items: objectSchema(
        {
          host: { type: "string" },
          day: { type: "integer" },
          start: { type: "string" },
          end: { type: "string" },
          location: { type: "string" },
          mode: { type: "string" },
        },
        ["host", "day", "start", "end", "location", "mode"],
      ),
    },
    assignments: {
      type: "array",
      items: objectSchema(
        {
          title: { type: "string" },
          type: { type: "string" },
          dueAt: { type: "string" },
          weight: { type: ["number", "null"] },
          description: { type: "string" },
          quote: { type: "string" },
          page: { type: ["integer", "null"] },
          needsReview: { type: "boolean" },
        },
        [
          "title",
          "type",
          "dueAt",
          "weight",
          "description",
          "quote",
          "page",
          "needsReview",
        ],
      ),
    },
    recurrence: {
      type: "array",
      items: objectSchema(
        {
          kind: { type: "string" },
          title: { type: "string" },
          days: { type: "array", items: { type: "integer" } },
          start: { type: "string" },
          end: { type: "string" },
          location: { type: "string" },
          from: { type: "string" },
          to: { type: "string" },
          skipDates: { type: "array", items: { type: "string" } },
        },
        [
          "kind",
          "title",
          "days",
          "start",
          "end",
          "location",
          "from",
          "to",
          "skipDates",
        ],
      ),
    },
    oneOffs: {
      type: "array",
      items: objectSchema(
        {
          kind: { type: "string" },
          title: { type: "string" },
          startsAt: { type: "string" },
          endsAt: { type: "string" },
          location: { type: "string" },
        },
        ["kind", "title", "startsAt", "endsAt", "location"],
      ),
    },
    grading: {
      type: "array",
      items: objectSchema(
        {
          component: { type: "string" },
          weight: { type: "number" },
        },
        ["component", "weight"],
      ),
    },
    policies: objectSchema(
      {
        late: { type: "string" },
        attendance: { type: "string" },
        ai: { type: "string" },
        integrity: { type: "string" },
      },
      ["late", "attendance", "ai", "integrity"],
    ),
    warnings: {
      type: "array",
      items: objectSchema(
        {
          severity: { type: "string" },
          field: { type: "string" },
          message: { type: "string" },
          quote: { type: "string" },
        },
        ["severity", "field", "message", "quote"],
      ),
    },
  },
  [
    "course",
    "meetings",
    "officeHours",
    "assignments",
    "recurrence",
    "oneOffs",
    "grading",
    "policies",
    "warnings",
  ],
);

export const COURSE_AGENT_SCHEMA = objectSchema(
  {
    code: { type: "string" },
    title: { type: "string" },
    description: { type: "string" },
    instructor: { type: "string" },
    instructorEmail: { type: "string" },
    instructorOffice: { type: "string" },
    term: { type: "string" },
    termStartsAt: { type: "string" },
    termEndsAt: { type: "string" },
    meetings: SYLLABUS_SCHEMA.properties.meetings,
    officeHours: SYLLABUS_SCHEMA.properties.officeHours,
    grading: SYLLABUS_SCHEMA.properties.grading,
    policies: SYLLABUS_SCHEMA.properties.policies,
    needsReview: { type: "array", items: { type: "string" } },
  },
  [
    "code",
    "title",
    "description",
    "instructor",
    "instructorEmail",
    "instructorOffice",
    "term",
    "termStartsAt",
    "termEndsAt",
    "meetings",
    "officeHours",
    "grading",
    "policies",
    "needsReview",
  ],
);

export const ASSIGNMENTS_AGENT_SCHEMA = objectSchema(
  {
    assignments: SYLLABUS_SCHEMA.properties.assignments,
  },
  ["assignments"],
);

export const SCHEDULE_AGENT_SCHEMA = objectSchema(
  {
    recurrence: SYLLABUS_SCHEMA.properties.recurrence,
    oneOffs: SYLLABUS_SCHEMA.properties.oneOffs,
    warnings: SYLLABUS_SCHEMA.properties.warnings,
  },
  ["recurrence", "oneOffs", "warnings"],
);

export const TASK_AGENT_SCHEMA = objectSchema(
  {
    tasks: {
      type: "array",
      items: objectSchema(
        {
          title: { type: "string" },
          assignmentTitle: { type: "string" },
          dueAt: { type: "string" },
          description: { type: "string" },
          children: {
            type: "array",
            items: objectSchema(
              {
                title: { type: "string" },
                description: { type: "string" },
              },
              ["title", "description"],
            ),
          },
        },
        ["title", "assignmentTitle", "dueAt", "description", "children"],
      ),
    },
  },
  ["tasks"],
);

export type CourseAgentResult = {
  code: string;
  title: string;
  description: string;
  instructor: string;
  instructorEmail: string;
  instructorOffice: string;
  term: string;
  termStartsAt: string;
  termEndsAt: string;
  meetings: ExtractedMeeting[];
  officeHours: ExtractedOfficeHour[];
  grading: { component: string; weight: number }[];
  policies: SyllabusExtraction["policies"];
  needsReview: string[];
};

export type AssignmentsAgentResult = {
  assignments: ExtractedAssignment[];
};

export type ScheduleAgentResult = {
  recurrence: RecurrenceRule[];
  oneOffs: ExtractedOneOff[];
  warnings: ExtractedWarning[];
};

export type TaskAgentItem = {
  title: string;
  assignmentTitle: string;
  dueAt: string;
  description: string;
  children: { title: string; description: string }[];
};

export type TasksAgentResult = {
  tasks: TaskAgentItem[];
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

const WEEKDAY_ALIASES: Record<string, number> = {
  sunday: 0,
  sundays: 0,
  sun: 0,
  su: 0,
  u: 0,
  monday: 1,
  mondays: 1,
  mon: 1,
  mo: 1,
  m: 1,
  tuesday: 2,
  tuesdays: 2,
  tue: 2,
  tues: 2,
  tu: 2,
  t: 2,
  wednesday: 3,
  wednesdays: 3,
  wed: 3,
  we: 3,
  w: 3,
  thursday: 4,
  thursdays: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  th: 4,
  r: 4,
  friday: 5,
  fridays: 5,
  fri: 5,
  fr: 5,
  f: 5,
  saturday: 6,
  saturdays: 6,
  sat: 6,
  sa: 6,
  s: 6,
};

function parseDayToken(token: string): number[] {
  const cleaned = token.toLowerCase().replace(/\./g, "").trim();
  if (!cleaned) return [];
  if (/^[0-6]$/.test(cleaned)) return [Number(cleaned)];
  if (cleaned === "7") return [0];
  if (WEEKDAY_ALIASES[cleaned] !== undefined) return [WEEKDAY_ALIASES[cleaned]];

  const days: number[] = [];
  let i = 0;
  const compact = cleaned.replace(/[\s\-/|,&]+/g, "");
  while (i < compact.length) {
    const two = compact.slice(i, i + 2);
    if (two === "th" || two === "tu") {
      days.push(two === "th" ? 4 : 2);
      i += 2;
      continue;
    }
    const mapped = WEEKDAY_ALIASES[compact[i]];
    if (mapped !== undefined) days.push(mapped);
    i += 1;
  }
  return days;
}

/** Coerce model weekday output ("Monday", "MW", 1) into JS getDay() numbers. */
export function normalizeWeekdays(value: unknown): number[] {
  const tokens: unknown[] = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[,&/|]+/)
      : typeof value === "number"
        ? [value]
        : [];
  const days = new Set<number>();
  for (const token of tokens) {
    if (typeof token === "number" && Number.isInteger(token)) {
      if (token >= 0 && token <= 6) days.add(token);
      else if (token === 7) days.add(0);
      continue;
    }
    if (typeof token === "string") {
      for (const day of parseDayToken(token)) days.add(day);
    }
  }
  return [...days].sort((a, b) => a - b);
}

export function normalizeWeekday(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) {
    if (value >= 0 && value <= 6) return value;
    if (value === 7) return 0;
  }
  const days = normalizeWeekdays(value);
  return days.length ? days[0] : null;
}

function padClock(n: number) {
  return String(n).padStart(2, "0");
}

/** Coerce model clock output ("11", "1:30 pm") into 24-hour HH:mm. */
export function normalizeClock(value: unknown): string {
  const text = asString(value).replace(/\s+/g, " ");
  if (!text) return "";
  const match = /^(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?$/i.exec(text);
  if (!match) return text;
  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  const meridiem = match[3]?.replace(/\./g, "").toLowerCase();
  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) return text;
  return `${padClock(hours)}:${padClock(minutes)}`;
}

function normalizeMeeting(meeting: ExtractedMeeting): ExtractedMeeting {
  return {
    ...meeting,
    kind: asString(meeting.kind) || "lecture",
    days: normalizeWeekdays(meeting.days),
    start: normalizeClock(meeting.start),
    end: normalizeClock(meeting.end),
    location: asString(meeting.location),
  };
}

function normalizeOfficeHour(hour: ExtractedOfficeHour): ExtractedOfficeHour | null {
  const day = normalizeWeekday(hour.day);
  if (day == null) return null;
  return {
    ...hour,
    host: asString(hour.host),
    day,
    start: normalizeClock(hour.start),
    end: normalizeClock(hour.end),
    location: asString(hour.location),
    mode: asString(hour.mode),
  };
}

export function normalizeRecurrenceRule(rule: RecurrenceRule): RecurrenceRule {
  return {
    ...rule,
    kind: rule.kind === "office-hours" ? "office-hours" : "class",
    title: asString(rule.title),
    days: normalizeWeekdays(rule.days),
    start: normalizeClock(rule.start),
    end: normalizeClock(rule.end),
    ...(asString(rule.location) ? { location: asString(rule.location) } : {}),
    ...(asIsoDate(rule.from) ? { from: asIsoDate(rule.from) } : {}),
    ...(asIsoDate(rule.to) ? { to: asIsoDate(rule.to) } : {}),
    skipDates: asArray<unknown>(rule.skipDates)
      .map((date) => asIsoDate(date))
      .filter(Boolean),
  };
}

function asWeight(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/%/g, "").trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asIsoDate(value: unknown) {
  const text = asString(value);
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(text);
  return match ? match[1] : "";
}

function pickString(
  record: Record<string, unknown> | undefined,
  nested: Record<string, unknown> | undefined,
  key: string,
) {
  return asString(record?.[key]) || asString(nested?.[key]);
}

export function normalizeExtraction(raw: SyllabusExtraction): SyllabusExtraction {
  const course = raw?.course ?? {
    code: "",
    title: "",
    description: "",
    instructor: "",
    instructorEmail: "",
    instructorOffice: "",
    term: "",
    termStartsAt: "",
    termEndsAt: "",
    scheduleText: "",
  };
  return {
    course: {
      code: asString(course.code),
      title: asString(course.title),
      description: asString(course.description),
      instructor: asString(course.instructor),
      instructorEmail: asString(course.instructorEmail),
      instructorOffice: asString(course.instructorOffice),
      term: asString(course.term),
      termStartsAt: asIsoDate(course.termStartsAt),
      termEndsAt: asIsoDate(course.termEndsAt),
      scheduleText: asString(course.scheduleText),
    },
    meetings: asArray<ExtractedMeeting>(raw?.meetings).map(normalizeMeeting),
    officeHours: asArray<ExtractedOfficeHour>(raw?.officeHours)
      .map(normalizeOfficeHour)
      .filter((hour): hour is ExtractedOfficeHour => hour != null),
    assignments: asArray<ExtractedAssignment>(raw?.assignments),
    recurrence: asArray<RecurrenceRule>(raw?.recurrence).map(normalizeRecurrenceRule),
    oneOffs: asArray<ExtractedOneOff>(raw?.oneOffs),
    grading: asArray<{ component: string; weight: number }>(raw?.grading),
    policies: {
      late: asString(raw?.policies?.late),
      attendance: asString(raw?.policies?.attendance),
      ai: asString(raw?.policies?.ai),
      integrity: asString(raw?.policies?.integrity),
    },
    warnings: asArray(raw?.warnings),
  };
}

export function normalizeCourseAgent(raw: CourseAgentResult): CourseAgentResult {
  const record = (raw ?? {}) as CourseAgentResult & {
    course?: Partial<CourseAgentResult>;
  };
  const nested = (record.course ?? {}) as Record<string, unknown>;
  const top = record as unknown as Record<string, unknown>;
  const policies = (record.policies ??
    (nested.policies as CourseAgentResult["policies"] | undefined) ??
    {}) as CourseAgentResult["policies"];
  return {
    code: pickString(top, nested, "code"),
    title: pickString(top, nested, "title"),
    description: pickString(top, nested, "description"),
    instructor: pickString(top, nested, "instructor"),
    instructorEmail: pickString(top, nested, "instructorEmail"),
    instructorOffice: pickString(top, nested, "instructorOffice"),
    term: pickString(top, nested, "term"),
    termStartsAt: asIsoDate(pickString(top, nested, "termStartsAt")),
    termEndsAt: asIsoDate(pickString(top, nested, "termEndsAt")),
    meetings: asArray<ExtractedMeeting>(record.meetings ?? nested.meetings).map(
      normalizeMeeting,
    ),
    officeHours: asArray<ExtractedOfficeHour>(record.officeHours ?? nested.officeHours)
      .map(normalizeOfficeHour)
      .filter((hour): hour is ExtractedOfficeHour => hour != null),
    grading: asArray<{ component: string; weight: number }>(
      record.grading ?? nested.grading,
    ),
    policies: {
      late: asString(policies.late),
      attendance: asString(policies.attendance),
      ai: asString(policies.ai),
      integrity: asString(policies.integrity),
    },
    needsReview: asArray(record.needsReview),
  };
}

export function normalizeAssignmentsAgent(
  raw: AssignmentsAgentResult,
): AssignmentsAgentResult {
  return {
    assignments: asArray<ExtractedAssignment>(raw?.assignments).map((item) => ({
      ...item,
      title: asString(item.title),
      type: asString(item.type),
      dueAt: asString(item.dueAt),
      weight: asWeight(item.weight),
      description: asString(item.description),
      quote: asString(item.quote),
      page: typeof item.page === "number" ? item.page : null,
      needsReview: Boolean(item.needsReview),
    })),
  };
}

export function normalizeScheduleAgent(raw: ScheduleAgentResult): ScheduleAgentResult {
  return {
    recurrence: asArray<RecurrenceRule>(raw?.recurrence).map(normalizeRecurrenceRule),
    oneOffs: asArray(raw?.oneOffs),
    warnings: asArray(raw?.warnings),
  };
}

export function normalizeTasksAgent(raw: TasksAgentResult): TasksAgentResult {
  return {
    tasks: asArray<TaskAgentItem>(raw?.tasks).map((task) => ({
      title: asString(task.title),
      assignmentTitle: asString(task.assignmentTitle),
      dueAt: asString(task.dueAt),
      description: asString(task.description),
      children: asArray(task.children),
    })),
  };
}
