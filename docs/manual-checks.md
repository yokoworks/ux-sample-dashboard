# Manual acceptance checks

Run `npm ci` and `npm run build`, then `npm start` and open the URLs below. If a previous server is running on the same port, stop it first. Use `public/examples/success.csv` unless another file is specified. Browser refresh resets the in-memory demo, so use the screen's Reload/Try again actions during recovery. These are repeatable procedures; reported results are recorded separately in accessibility.md.

## Narrow viewport regression

1. Open the normal route at a 320 px viewport and refresh while narrow.
2. Confirm the content fills the viewport with 16 px side margins and no large right-hand blank area or automatic page shrink.
3. The document's `scrollWidth` should match its `clientWidth` (allow a 1 px rounding difference). The table scroller should have a larger `scrollWidth` than its own `clientWidth`.
4. Scroll inside the table to 16:00–17:00. The page title, actions, result panel, table title, and recovery banner must stay in place.
5. Focus the table scroller with Tab and use the arrow keys. Its inset focus indicator must remain visible.
6. Repeat after uploading `warnings.csv`, `corrections.csv`, and while viewing a conflict. Widen and narrow the viewport again, then reload while narrow.

## Conflict

Open `http://localhost:3001/?scenario=conflict` and upload `success.csv`.

- The result says the schedule changed and this attempt did not change it. David remains off duty in the displayed old grid.
- The result heading receives focus. Tab moves to Reload. The grid has an out-of-date banner without faded content.
- Upload and Download are disabled; CSV format still opens and closes normally.
- Activate Reload. The old grid and timestamp remain while loading. Duplicate activation must not start another operation.
- After reload, David works 12:00–15:00 and the timestamp advances. The persistent information notice appears and receives focus.
- Download contains David's midday shift. Upload and Download are enabled again. No automatic upload occurs.

## Unknown result: both possible saved outcomes

Open `http://localhost:3001/?scenario=unknown-committed`, then upload `success.csv`.

- The result says the update could not be confirmed and Saved schedule is Result unknown. It must not say Not changed or Upload complete.
- The old grid/time remain, the out-of-date banner appears, and only help and Reload are usable among the relevant actions.
- Reload reveals David's uploaded 09:00–12:00 shift. Download matches that saved result.

Repeat with `http://localhost:3001/?scenario=unknown-not-committed`.

- Before reload, the same uncertainty is shown.
- Reload reveals the original schedule: David is still off duty and the original timestamp remains. The latest-loaded notice is still appropriate.

Optionally use `warnings.csv` with the committed scenario: reload should reveal the saved warning columns without requiring a second upload.

## Reload failure and retry

Open `http://localhost:3001/?scenario=reload-failure` and upload `success.csv`.

1. The conflict appears. Activate Reload.
2. The first reload fails: the grid and timestamp are absent, replaced by The schedule could not be loaded and Try again.
3. Upload and Download stay disabled; help remains usable. Focus is on the load-error heading.
4. Activate Try again. It only retries loading. On success, David works 12:00–15:00, the recovery notice appears, and both CSV actions are enabled.

## Initial load failure

Open `http://localhost:3001/?scenario=load-error`.

- No table data or last-updated timestamp is shown. CSV actions are disabled and help is enabled.
- With VoiceOver enabled before navigation, the initial reading position may be the page heading. Following the reading order must expose the load-error message and Try again; the first spoken text is not required to be the error heading.
- Try again restores the initial Ready view and actions. No post-upload recovery notice appears because no upload occurred.
- After a successful retry, the page heading receives focus.

## Successful upload notification

1. Enable VoiceOver and upload `warnings.csv` from the normal route.
2. Confirm Upload retains its `Upload CSV` label during processing and cannot start another upload. Processing remains visible in the result panel and spinner.
3. Without navigating to the result panel, listen for `Schedule updated with warnings` and the coverage details. Polite notification delivery can follow existing speech rather than interrupt it at the visual update.
4. Distinguish the button description beginning `Uploading replaces…` from an actual checking/applying notification. Confirm that the completed result and coverage details are announced without manually moving to the result panel.

## Display preferences

- At 200% and 400% browser zoom, check readable, operable headings, descriptions, actions, and CSV help. The table can scroll internally; surrounding content must remain usable without page-wide horizontal scrolling.
- In Chrome's Rendering panel, emulate `forced-colors: active`. Check shift bars, button boundaries, focus indicators, and warnings conveyed through text. Restore `No emulation` afterwards.
- Emulate `prefers-reduced-motion: reduce`. Processing icons must stop rotating while processing and completion remain visible. Restore `No emulation` afterwards.

## Retained behavior

On `http://localhost:3001/`, run success, corrections, and warnings again. Rejected local files must preserve the last saved table, timestamp, and downloadable values. A cancelled file picker does nothing. The same file can be selected again.

## Verification boundary

These are manual acceptance steps, not an assertion that they have already passed. Automated tests cover the state/store invariants; browser rendering, focus visibility, and assistive-technology output need their own checks.
