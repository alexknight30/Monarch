# Monarch schoolwork implementation

User goal: usable personal schoolwork app across all eight artifact types, with Grok 4.5 chat and the supplied object/context/harness diagrams. Preserve schoolwork and existing edits. No commits or pushes. Do not contact external parties.

## Acceptance checklist

Latest status: the approved syllabus and lesson integrations are implemented and live-tested with synthetic material. The screenshot refinements are implemented as described in the latest section below. Excalidraw replaces the licensed tldraw UI; original snapshots are preserved. Production build and automated checks pass, but browser acceptance remains blocked by administrator-policy verification. The exact flashcard error has not been reproduced; its screenshot did not reveal the error text. The overall goal is not fully verified. Earlier entries below are historical and may describe superseded implementations.

- [ ] Grok 4.5: streaming, correct tool calls/results, durable file context, interruption/error recovery; live test text, attachment follow-up, workspace actions.
- [ ] Harness: course/page/linked-object context, temporal memory, bounded goal loop, Haiku side tasks where configured, search; preserve teaching guardrails from user specification.
- [ ] Universal creation workflow: all eight artifact types, title/course/tags, source material and links, navigation into completed artifact.
- [ ] Diagrams: Excalidraw canvas, pages, drawing tools, snapshots, embedded image persistence, reload/recovery, retained-original tldraw conversion. Browser interaction acceptance remains outstanding; some converted shape types use documented approximations.
- [ ] Documents and notes: reliable rich text editing, equations, save/recovery, persistent comments, accurate export and linked context.
- [ ] Flashcards: edit/import cards, flip/keyboard study, shuffle, learning/known progress, restart, AI creation from linked material.
- [ ] Slides: filmstrip, editable positioned content, layouts, reorder/duplicate/delete, speaker notes, presenting and export.
- [ ] Lessons: ordered editable text and embedded tutor interactions, progress, source-grounded generation.
- [ ] Practice tests: editable questions, answer fields, submit/review and retry, persisted attempts, generated questions.
- [ ] Readings: persistent uploaded/text content, selectable passage annotations/highlights, source-aware chat.
- [ ] Universal bidirectional links, course/unassigned organization and correct tags across artifacts/events/tasks.
- [ ] Courses/assignments/calendar/planner: CRUD, consistent dates, reliable import/review, globally unique IDs, retry idempotence, date correction and syllabus access.
- [ ] Persistence: serialize mutations, atomic durable writes/backups, draft recovery, persistent chats/files; existing data preserved.
- [ ] Honest settings, useful home/navigation, local startup, build/type/lint checks and regression tests.
- [ ] Browser acceptance: create/edit/reload each artifact; two-course import; date sync; chat sources/tool actions; exports; restart and recovery.

## Initial evidence

- Supplied xAI key installed in .env.local; authenticated /v1/models confirms grok-4.5.
- tldraw native UI inspected by browser agent; use SDK for parity rather than a partial custom canvas.
- Baseline existing changes: mock-one artifacts/courses, seed script, per-view links/memory JSON. Do not overwrite these.
- Prior static analysis: 14 TypeScript errors, 27 source lint errors; attachment content lost on follow-up; autosave canceled on unmount; assignment IDs restart for each import; APIs missing course/event/assignment editing.

This checklist records scope, not completion evidence. Only mark a row complete after implementation and relevant verification.

## Implementation checkpoint — September 17

Implemented and locally checked:
- Exact `grok-4.5` Responses API streaming, native tool calls/results, goal completion response, attachment upload and durable follow-up context. Synthetic live smoke tests pass.
- Transactional per-view `workspace.json`, serialized writes, atomic replace, retained original JSON, rolling backups, unique import IDs and idempotent application. Concurrent-save/rollback/two-course regression tests pass.
- New artifact workflow for all eight types, course/tags/source links, AI preparation, local PDF/DOCX/text extraction. Imported reading source files remain downloadable. API round-trip/import tests pass.
- Native tldraw with snapshot and image asset persistence, legacy spec migration. Native interaction/reload testing still requires browser access.
- Flashcards: editable/importable/exportable decks, reorder/duplicate/delete, flip, keyboard, shuffle, reverse, starred/learning filters, autoplay, saved progress.
- Practice tests: question editor, separately snapshotted attempts, saved answers, submission/review, honest self-assessment and retry questions needing review.
- Lessons: editable/reorderable text and question blocks, saved reasoning and completion. Embedded model feedback is NOT connected pending approval below.
- Readings: local file/text import, editable source, selected passage quotes, highlighted anchors, editable/searchable notes and exports.
- Slides: filmstrip, layouts, drag/resize/keyboard positioning, text/images/shapes, style controls, layers, undo/redo, slide duplicate/reorder/delete, notes, presenting, print/PDF and editable PPTX export. PPTX structure/content regression passes; browser exports still unverified.
- Documents/notes: serialized debounced saves, browser draft recovery and unmount flush, persistent comments, rendered/editable equations, rendered print/PDF export. Comments/math/text round-trip checks pass.
- Shared artifact shell now permits title, description, course and tag editing. Source/link targets validated. Diagram and slide object context reads canvas text, not only legacy fields.

