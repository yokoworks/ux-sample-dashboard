# Accessibility implementation and verification

## Implemented behavior

- English document language, header/main landmarks, one page heading, and a keyboard-visible skip link.
- Native named buttons with visible focus indicators; whole-day replacement guidance associated with Upload.
- Radix Dialog provides modal focus containment, accessible title/description, Escape dismissal, and trigger focus restoration.
- Native file selection; cancelling preserves state and the same file can be selected again.
- A table named by its visible heading through `aria-labelledby` with column and staff row headings, plus text alternatives for every scheduled/unscheduled cell.
- A focusable, named horizontal scrolling region for narrow viewports.
- Checking and applying block the action controls. Upload uses `aria-disabled` and an activation guard so it can retain focus after the file picker; other unavailable controls remain natively disabled. The saved table remains readable.
- Upload progress and completion share one persistent `role="status"` region with explicit polite and atomic semantics. Pending announcements are cancelled when the state changes. A progress stage is announced only if it lasts at least one second; completed results are published 100 ms after the committed UI update. These delays are implementation choices, not WCAG requirements.
- The Upload button's visual busy state uses `data-busy`; its `aria-busy` is explicitly false because progress is conveyed by the status region. Its visible and accessible name remains `Upload CSV` during checking and applying, and its description remains associated with the whole-day replacement note. The spinner, disabled appearance, result panel, and nearby wait guidance still convey processing. Keeping the name and description stable does not guarantee that assistive technology will suppress repeated button announcements.
- Blocking and correction results focus their heading, associated with the saved-schedule outcome. The issue list follows in reading order. There is no duplicate live error announcement.
- Conflict and unknown results focus the result heading, associated with its outcome and recovery guidance. Reload is the next focusable control.
- Help stays enabled during conflict, unknown, reload, and load failure. Upload/Download remain visible with a nearby disabled reason.
- Successful recovery focuses the information heading, which is associated with persistent recovery guidance. Initial-load recovery focuses the page heading. The load-error view requests focus on its retry-view heading, including when mounted as the initial fixture. On initial page load, the screen reader may begin at the page heading instead; DOM focus and the screen reader's reading position are not the same guarantee. The error and Try again control remain available in reading order.
- The out-of-date grid keeps its normal contrast and adds a text banner. The banner and table title remain readable without horizontal scrolling.
- The table scroll region uses an inset focus outline within the clipped card.
- Successful outcomes and their coverage warnings are sent together to the status region without programmatic focus movement. Each message is inserted into the already-mounted region as a new text-bearing child after a separate empty update, including repeated identical results. Polite notification delivery may follow existing speech; the implementation does not promise speech simultaneous with the visual update.
- Coverage columns include text and icons alongside their warning tint. Bars use system colors in forced-colors mode. Progress animation respects reduced motion.

## Verification record — 16 October 2026

Manual checks were reported on macOS 26.6.1 (25G76), with Safari 27.0 (21625.1.29.18.28) and Chrome. The Chrome version was not recorded.

- Safari with VoiceOver: page headings and controls, table naming, staff/hour context, and scheduled/not-scheduled cell text. Repeated row or column context need not be spoken on every cell movement.
- Safari with VoiceOver: keyboard focus visibility, CSV dialog reading and focus containment, initial title focus, and return to the trigger after Escape or Close.
- Safari with VoiceOver: correction-result heading, unchanged saved outcome, and all four correction details.
- VoiceOver recovery checks: conflict, unknown committed result, failed reload/retry, and the recovery notice and its guidance were reported as passed. The browser was not separately recorded for each recovery check.
- Initial load-error check: the error and Try again were reachable from the initial reading position; retry restored the page heading and enabled CSV actions without a post-upload recovery notice.
- Chrome and Safari with VoiceOver: the warning upload's completion notification and coverage details were confirmed without manually navigating to the result panel.
- Chrome at 200% and 400% zoom: surrounding content and controls remained readable and usable, the table scrolled internally, and the CSV dialog remained usable.
- Chrome forced-colors emulation: shift bars, button boundaries, keyboard focus indicators, and textual warnings remained distinguishable.
- Chrome reduced-motion emulation: processing icons did not rotate, and processing and completion states remained available.

Source-color calculations found at least 4.5:1 contrast for the checked active text/background combinations; the lowest checked combination was the success heading at approximately 4.79:1. Shift bars exceeded 3:1 against both ordinary and warning cell backgrounds. This is a source-level color check, separate from rendered-browser verification.

### Notification behavior

Successful updates and their coverage warnings are announced through a persistent polite live region without moving focus. Completion delivery was confirmed in the reported Chrome and Safari checks. Polite announcements may follow existing speech rather than interrupt it immediately.

### Verification scope

These results cover the listed scenarios and environments, not a claim of complete WCAG conformance. Forced colors and reduced motion were checked through Chrome emulation. Longer-running progress notifications and delayed-message cancellation are covered by automated timer tests; long-running real network operations are outside this in-memory demo. See [manual-checks.md](manual-checks.md) for repeatable acceptance steps.
