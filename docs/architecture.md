# Architecture decisions

## Follow design responsibilities

Reusable Figma responsibilities map to React components. Typed props represent variants. Layout frames become semantic HTML rather than separate components for every layer: cells become `td` or `th`, and the visible schedule heading names the table through `aria-labelledby`. The heading and out-of-date banner sit outside the horizontally scrolling region. ResultPanel shares ResultItem presentation across outcomes.

## Separate candidate input, mock storage, and the loaded snapshot

The upload session owns an immutable loaded snapshot and a result state. File reading and pure CSV import produce a candidate. The mock store independently revalidates that candidate and replaces all rows atomically. A confirmed commit replaces the loaded snapshot and reveals coverage warnings. A successful reload also replaces the loaded snapshot with the saved version returned by the gateway. Rejection leaves its values, timestamp, and warning columns unchanged; a failed reload removes the untrusted displayed snapshot and presents the designed retry view.

Download serializes the loaded snapshot without querying another source. Processing guards exist in both UI actions and the session, so rapid duplicate submissions cannot initiate a second operation. The session exposes stable snapshots through `useSyncExternalStore`; the same workflow can be tested without mounting React.

## Keep business rules independent of presentation

The domain layer owns active-staff completeness, unique IDs, boolean values, continuous-shift validation, and coverage grouping. CSV parsing and import live in `lib/csv`. The client path and mock store share `validateSchedule` to avoid rule drift. CSV cells are never executed or inserted as HTML.

## Make mock boundaries explicit

The store is in memory per mounted screen: no database, network endpoint, authentication, or cross-tab synchronization. Browser refresh returns to the initial fixture. Checking and applying have short illustrative delays. Each commit increments an internal revision and advances the illustrative timestamp by one minute.

The mock gateway has an asynchronous `apply(candidate, expectedRevision)` / `load()` boundary. The atomic store rejects stale revisions before replacement and revalidates the candidate. Conflict fixtures actually commit a separate editor's change first, then submit the stale client revision. Lost-response fixtures either commit or do not commit before rejecting the promise; the UI receives identical uncertainty in both cases.

The session holds a separate loaded revision. Transport uncertainty never triggers a retry. Data actions use the same availability rule in the UI and session. Reload acquires a fresh schedule/revision; a failed reload stores `null` for both so there is no exportable snapshot. Retry only repeats loading. Scenario flags are one-shot, activated by documented URL query values, and are never inferred from the CSV filename.

The screen revision does not solve CSV provenance: the file itself has no revision field. A user can explicitly submit an old CSV after reloading. The recovery notice explains how to transfer edits; it does not technically invalidate old files.

## Use primitives at interaction boundaries

Radix Dialog handles modal interaction. Buttons and table cells use native HTML. Button forwards its ref and native properties so Radix `asChild` preserves focus and naming. Error summaries receive focus; progress and successful outcomes use a persistent polite live region. Color is accompanied by text and icons.

## Keep fixture rendering deterministic

The example date and timestamp are data. Formatting uses an explicit locale and time zone to avoid hydration differences. The roster comes from the loaded snapshot, not a hardcoded number of people. Coverage messages derive from the saved values, including grouped warnings for an all-off-duty day.

## Contain table overflow locally

The schedule card has explicit width/max-width constraints and clips descendant overflow. The inner scroller has inline-size containment and its own horizontal overflow. The table retains its readable minimum width. The visible title and recovery banner remain outside the scroller. Focus outlines for the scroll region are inset so the clipped card does not hide them. No body-level overflow suppression or viewport scaling override is used.