Verification commands:
- `node --import tsx scripts/check-storage.ts`: passes concurrent writes, rollback, non-destructive migration, import IDs/idempotence and seven editors' persisted fields.
- `node --env-file=.env.local --import tsx scripts/smoke-chat.ts`: passes live synthetic Grok explanation, stored task/tool result and attachment follow-up.
- `node --import tsx scripts/check-artifact-api.ts`: passes all eight create/edit/read routes, workspace isolation, PDF/DOCX/text imports and preserved originals. Requires isolated preview at port 3100.
- `node --import tsx scripts/check-export.ts`: passes editable PPTX text/shapes/background/notes and document text/math preservation.
- `npx tsc --noEmit --incremental false`: passes through current changes.
- Isolated production build passed before the last import/metadata additions; repeat after remaining work. Next patched to 16.3.5; editor dependencies updated compatibly. Two audit findings remain in PPTX's transitive image-size package, which its browser mapping excludes; no forced downgrade applied.
- Newly implemented editors lint clean. Existing source lint issues remain in chat/planner/course setup/settings/shared components; compact list can be obtained through ESLint's JS API.

Open approval / verification limitations:
- The browser tool twice refused the local preview because administrator policy verification was unavailable. Do not bypass it with another browser or indirect mechanism. Root browser runtime is already bootstrapped, tab `monarchTab`; direct retry only after the service issue resolves.
- Automatic approval review rejected adding the lesson tutor endpoint because it sends the answer, lesson and linked private artifacts to xAI. An asynchronous question is pending: include linked lesson context, or question/answer only. No tutor endpoint was written; do not implement dependent egress until answered. The rest of the lesson UI is implemented.
- Native tldraw production-mode license remains a separate requirement; development mode is the current usable target. Do not contact a vendor.

Next work: course/assignment/event CRUD and date consistency; syllabus review and provider configuration; durable chat/history with stop/retry; honest settings and backup/export/restore; source/artifact contextual tutoring once approved; full remaining lint/build and interactive acceptance. Keep personal data and original working-tree changes intact. No commits/pushes.

## Academic editing checkpoint

- Added `academic-store.ts`: transactional assignment/event create/update/delete, course update/removal, strict date/time validation, assignment/calendar deadline synchronization and propagation to nested linked tasks.
- Added mutation routes for assignments, calendar events and courses. Assignment deadline events cannot be deleted independently; clear the assignment date instead.
- Added course editing for identity/contact/term, policies, weekly classes and office hours. Optional explicit schedule rebuild preserves matched occurrence identities, custom events and deadlines; removes dangling links to removed occurrences. Course removal keeps all schoolwork under Unassigned.
- Added assignment/event managers reachable from course pages and calendar. Supports date-only or timed deadlines, status, weight, descriptions and location.
- `scripts/check-academic.ts` passes two-way deadline sync, nested-task dates, invalid dates, recurring schedule identity retention, preserving manual events, preserving tasks on assignment removal and preserving all work on course removal.
- TypeScript and focused academic-editor lint passed. The isolated production build after these changes passes without the earlier broad-filesystem-tracing warnings. `git diff --check` passes.
- Remaining: planner's existing free-text due field can still disagree with dueAt; update its UI/API. Calendar grid items still use existing presentation; management is available via the new Add/edit controls. Course creation still uses prompts; improve that workflow. No browser acceptance is claimed.

## Persistence and review checkpoint

