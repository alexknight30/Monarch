# Syllabus ingest — scoping & plan

**Goal.** A student drops a syllabus PDF on the course setup screen. The system reads it and
produces a *proposal*: a course profile, a set of assignments, a populated calendar (class
cadence, office hours, deadlines), and suggested tasks. The student reviews, edits, confirms.
Everything lands in the per-view store.

---

## 1. Where the repo is today

### The upload is inert

`src/app/courses/course-setup-card.tsx:84` renders `<FileUpload>` with **no** `onFilesAccepted`
or `onFilesChange` handler. The component supports both props (`file-upload.tsx:46-47`) — they
are simply never passed. Files get `URL.createObjectURL`'d into local component state and
discarded. The "Go" button calls `onCancel()`. There is no upload route, no file storage, no
parser, no extraction.

### What exists and is reusable

| Thing | Where | Why it matters |
| --- | --- | --- |
| Tool-calling loop | `api/chat/route.ts:166-220` + `lib/chat-tools.ts` | The "agents = tool calls" pattern, already working |
| Per-view JSON store | `lib/local-db.ts` | Clean read/write layer; adding a collection is ~15 lines |
| View resolution | `lib/api-view.ts`, `lib/views-server.ts` | Cookie-scoped `/api/[viewId]/...`; new routes inherit it free |
| Anthropic SDK | `package.json` | `@anthropic-ai/sdk@^0.116.0` already installed |
| Planner tree | `lib/planner.ts` | Arbitrary-depth issue tree — suggested tasks slot straight in |
| Artifacts | `lib/mock-data.ts` (`Artifact`), `data/*/artifacts.json` | `kind: "document" \| "paper"` — what assignments will tag |

### The four gaps

1. **No Assignment object.** Assignments exist only as a free-text string on
   `PlannerIssue.assignment` and as hardcoded `DEADLINES` entries in `mock-data.ts`.

2. **The calendar can't be written to, and can't hold real dates.** `ViewStore` persists only
   `planner | artifacts | courses`. `getServerViewDataset()` (`views-server.ts:24`) overrides
   those three from disk but leaves `calendarCourses`, `officeHours`, `deadlines`,
   `studySessions` coming from the static `getViewDataset()` — which returns **empty arrays**
   for every non-`mock-one` view. Worse, events are keyed by *day of month* (`day: 4`) with
   weekday recurrence and no term bounds. "Midterm on Oct 14, 2026" is not representable.

3. **`Course` is display strings only.** `schedule` is one string, `"MWF · 10:00–10:50 AM"`.
   No structured meetings, term dates, office hours, or grading breakdown.

4. **`PlannerIssue.due` is a display string** (`"Aug 12"`) — not sortable or comparable.

> **Note:** I could not find a review/confirm UI anywhere in `src/`. Assuming it's designed
> outside the repo. §4 defines the `Proposal` contract it should bind to.

---

## 2. Object model

Decisions taken: Assignment is a standalone object; the calendar moves to real ISO datetimes;
storage stays as per-view JSON files under `data/<viewId>/`.

### 2.1 Relationship graph

```
SourceDocument ──1:1──> Course
                          │
                          ├──1:N──> Assignment ──1:N──> PlannerIssue   (suggested tasks)
                          │              │
                          │              └──1:N──> Artifact            (papers, diagrams)
                          │              │
                          │              └──1:1──> CalendarEvent       (kind: deadline)
                          │
                          └──1:N──> CalendarEvent                      (class, office-hours)
```

### 2.2 `Course` — extend, don't restructure

Keep `term: string` and `schedule: string` exactly as they are — `courses-client.tsx:24-28`
filters tabs off `term`, and the course cards render `schedule` verbatim. Adding fields
alongside them avoids touching that UI at all.

```ts
type Course = {
  // unchanged
  slug: string; code: string; title: string; description: string;
  instructor: string; schedule: string; term: string;

  // new — all optional, so existing rows stay valid
  termStartsAt?: string;          // ISO date, e.g. "2026-09-02"
  termEndsAt?: string;
  instructorEmail?: string;
  instructorOffice?: string;
  meetings?: Meeting[];
  officeHours?: OfficeHour[];
  grading?: { component: string; weight: number }[];
  policies?: { late?: string; attendance?: string; ai?: string; integrity?: string };
  sourceDocumentId?: string;
  needsReview?: string[];         // field paths the extractor was unsure about
};

type Meeting = {
  kind: "lecture" | "lab" | "discussion" | "seminar";
  days: number[];                 // 0 = Sunday, matches the existing convention
  start: string;                  // "10:00"
  end: string;                    // "10:50"
  location?: string;
};

type OfficeHour = {
  host: string;                   // "Prof. Farouk" or "Ravi (TA)"
  day: number;
  start: string; end: string;
  location?: string;
  mode?: "in-person" | "virtual" | "by-appointment";
};
```

