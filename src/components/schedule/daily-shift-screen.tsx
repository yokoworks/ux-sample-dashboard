'use client';

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import type { SavedSchedule } from '@/domain/schedule';
import { formatDay, formatUpdatedAt } from '@/domain/format-date';
import { exportScheduleCsv } from '@/lib/csv/export-schedule';
import { ShiftTable } from './shift-table';
import { UploadBar } from './upload-bar';
import { ResultPanel } from './result-panel';
import { createUploadSession } from '@/lib/upload/session';
import { canUseSchedule, needsReload } from '@/domain/upload';
import type { DemoScenario } from '@/lib/mock/schedule-gateway';
import { formatPeriod } from '@/domain/validate-schedule';
import { scheduleStatusAnnouncement } from '@/lib/a11y/status-announcement';

export function DailyShiftScreen({
  schedule: initialSchedule,
  scenario = 'normal',
  demoNotice,
}: {
  schedule: SavedSchedule;
  scenario?: DemoScenario;
  demoNotice?: ReactNode;
}) {
  const [session] = useState(() =>
    createUploadSession(initialSchedule, { scenario }),
  );
  const snapshot = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getServerSnapshot,
  );
  const { schedule, result, coverageVisible } = snapshot;
  const date = initialSchedule.date;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousResult = useRef(result.kind);
  useEffect(() => {
    if (previousResult.current === 'reloading' && result.kind === 'ready')
      headingRef.current?.focus();
    previousResult.current = result.kind;
  }, [result.kind]);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadButtonRef = useRef<HTMLButtonElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const restoreUploadFocus = useRef(false);
  useLayoutEffect(() => {
    if (result.kind === 'checking' && restoreUploadFocus.current) {
      restoreUploadFocus.current = false;
      // Restore a stable target after the picker, including uploads from a result action.
      uploadButtonRef.current?.focus({ preventScroll: true });
    }
  }, [result.kind]);
  const [announcement, setAnnouncement] = useState('');
  const processing =
    result.kind === 'checking' || result.kind === 'applying'
      ? result.kind
      : null;
  const progressAnnouncement =
    result.kind === 'checking'
      ? 'Checking the CSV file.'
      : result.kind === 'applying'
        ? `Applying the schedule for ${formatDay(date)}.`
        : result.kind === 'reloading'
          ? 'Reloading the saved schedule.'
          : '';
  const completionAnnouncement =
    result.kind === 'applied'
      ? [
          `Schedule updated${result.warnings.length > 0 ? ' with warnings' : ''} for ${formatDay(date)}.`,
          ...result.warnings.map(
            (item) =>
              `${formatPeriod(item.start, item.end)}: ${item.count === 0 ? 'No one is scheduled' : 'Only 1 person is scheduled'}.`,
          ),
        ].join(' ')
      : '';

  const statusMessage = completionAnnouncement || progressAnnouncement;
  // Short intermediate stages stay visual; announce a stage only if it is still current.
  // Final results are published after the completed UI has committed, without moving focus.
  const statusDelay = completionAnnouncement ? 100 : 1000;
  useEffect(() => {
    const region = statusRef.current;
    if (!region) return;
    return scheduleStatusAnnouncement(
      (message) => {
        // React owns the persistent region; this effect owns only its message node.
        region.replaceChildren();
        if (message) {
          const text = region.ownerDocument.createElement('span');
          text.textContent = message;
          region.append(text);
        }
      },
      statusMessage,
      statusDelay,
    );
  }, [statusMessage, statusDelay]);

  function chooseFile() {
    if (canUseSchedule(session.getSnapshot())) inputRef.current?.click();
  }

  function downloadSchedule() {
    const current = session.getSnapshot();
    if (!canUseSchedule(current) || !current.schedule) return;
    const url = URL.createObjectURL(
      new Blob([exportScheduleCsv(current.schedule)], {
        type: 'text/csv;charset=utf-8',
      }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `shift-${date}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setAnnouncement('CSV download started.');
  }

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to schedule
      </a>
      <header className="app-header">
        <div className="page-container flex flex-wrap items-center gap-2 text-sm leading-5">
          <span className="font-semibold">Linden Bakery &amp; Café</span>
          <span aria-hidden="true" className="text-text-secondary">
            /
          </span>
          <span className="text-text-secondary">Staff schedule</span>
        </div>
      </header>
      {demoNotice}
      <main
        id="main-content"
        tabIndex={-1}
        className="page-container main-content"
      >
        <div className="page-heading">
          <h1 ref={headingRef} tabIndex={-1}>
            Daily shift — {formatDay(date)}
          </h1>
          {schedule && (
            <p>
              Last updated{' '}
              <time dateTime={schedule.updatedAt}>
                {formatUpdatedAt(schedule.updatedAt)}
              </time>
            </p>
          )}
        </div>
        <UploadBar
          onDownloadAction={downloadSchedule}
          onChooseFileAction={chooseFile}
          uploadButtonRef={uploadButtonRef}
          processing={processing}
          unavailable={!canUseSchedule(snapshot)}
          hasSchedule={schedule !== null}
          reloadRequired={
            needsReload(result) && !('recovery' in result && !result.recovery)
          }
        />
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          hidden
          aria-label="Choose a schedule CSV file"
          disabled={!canUseSchedule(snapshot)}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = '';
            if (file && canUseSchedule(session.getSnapshot())) {
              setAnnouncement('');
              restoreUploadFocus.current = true;
              void session.upload(file);
            }
          }}
        />
        {(schedule !== null || result.kind !== 'reloading') && (
          <ResultPanel
            result={result}
            date={date}
            onChooseFileAction={chooseFile}
            onDownloadAction={downloadSchedule}
            onReloadAction={() => void session.reload()}
          />
        )}
        <ShiftTable
          schedule={schedule}
          result={result}
          coverageVisible={coverageVisible}
          onReloadAction={() => void session.reload()}
        />
        <div
          id="upload-status"
          ref={statusRef}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        />
        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {announcement}
        </p>
      </main>
    </>
  );
}