- Added canonical profile/chat collections, migration from earlier snapshots, profile/chat APIs, validation, stale chat-write rejection and view isolation. Settings has saved student fields, actual counts, provider status and JSON records export. Removed fictional billing/nonfunctional key generation. Profile name/school feed shared view context.
- Main chat keeps browser drafts and debounced disk copies, merges recovered history, surfaces sync failures and offers stop/continue. Late responses/titles cannot overwrite another open conversation. Home refreshes history after disk hydration. Document-side chat still needs equivalent recovery/stop controls; cross-tab conflict merging remains incomplete.
- Planner uses real date/time input and dueAt, clears obsolete date labels and retains course reassignment after normalization. Removing a task cleans descendant links while preserving linked artifacts.
- Syllabus review supports title/weight/date/time correction and source quotes. Applying a proposal reconciles deadlines and nested task dates and rejects invalid dates/weights before commit. File selection explicitly accepts one PDF/image; progress reflects actual steps. Oversized recurrence ranges do not expand centuries of events.
- Automatic approval review rejected the Grok syllabus extraction patch because syllabi can contain private academic/contact information. No part of that provider patch was applied. A separate asynchronous approval question is pending; legacy Anthropic extraction remains. The earlier lesson-context approval is also pending.
- Whiteboard edits capture browser drafts immediately; the shared saver debounces network writes. One-node legacy diagrams render. Legacy regeneration rejects diagrams with native whiteboard content to preserve drawings and avoid misleading spec/snapshot divergence.
- New check-workspace-extras, check-workspace-api and check-syllabus-review scripts pass migration/concurrency/stale-write/isolation, API/export round trips, planner date/course fixes, nested link cleanup, review synchronization and invalid-import rollback. Existing storage/academic regressions pass. Latest production build and focused lint pass.
- Browser retry still fails because admin policy verification is unavailable. No alternate browser workaround was used. Interactive acceptance remains outstanding.
- Replaced starter README with startup, schoolwork, backup and verification instructions. No commits/pushes.

Next: artifact/object management, document-side chat recovery, remaining harness/search gaps, backup/restore and conflict handling, remaining baseline lint findings, pending provider approvals and browser acceptance. Goal remains active.

## Document chat and full backup checkpoint

- Document-side chat is now controlled by the document workspace and saved through its existing serialized artifact saver. It survives closing/reopening, restores browser drafts, retains attachment IDs on follow-up, shows attachment names, aborts on close/unmount, and supports stop/continue. A request identity guard rejects stale callbacks.
- Document typing and thread changes use separate patch fields in one save queue. A model response arriving after newer typing keeps the student's draft and offers the model version separately. Applying either version persists it to reconcile queued writes. Server-side revision conflicts across independent tabs remain future work; no browser interaction acceptance is claimed.
- Main/document chat share inline equation, emphasis, code and source-link rendering. MathText accepts dollar and LaTeX parenthesis/bracket delimiters. Streaming animation no longer reads a ref during render.
- Added gzip full-workspace backups, including original source documents, chat files and whiteboard assets. Restore validates view/version/file paths/integrity, previews counts, requires an explicit REPLACE confirmation, retains current records in a snapshot, and preserves existing files. Uploads restore into a unique folder; conflicting immutable attachments reject before records change. Limit: 256 MB expanded / 10,000 files, with whole-data-folder copy documented for larger workspaces.
- Restore clears this browser's stale artifact/chat drafts before reload. Native whiteboard IndexedDB persistence was removed in favor of the already implemented immediate recovery draft + canonical server snapshot, preventing hidden stale SDK caches from reappearing after restore. tldraw itself still supplies the complete editor UI.
- check-backup passes complete restoration, source/attachment usability, preserved prior work, wrong-view rejection, path traversal, corruption and file conflicts. check-workspace-api passes backup download/preview/required confirmation/restore against the isolated preview. check-storage now checks concurrent document typing and attachment-bearing chat saves; all storage regressions pass.
- Focused lint and type checks passed; combined build passed. Broad runtime-data tracing warnings identified in the new backup module were addressed with the same Turbopack runtime-path annotations used by the store; final build result recorded in conversation. Remaining full-source lint findings are chiefly pre-existing state-in-effect patterns.
- Lesson/syllabus provider approvals and browser-policy access remain pending. No commits/pushes. Goal remains active; next priorities include artifact lifecycle/metadata management and remaining harness behavior.

## Artifact management and task creation checkpoint