`schedule` becomes a *derived* display string — generate it from `meetings` on write, keep it
readable, never parse it back.

### 2.3 `Assignment` — new collection

```ts
type Assignment = {
  id: string;                     // "ASG-1", minted like planner's LMS-n
  courseSlug: string;
  title: string;
  type: "reading" | "problem-set" | "paper" | "lab" | "exam"
      | "quiz" | "project" | "presentation" | "discussion";
  dueAt: string | null;           // ISO datetime; null = "TBD per syllabus"
  weight: number | null;          // percent of final grade
  description?: string;
  source?: { documentId: string; quote: string; page?: number };
  status: "upcoming" | "submitted" | "graded";
  needsReview?: boolean;
};
```

Stored at `data/<viewId>/assignments.json`.

### 2.4 The tagging edge

Per your note that Assignment's near-term job is tagging artifacts: put the pointer on the
**child**, matching how `PlannerIssue.artifact` already works. One artifact belongs to at most
one assignment; no array to keep in sync.

```ts
// Artifact (lib/mock-data.ts) — additive
type ArtifactBase = { /* ...existing... */
  courseSlug?: string;
  assignmentId?: string;
};

// PlannerIssue (lib/planner.ts) — additive
type PlannerIssue = { /* ...existing... */
  assignmentId?: string;
  courseSlug?: string;
  dueAt?: string;                 // ISO, alongside the existing display `due`
};
```

`ArtifactKind` is `"document" | "paper"` today. You mentioned **papers and diagrams** — worth
deciding whether `"diagram"` becomes a third kind, or whether diagrams live inside a document
artifact via the existing mermaid renderer (`components/ui/mermaid-diagram.tsx`). Not blocking;
flagging it.

### 2.5 `CalendarEvent` — new collection, real datetimes

```ts
type CalendarEvent = {
  id: string;
  courseSlug: string;
  kind: "class" | "office-hours" | "deadline" | "exam" | "session";
  title: string;
  startsAt: string;               // ISO datetime
  endsAt: string;
  location?: string;
  assignmentId?: string;          // set on deadline/exam events
  generatedBy: "syllabus" | "user";
  seriesId?: string;              // groups one recurrence expansion for clean regeneration
};
```

`seriesId` is what lets a re-ingest delete and rebuild one course's class meetings without
touching anything the student added by hand.

Stored at `data/<viewId>/calendar.json`.

### 2.6 `SourceDocument` and `IngestRun`

```ts
type SourceDocument = {
  id: string;
  filename: string; mime: string; sizeBytes: number;
  storedPath: string;             // data/<viewId>/uploads/<id>.pdf
  fileApiId?: string;             // Anthropic Files API id, reused across all 5 calls
  uploadedAt: string;
  kind: "syllabus";
  courseSlug?: string;            // backfilled on apply
  status: "uploaded" | "extracting" | "extracted" | "applied" | "failed";
};

type IngestRun = {
  id: string;
  documentId: string;
  status: "running" | "proposed" | "applied" | "failed";
  stages: { name: string; status: string; ms: number; error?: string }[];
  proposal?: Proposal;
  appliedAt?: string;
};
```

Add `data/*/uploads/` to `.gitignore` — the JSON stores are committed, but PDFs shouldn't be.

### 2.7 Final `ViewStore`

```ts
type ViewStore = {
  planner: PlannerIssue[];
  artifacts: Artifact[];
  courses: Course[];
  assignments: Assignment[];      // new
  calendar: CalendarEvent[];      // new
  documents: SourceDocument[];    // new
  ingestRuns: IngestRun[];        // new
};
```

---

## 3. The pipeline

You preferred a real orchestrator with four LLM subagents and said you're price-insensitive.
That's the right call for two of the four stages and I'd build it — with **one carve-out**.

