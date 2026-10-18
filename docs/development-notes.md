# Development notes

## Foundation

- Figma geometry, semantic tokens, and Lucide icon identities carry into the implementation.
- Components follow reusable responsibilities; layout frames remain HTML.
- Download includes every active staff row, all eight columns, and explicit TRUE/FALSE values.
- Native table semantics are intentional: the displayed saved snapshot is not an editable ARIA grid.

## CSV workflow

- File guards run before parsing. Structure/date failures precede collected staff/value/shift corrections.
- Existing blanks and missing fields remain distinct; invalid values are retained for error messages.
- One shared validator serves import and the atomic mock store. Split-shift errors take precedence.
- The loaded snapshot changes only after a complete commit; download uses it directly.
- Coverage is calculated after save and grouped by adjacent equal counts. A later rejection retains prior saved warning columns.
- The session is independently testable; checking and applying keep the previous grid and timestamp visible.
- Seven example CSVs reproduce the implemented states and run in the automated workflow tests.
- File policy choices are UTF-8, a .csv extension, a 1 MiB limit, exact headers, and no extra columns. Keep these choices documented when the specification is finalized.
- Error focus and successful live announcements are implemented; reported browser and screen-reader checks are recorded in accessibility.md.

## Recovery milestone

- Explicit screen/store revisions and an atomic stale-revision check implement conflict rejection.
- The asynchronous gateway models committed and uncommitted lost responses with the same UI outcome.
- Reload/retry only load data. No upload is replayed, and pending recovery rejects duplicate actions.
- A failed reload removes the displayed snapshot and timestamp; the retry view matches the load-error design.
- The recovery notice remains visible until the next upload attempt. It does not promise CSV provenance protection.
- README scenario URLs make each operational outcome reproducible without adding controls to the Figma screen.
- Header and notice content stay outside the table scroller. Explicit containment addresses page-wide overflow while preserving readable time columns and keyboard scrolling.
- Focused system headings and linked descriptions supplement polite progress announcements. Reported recovery and screen-reader checks are recorded in accessibility.md.
- On 18 October 2026, npm run check passed with Next.js 16.3.8, including lint, type checking, all 32 tests, and the production build.

## Release verification

- The final Figma review was completed on 18 October 2026. The reviewed daily-shift screens, example schedules, component states, and accessibility annotations match the agreed implementation scope.
- The portfolio specification sample has been aligned with the demonstrated CSV format, saved-value export, and recovery semantics. Its broader API contract and database responsibilities remain outside this implementation.
- On 18 October 2026, npm audit --omit=dev reported zero vulnerabilities. The full audit still reported five high-severity entries in the development-only ESLint dependency chain rooted in braces.