- Added library management for every artifact: metadata editing, course filtering, duplication and recoverable Trash. Copies retain content/source links and start fresh study/chat state. Trash preserves files and linked tasks; restoration reconnects surviving links without replacing a task's newer artifact choice. Relationships between two trashed artifacts survive restoring them in either order. Trashed IDs/slugs stay reserved so stale editor writes cannot hit a newly created artifact.
- Added optional `trash` collection migration and compatibility with backups made before this collection existed. Lifecycle route and all eight kinds pass helper and API round-trip checks; full backup regression still passes. One-node diagram normalization was fixed after copy tests exposed an inconsistent blank-board default.
- Course lists now use explicit term end dates for Active/Past filtering, removing fixed 2026 labels that hid genuine imported courses. Renamed Join course to Add course and surfaced course creation/review errors inline.
- Added task/event tag pickers and task tag editing. Explicit empty tag arrays remain empty through normalization, and assignment date/title changes preserve chosen event tags. Academic regressions verify this independence.
- New-task creation now uses a real date/time picker. Its previously inert attach-file button imports PDF/DOCX/text locally, retains originals, creates a linked reading in the selected course and creates the task in one transaction. Concurrent retry IDs return the existing task; invalid task data rolls back records and removes the unused upload. Existing primary artifact choices are preserved. Task details now include the universal linked-objects panel.
- check-task-source and the multipart API checks pass original-file preservation, usable reading content, atomic rollback and idempotent retries. No live personal data was used in these tests. API/storage tests continue to use temporary roots and the isolated preview.
- Remaining: multi-tab content conflict handling; remaining harness/search/model-routing behavior; metadata controls directly within full-screen editors if needed; baseline lint cleanup; contextual lesson/syllabus connections pending explicit approvals; browser acceptance and production tldraw licensing. Goal remains active. No commits/pushes.

## Conflict protection, task identity and research checkpoint

- Artifact PATCH now supports field-level comparisons inside the existing write transaction. Different-field edits coexist; stale same-field changes return 409 with the saved artifact and conflicting fields. The shared saver keeps a durable browser draft and pauses on conflicts, with explicit saved/local choices and draft download. Recovered drafts preserve their comparison base; legacy drafts require review. Editors remount on artifact identity changes. Library metadata uses the same conflict response.
- Document and study editing tools remember artifacts read during the current run, require a read before mutation, and compare their changes against that read before saving. Synthetic tests cover stale edits, simultaneous writers, reviewed retries and preservation of unrelated fields.
- Task metadata now comes from saved assignments/artifacts rather than seed names. Both pickers select stable IDs and display course labels. Assignment IDs survive creation/update, artifact renames display correctly, and clearing a selection removes both its ID and label. Ambiguous legacy artifact titles no longer choose an arbitrary match.
- Task detail refreshes preserve unsaved text. Portals use stable hydration snapshots; task menu state is derived or changed by interaction instead of reset effects. Chat history now exposes stable external-store snapshots and notifies subscribers on saves, renames and active-chat changes. Linked-object loads cancel obsolete requests and surface network errors.
- All source lint errors/warnings are resolved. Narrow documented exceptions remain for guarded hydration, a submitted request carried across navigation, and asynchronous external reads; lint rules are not disabled globally.
- Added Grok 4.5 native web research as the fallback when Tavily/Brave are absent, with provider-verified URL citations, completed/search-call checks, public scholarly/PDF search and cancellation. The Study and Research composer toggles now affect requests, including retries and document chat. Library search truthfully identifies its public-web scope. Model-preference tools no longer pretend to switch the active model.
- Public-source references: https://docs.x.ai/developers/tools/web-search and https://docs.x.ai/developers/tools/citations. The supplied model remains pinned to `grok-4.5`.
- Passing checks: check-artifact-conflicts, check-task-links, check-chat-cache, check-web-research, storage and academic/task-source regressions, all-eight artifact API checks including conflict responses, workspace/task-metadata/backup APIs, TypeScript and full-source ESLint. Live synthetic native web search and integrated Study/Research harness tests returned NASA citations using Grok 4.5.
- Browser access retry was rejected again because the admin-enforced policy could not be verified. No browser workaround was used. The two private-data transfer approvals remain unanswered; no rejected lesson/syllabus provider changes were applied. No commits or pushes.
- Final combined production build passed after the research/composer changes; TypeScript and full-source lint pass. Remaining acceptance work requires restored browser access and answers to the pending lesson/syllabus approvals. Production tldraw licensing is separate from today's development-mode use. Advanced automatic Haiku routing and authenticated school-library access are not implemented; model preference reporting and public research do not claim those capabilities.

## Approved syllabus and lesson integrations