### Where subagents genuinely beat deterministic code

| Stage | LLM worth it? | Why |
| --- | --- | --- |
| Course profile | Marginal | Mostly field mapping. Some value in writing a decent description and normalizing instructor prose. |
| **Assignments** | **Yes** | Real judgment. "Problem sets due weekly on Fridays" → 12 discrete assignments. Assignments appear in *both* the schedule table (with dates) and the grading table (with weights) and must be reconciled. Types must be inferred. |
| Schedule | **Split** | Deciding *what recurs* and *what the exceptions are* (breaks, holidays, no-class days, room changes) is judgment. Counting out "every Mon/Wed from Sept 2 to Dec 12, skipping Nov 25–29" into 28 datetimes is arithmetic — models are worse at it than a ten-line loop, **and the errors are silent**. |
| **Tasks** | **Yes** | Obviously. |

**The carve-out:** the schedule agent emits *recurrence rules plus exception dates*, not an
expanded list of event instances. Code does the expansion. You keep Option 2's quality where it
matters and never ship a calendar that's off by one week because a model miscounted.

### Cost, since you asked

Not 5× a single call. The extractor runs first and writes the prompt cache; the four subagents
launch after it returns and all read that cache at ~0.1× input rate. Ordering matters —
requests fired simultaneously would each pay full price, because a cache entry only becomes
readable once the first response starts streaming.

### Stages

```
0  route      upload → store bytes → Files API → SourceDocument{status:"uploaded"}

1  extract    1 call, claude-opus-5
              PDF document block + output_config.format(SYLLABUS_SCHEMA)
              → verbatim facts, recurrence rules, exception dates, per-field confidence
              writes the prompt cache

2  fan-out    4 parallel calls, each: cached PDF + stage-1 JSON, narrow task
              A  course profile  → Course
              B  assignments     → Assignment[]
              C  schedule        → rules + exceptions + one-offs   (NOT expanded)
              D  tasks           → PlannerIssue trees per assignment

3  materialize   pure functions, no LLM
              expand C's rules → CalendarEvent[]
              mint deadline events from B's dueAt
              mint ids, cross-link assignmentId / courseSlug / seriesId

4  propose    Proposal → review UI

5  apply      POST edited Proposal → one batched write across all collections
```

### API specifics that matter

- **PDF goes in directly.** `{"type": "document", "source": {"type": "base64", "media_type":
  "application/pdf", "data": <b64>}}`, placed *before* the text block. No beta header. Limits:
  32 MB request, 600 pages. No `pdf-parse` dependency needed.
- **Upload once via the Files API** (beta `files-api-2025-04-14`) and reference `file_id` in all
  five calls rather than re-sending base64 five times.
- **DOCX is not an accepted block type.** Convert (mammoth → text, or → PDF) or restrict the
  accept list. Images *are* accepted natively, so a photo of a syllabus works.
- **Structured output:** `output_config: {format: {type: "json_schema", schema}}`. Schema
  constraints: `additionalProperties: false` required, no recursive schemas, no `minLength` /
  `maximum` / numeric bounds. First call with a new schema pays a one-time compile; cached 24h
  after.
- **Prompt caching:** `cache_control: {type: "ephemeral"}` on the document block. 5-minute TTL —
  fine, the fan-out is seconds later. Render order is `tools → system → messages`, and any byte
  change invalidates everything after it, so the four subagent prompts must share a
  byte-identical prefix and differ only in a trailing instruction block.
- **`max_tokens` gotcha on Opus 5:** thinking is on by default and `max_tokens` caps thinking
  *plus* response text together. Size it generously (16000) or the JSON truncates mid-object.
  Above ~16000, stream.
- **Model:** `claude-opus-5` for extraction (the hard reasoning is here). `claude-sonnet-5` is
  reasonable for the four subagents. The repo currently hardcodes `claude-sonnet-5` in
  `api/chat/route.ts:159` — worth pulling into a shared constant.

---

## 4. The `Proposal` contract

This is the review screen's binding target and the apply endpoint's request body — the same
shape both ways, so the screen can edit in place and POST it back.

```ts
type Proposal = {
  runId: string;
  documentId: string;
  course: Course;
  assignments: Assignment[];
  calendarEvents: CalendarEvent[];
  tasks: PlannerIssue[];          // roots; children nested as usual
  warnings: {
    severity: "info" | "warn";
    field: string;                // "course.termStartsAt", "assignments[3].dueAt"
    message: string;
    quote?: string;               // the syllabus text this came from
  }[];
};
```

