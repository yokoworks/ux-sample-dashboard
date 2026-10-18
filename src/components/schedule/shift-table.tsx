'use client';

import { useEffect, useId, useRef } from 'react';
import { Info, Loader, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  TIME_SLOTS,
  getShiftPosition,
  type SavedSchedule,
} from '@/domain/schedule';
import { needsReload, type UploadResult } from '@/domain/upload';
import { ShiftCell } from './shift-cell';
import { StaffCell } from './staff-cell';
import { TimeHeaderCell } from './time-header-cell';
import { getCoverage } from '@/domain/coverage';

export function ShiftTable({
  schedule,
  result,
  coverageVisible = false,
  onReloadAction,
}: {
  schedule: SavedSchedule | null;
  result: UploadResult;
  coverageVisible?: boolean;
  onReloadAction: () => void;
}) {
  const titleId = useId();
  const helpId = useId();
  const staleId = useId();
  const errorHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (result.kind === 'load-error') errorHeading.current?.focus();
  }, [result]);
  const counts = schedule ? getCoverage(schedule) : [];
  const outdated = schedule !== null && needsReload(result);
  function warningAt(index: number): 0 | 1 | undefined {
    const count = counts[index];
    return coverageVisible && (count === 0 || count === 1) ? count : undefined;
  }
  return (
    <section className="schedule-card" aria-labelledby={titleId}>
      <div className="schedule-title">
        <h2 id={titleId} className="table-title">
          Saved schedule
        </h2>
        {schedule && (
          <p className="table-summary">
            {schedule.staff.length} staff · 09:00–17:00 · one-hour slots
          </p>
        )}
      </div>
      {outdated && (
        <p id={staleId} className="outdated-banner">
          <Info size={20} aria-hidden="true" />
          This view may be out of date. Reload to see the latest schedule.
        </p>
      )}
      {schedule ? (
        <>
          <p id={helpId} className="sr-only">
            Scroll horizontally to see all eight time slots on smaller screens.
          </p>
          <div
            className="table-scroll"
            role="region"
            aria-label="Saved schedule table"
            aria-describedby={outdated ? `${helpId} ${staleId}` : helpId}
            tabIndex={0}
          >
            <table className="shift-table" aria-labelledby={titleId}>
              <colgroup>
                <col className="staff-column" />
                {TIME_SLOTS.map((time) => (
                  <col key={time} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th scope="col" className="staff-header-cell">
                    Staff
                  </th>
                  {TIME_SLOTS.map((time, index) => (
                    <TimeHeaderCell
                      key={time}
                      time={time}
                      warning={warningAt(index)}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {schedule.staff.map((staff) => (
                  <tr key={staff.id}>
                    <StaffCell staff={staff} />
                    {TIME_SLOTS.map((time, index) => (
                      <ShiftCell
                        key={time}
                        position={getShiftPosition(staff.hours, index)}
                        warning={warningAt(index) !== undefined}
                      />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="schedule-load-state">
          {result.kind === 'reloading' ? (
            <>
              <Loader
                size={20}
                aria-hidden="true"
                className="processing-icon"
              />
              <p>Loading the saved schedule…</p>
              <Button hierarchy="secondary" busy>
                <RefreshCw size={20} aria-hidden="true" />
                Try again
              </Button>
            </>
          ) : (
            <>
              <Info size={20} aria-hidden="true" className="load-state-icon" />
              <h3 ref={errorHeading} tabIndex={-1}>
                The schedule could not be loaded.
              </h3>
              <Button hierarchy="secondary" onClick={onReloadAction}>
                <RefreshCw size={20} aria-hidden="true" />
                Try again
              </Button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
