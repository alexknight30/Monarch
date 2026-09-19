# Monarch visual design editor

Start Monarch with `npm run dev -- --hostname 127.0.0.1`, then open your normal local app. The **✦ Design** button is at the bottom right. It appears only in development.

## Editing

1. Navigate to the page or open the dialog you want to design, then click **Design**. App navigation and form actions are paused while you edit.
2. Click an element. Use **Select parent** for its containing card or section, or **Layers** to find an element underneath another. Drag the inspector header to position it anywhere, use its left/right dock buttons, or use the pin button to collapse it to a compact edge tab. Click the tab to reopen it. Panel position and pin state are remembered on this browser. Toggle **Inspector** to hide/show it. Clicking a selection without dragging drills into its children.
3. Drag the selected area or its purple label to move it. Eight handles resize it. Arrow keys nudge by 1px; Shift + arrows nudge by 10px. Drag with Shift to constrain movement; Alt temporarily disables the 4px snap.
4. Change properties in the inspector. Enter commits a field; leaving the field also commits it. Dimensions accept CSS units, and bare numbers become pixels. Clear a property to inherit the original style.
5. Use **Earlier/Later** to reorder a card within a flex/grid container. Free movement uses a visual offset and retains the original layout space; choose absolute positioning and top/left if you intentionally want it outside normal flow. Parent overflow still controls clipping.
6. Static UI labels have a text editor. Labels use the page/shared template scope, Normal state, and All sizes. Actual course names, document contents, chat messages, and other live data remain owned by Monarch's existing content editors.
7. **Save** writes the design to the repository. **Done** offers Save & exit, Discard, or Keep editing when changes are pending. Navigate to the next page, then reopen Design.

**⌘/Ctrl S** saves; **⌘/Ctrl Z** undoes; **⌘/Ctrl Shift Z** redoes. Escape clears the selection, then requests exit. Undo/redo works across saves during the current session.

## Scope and responsive design

- **This item on this page** targets a stable item identity (for example, one course card). This is the default when a stable item identity is available.
- **This page's template** applies to matching instances of that source element on the current pathname. The inspector shows how many currently match.
- **Shared across pages** explicitly changes every matching use of that source identity. Other page-specific rules can still override it.
- **Screen size** targets all sizes, mobile below 640px, tablet 640–1023px, or desktop at 1024px and above.
- **State** targets normal, hover, or keyboard focus. The selected state is temporarily forced while editing so you can inspect it.
- **Preview** opens read-only phone/tablet/desktop frames using the current unsaved design. The narrow frames can expose pre-existing fixed-width page layouts; adjust widths and layout rules as needed.

The page boundary is its pathname. Tabs and dialogs within that pathname share its design scope. The editor pauses their normal controls; open the desired state before entering Design. Browser navigation or another unexpected route change ends the editing session rather than carrying its selection to the new page.

## Persistence and recovery

The source of truth is `src/design/overrides.json`. This is imported by the app, tracked in Git, and applied in production as well as development. It contains page/instance/breakpoint style rules and UI copy overrides. It is not browser-only styling and does not require leaving the editor open. Original Tailwind classes remain as the defaults; clearing an override reveals them.

Stable `data-design-id` attributes in JSX connect the rules to source elements. `DesignCopy` renders static UI copy without adding a DOM wrapper. Stable `data-design-key` attributes distinguish repeated records. Copying or refactoring an instrumented element should preserve its ID only when it is the same element; a second element needs a new ID.

After adding components, run `npm run design:scan` to instrument new supported JSX elements. The scanner is idempotent and stops before writing if it finds duplicated source identities. It covers native DOM nodes, motion DOM nodes, Next Link, and the app's Button/Card/IconButton/PlatedButton call sites. Third-party canvas internals remain owned by their editors; their surrounding app UI can be styled.

Each save checks the source revision, rejects stale writes, and writes atomically. A conflict leaves the current preview intact; export it if needed, then use **Changes → Reload saved changes**. Unsaved same-revision drafts recover from this tab's session storage when Design reopens.

The previous 50 save snapshots live in `.design-history/` (ignored by Git). **Changes → Recovery snapshots → Preview recovery** loads one into the preview; inspect it and Save to restore. Undo reverses the recovery preview. **Reset this page** removes the current pathname's rules while leaving shared rules intact. Save commits that reset.

The save API is development-only, restricted to loopback hosts, and requires matching Origin and a custom request header. Production applies saved designs but refuses editor API access. No provider/AI requests are required for designing or saving.

## Verification

- `node --import ./node_modules/tsx/dist/loader.mjs scripts/check-design.ts`
- `node scripts/check-design-instrumentation.cjs`
- `npx tsc --noEmit --incremental false`
- `npm run lint -- src`
- `MONARCH_DIST_DIR=.next-build npm run build`

The implementation has passed compilation, full-source lint, save-engine regressions, existing UI rendering regressions, and local API persistence/conflict/origin tests. Interactive browser acceptance is still pending because the approved Browser tool cannot verify its administrator policy. Do not interpret these checks as proof that drag/resize/selection and all page states have been visually verified.