- The user approved both previously blocked xAI transfers. No additional approval is needed for these flows. Grok 4.5 now reads selected PDF/image syllabi through native file/image input and returns structured course, assignment, schedule and planning results to the existing review/apply workflow. Old Anthropic file IDs are not reused with xAI. The alternate extraction helper also uses Grok. Source instructions remain untrusted, and uncertain facts are marked for review.
- Lessons now have Get feedback and Stop controls. Requests include the selected lesson question, current reasoning, lesson/course context and up to ten directly linked artifacts within a bounded text budget; unrelated artifacts are excluded. Returned feedback saves through the existing artifact saver. Answers remain editable while waiting; stale or stopped responses cannot attach to changed questions/answers. Editing a question clears outdated feedback and completion while retaining the student's answer.
- Tests passed with synthetic material: bidirectional linked-context selection and exclusion of unrelated records, changed-question/empty-answer rejection, live Grok tutoring, PDF extraction of course/term/assignment dates and weights, proposal remaining unapplied until review, successful application, and native PNG syllabus extraction. Tutor API checks pass malformed input, missing questions, workspace isolation and malformed import requests. Existing syllabus review/date-sync regression passes.
- Production build, TypeScript and full-source lint pass. Browser retry still fails because its administrator-policy check is unavailable; no workaround was used. No commits or pushes.

## Screenshot refinement pass

- Initial home-to-chat submissions now wait until the mount effect settles before consuming the pending message. React Strict Mode cleanup no longer consumes and aborts the first request. New chat resets the composer instance and save-status state, hides old save status while empty, and uses a fresh-question placeholder. Browser reproduction of the original interruption is still pending.
- Added a shared linked-objects sidebar with pin/unpin controls, open by default in document/notes pages, document overlays, whiteboards, and the shared artifact shell. Slides also start with linked context visible. Document editor width is constrained so its horizontally scrolling toolbar cannot push the sidebar off-screen.
- Flashcards normalize incomplete or null study progress before rendering/recovering drafts. Empty and populated decks render in the regression check. Cards now have distinct front/back faces, a reduced-motion-aware flip, stable height, visible term/definition labels, and accessible flip state. The precise reported error remains unconfirmed: the supplied screenshot only shows an error badge; the user has been asked for the error text.
- Lessons render headings, lists, emphasis, quotes, code, links, and equations safely instead of showing Markdown punctuation. Explanation sections use a quieter reading layout; questions and tutor feedback remain visually distinct. AI creation shows a centered animated skeleton with reduced-motion support while controls are inactive.
- Readings with an original PDF render its actual pages through PDF.js, with page selection, fit-width/zoom, and selectable passages that fill the annotation quote. Original files, existing notes and the extracted-text/highlight view remain available. PDF visual/text-selection acceptance is pending browser access.
- Slides support double-click (or Enter on a focused text element) to edit directly on the canvas. Escape/blur exits editing; text edits use the existing autosave and undo history. Drag handling is disabled while editing text.
- Replaced the licensed tldraw UI with Excalidraw 0.18.1 (MIT; https://github.com/excalidraw/excalidraw/blob/master/LICENSE), following its documented initialData/onChange/restore APIs. Fonts are served locally. Pages, drawings and embedded images save in the canonical artifact and browser recovery draft. Drawing backup/restore and native exports are available. Old tldraw snapshots remain untouched and downloadable. Legacy conversion preserves basic geometry, text, groups, page coordinates, pen strokes, connectors and images; unsupported geometry/media, curved arrows and crops have explicit conversion notices. This is not pixel-for-pixel tldraw parity. The old SDK UI and its license configuration are no longer used.
- Verified: `check-refinements.tsx`, `check-chat-cache.ts`, full-source ESLint, `git diff --check`, and the final production build/type check. Synthetic isolated-server checks verify new whiteboard pages save/reload, malformed input rejects, stale edits return conflicts, the PDF worker and font routes return content, and invalid font paths reject. An initial worker-path issue was found by the endpoint check and fixed before the final pass.
- Outstanding: browser interaction/visual checks, reproduction of the exact flashcard error, and any corrections those reveal. The approved Browser tool still rejects access because its admin-enforced policy cannot be verified; no indirect browser workaround was used. No commits or pushes.

### Refinement verification follow-up

- Rechecked the current canvas and PDF viewer implementation. The Browser tool again rejected the same isolated local URL because administrator-policy verification is unavailable.
- Fixed two source-confirmed edge cases: drawing backups now reject malformed image records, duplicate element IDs and unsupported element types before opening/saving; PDF page input clamps to a whole page so fractional values cannot trigger a renderer failure.
- The refinement regression passes with new malformed-backup fixtures. Browser acceptance and the exact flashcard error remain unresolved; the previous green build and these focused checks do not prove either of those browser requirements.
