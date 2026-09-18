# Monarch

A local schoolwork workspace with courses, tasks, a calendar, AI chat, and eight artifact editors: documents, notes, diagrams, lessons, flashcards, practice tests, readings, and slides.

## Run locally

From this folder, install dependencies with `npm install`, then run `npm run dev -- --hostname 127.0.0.1`. Open http://localhost:3000. Use Node.js 20.9 or newer. Diagrams use the MIT-licensed Excalidraw editor with locally served fonts. Existing tldraw snapshots are retained and converted into editable scenes; unsupported shapes are identified in the interface, and the original snapshot can be downloaded.

The existing `.env.local` contains local provider configuration. Do not overwrite it with the example file. On a fresh checkout, copy `.env.example` to `.env.local` and configure `XAI_API_KEY`. Chat uses the exact `grok-4.5` model. Keys stay on the server.

## Start your schoolwork

1. Choose your workspace in Admin. The example workspace has demonstration content; workspaces keep separate records.
2. Fill in Settings → Student info. Your saved name and school appear throughout your workspace.
3. Add a course from Courses by uploading a PDF/image syllabus or entering it manually. Grok 4.5 extracts the syllabus into a proposal you review before applying. Use Edit course for term dates, meetings, office hours and policies. Assignment and event managers let you enter real deadlines.
4. Choose Artifacts → New artifact. Select a type, course, tags and source links. Start blank or prepare content from source material. Reading imports support PDF, DOCX and text files; scanned PDFs need a selectable-text version for local text extraction.
5. Chat can read and update workspace objects, stream replies, retain uploaded-file context, and stop/continue responses. Conversations keep browser drafts and a disk copy. Check the save status before closing a page after a connection failure.

Use the menu on an artifact card to edit its title, course, tags and description, make a copy, or move it to Trash. Copies retain content and source links with fresh study progress. Restore from the Trash tab; linked tasks and source files are preserved. The library can filter by course. Course lists use the term end dates you enter instead of fixed example terms.

Tasks and calendar events have editable visual tags. New tasks accept real due dates/times and an optional PDF, DOCX or text attachment. An attachment becomes a linked reading with its original file retained; task details show the universal linked-objects panel.

Lessons support editable content, answer fields and saved progress. Write your reasoning under a tutor question and choose Get feedback. Grok 4.5 uses the lesson and linked material; feedback saves with your answer. You can stop a request, and changing your answer or question prevents an outdated response from attaching to it. Web research uses Grok 4.5's built-in search with your existing xAI connection; optional Tavily/Brave keys take precedence if configured. Research searches public sources, not a signed-in school library. Study mode requests guided explanations and practice. Document-side chat also persists with its artifact, retains attachment references, and offers stop/continue. If you type while a model edit is arriving, Monarch keeps your writing and offers the model version separately.

Artifact saves compare the fields you edited with the version you opened. Conflicting edits pause autosave and offer your draft and the saved version for review, plus a draft download. Changes to unrelated fields can save together. AI editing tools must read an artifact before changing it and reject changes based on an outdated read. Task pickers use saved object IDs, so duplicate titles and renamed artifacts stay correctly linked; removing a selection clears its link.

## Your data

Each workspace lives under `data/<view-id>/`. The first change migrates legacy JSON collections into a canonical `workspace.json` without deleting the original files. Subsequent changes are serialized and atomically saved, with up to 30 prior snapshots under `data/backups/<view-id>/`.

Settings → Workspace → Full backup downloads records, original uploaded documents, chat attachments and whiteboard media in a `.monarch.gz` file. Restore first checks the file and previews its contents, then requires typing REPLACE. Restore replaces the current workspace records, saves the prior records in a recovery snapshot, and retains original files on disk. Close other Monarch tabs before restoring so they cannot save older work over the restored records. A backup belongs to the workspace that created it.

Provider keys and older recovery snapshots are not included in the downloadable backup. In-app backups support up to 256 MB uncompressed and 10,000 files. For a larger workspace or a complete copy including recovery history, stop the server and copy the entire `data` directory. The separate JSON records export does **not** include uploaded files. Do not run seed scripts over personal work.

This is a local app. The workspace selector is not an authentication system; keep the server bound to this Mac.

## Verification

Run `npx tsc --noEmit --incremental false` and `npm run build` for compilation. Regression scripts run with `npx tsx scripts/<name>.ts`:

- `check-storage`: concurrency, import identities, rollback and artifact persistence.
- `check-academic`: assignments, calendar dates, course schedules and removal.
- `check-workspace-extras`: profiles, chats, task dates and course reassignment.
- `check-syllabus-review`: corrected dates, linked tasks and invalid-import rollback.
- `check-export`: presentation and document export structure.
- `check-backup`: full backup/restore, source files, retained prior work, corruption and path checks.
- `check-artifact-lifecycle`: copying all eight types, recoverable Trash, restored links and reserved artifact identities.
- `check-task-source`: atomic task/reading/file creation, concurrent retries and rollback.
- `check-task-links`: duplicate titles, rename propagation, assignment identity and clearing selections.
- `check-artifact-conflicts`: competing saves, independent fields, retries and stale AI edits.
- `check-chat-cache`: stable history snapshots, subscriptions and disk synchronization.
- `check-web-research`: verified citation extraction and failure handling; `--live` additionally runs one public Grok search.
- `check-approved-flows`: lesson context boundaries and validation; `--live` additionally checks tutoring and a synthetic PDF syllabus through proposal/application.
- `check-syllabus-image`: paid provider check using a synthetic PNG syllabus.
- `check-tutor-api`: validation, changed questions and workspace isolation against the isolated preview on port 3100.

Storage tests use synthetic data in temporary directories. API checks in `check-artifact-api.ts` and `check-workspace-api.ts` expect a separate preview on port 3100 with a temporary `MONARCH_DATA_ROOT`; do not point them at personal data. `smoke-chat.ts` and `smoke-research.ts` additionally make paid provider calls using synthetic content. Run provider smoke checks with `node --env-file=.env.local --import tsx scripts/<name>.ts`.

See `IMPLEMENTATION.md` for completed checks and remaining work. Browser acceptance remains unresolved because the browser tool cannot verify its administrator policy; a successful build alone does not establish that all editor interactions are verified. Imported PDF readings now render their original pages with selectable text, page navigation, and zoom. The extracted-text view and existing annotations remain available.