Every field the extractor was unsure about carries a warning with the source quote, so the
review screen can show "we read this as Oct 14 — here's the line it came from" rather than
asking the student to trust a bare date.

---

## 5. File inventory

### New

```
src/lib/syllabus/schema.ts          SyllabusExtraction JSON schema + TS types
src/lib/syllabus/extract.ts         stage 1
src/lib/syllabus/agents.ts          stages 2A–2D
src/lib/syllabus/materialize.ts     stage 3 — pure, unit-testable, no LLM
src/lib/syllabus/orchestrator.ts    runs the pipeline, records IngestRun
src/lib/assignments.ts              Assignment type + CRUD helpers
src/lib/calendar-events.ts          CalendarEvent type + ISO helpers
src/lib/source-documents.ts

src/app/api/[viewId]/documents/route.ts             POST multipart upload
src/app/api/[viewId]/ingest/route.ts                POST {documentId} → Proposal
src/app/api/[viewId]/ingest/[runId]/apply/route.ts  POST Proposal → writes
src/app/api/[viewId]/assignments/route.ts
src/app/api/[viewId]/calendar/route.ts
```

### Modified

| File | Change |
| --- | --- |
| `lib/local-db.ts` | 4 new collections + create/list/batch-write helpers |
| `lib/views.ts` | `ViewDataset` gains assignments/calendar; drop static calendar mocks |
| `lib/views-server.ts` | read calendar + assignments from disk |
| `lib/mock-data.ts` | `Course` gains fields; `Artifact` gains `courseSlug`/`assignmentId`; calendar mocks → ISO |
| `lib/calendar.ts` | `eventsForDate` takes ISO events; drop day-of-month matching |
| `app/calendar/page.tsx` | render from ISO events |
| `app/courses/course-setup-card.tsx` | wire `onFilesAccepted` → upload → ingest → review |
| `lib/planner.ts` | `PlannerIssue` gains `assignmentId`, `courseSlug`, `dueAt` |
| `lib/chat-tools.ts` | (later) assignment + calendar tools so chat can edit them |
| `scripts/seed-local-db.mjs` | seed the new collections; migrate mock-one to ISO |

---

## 6. Phases

**Phase 1 — data model + storage. No AI.**
Types, `ViewStore` expansion, the CRUD routes, the calendar ISO rewrite, seed migration.
*Done when:* you can create a course with structured meetings via the manual tab, and the
calendar renders real dated events for `alex-knight` (which shows an empty calendar today no
matter what you do). This is the biggest single chunk and everything else sits on it.

**Phase 2 — upload + extraction.**
File storage, Files API, stage 1 only. Dump raw `SyllabusExtraction` JSON to a debug view.
*Done when:* dropping a real syllabus prints correct structured JSON.

**Phase 3 — fan-out + materialize.**
Stages 2 and 3. Orchestrator, four subagents, deterministic expansion.
*Done when:* a real syllabus produces a `Proposal` whose calendar dates are correct against the
PDF — check the term boundaries and a break week specifically.

**Phase 4 — review + apply.**
Bind the review screen to `Proposal`; implement apply as a batched write.
*Done when:* upload → review → confirm populates courses, assignments, calendar, and planner.

**Phase 5 — polish.**
Low-confidence highlighting, re-ingest (delete-by-`seriesId` and rebuild), artifact tagging,
chat tools for assignments/calendar.

---

## 7. Open questions

1. **Diagrams as an artifact kind** — third `ArtifactKind`, or mermaid inside a document
   artifact? (§2.4)
2. **Multi-course PDFs.** Assuming one syllabus = one course. Worth confirming — some programs
   hand out a combined packet.
3. **Term dates when the syllabus omits them.** Many syllabi give a weekly schedule with no
   calendar year. Options: infer from the term string (`"Fall 2026"` → Sept–Dec), ask the
   student on the review screen, or leave `termStartsAt` null and skip class-meeting expansion
   until they fill it in. I'd default to asking on review — it's one field and getting it wrong
   silently corrupts every generated event.
4. **Where does the review screen live?** I couldn't find it in `src/`. If it's designed in
   Paper, §4 is the contract to build against.
