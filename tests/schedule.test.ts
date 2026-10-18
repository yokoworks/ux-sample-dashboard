import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  getShiftPosition,
  type SavedSchedule,
} from '../src/domain/schedule.ts';
import { exportScheduleCsv } from '../src/lib/csv/export-schedule.ts';

test('export includes all eight columns and explicit FALSE values for off-duty staff', () => {
  const snapshot: SavedSchedule = {
    date: '2026-10-15',
    updatedAt: '2026-10-14T17:42:00Z',
    staff: [
      {
        id: 'st_001',
        name: 'Anna',
        hours: [true, true, true, false, false, false, false, false],
      },
      {
        id: 'st_002',
        name: 'Ben',
        hours: [false, false, false, false, false, false, false, false],
      },
    ],
  };
  const before = JSON.stringify(snapshot);
  const lines = exportScheduleCsv(snapshot).trimEnd().split('\r\n');
  assert.equal(lines.length, 3);
  assert.equal(lines[0]?.split(',').length, 10);
  assert.equal(
    lines[1],
    '2026-10-15,st_001,TRUE,TRUE,TRUE,FALSE,FALSE,FALSE,FALSE,FALSE',
  );
  assert.equal(
    lines[2],
    '2026-10-15,st_002,FALSE,FALSE,FALSE,FALSE,FALSE,FALSE,FALSE,FALSE',
  );
  assert.equal(JSON.stringify(snapshot), before);
});

test('visual bars preserve the boundaries of separate periods', () => {
  const hours = [true, true, true, false, true, true, true, false] as const;
  assert.deepEqual(
    hours.map((_, index) => getShiftPosition(hours, index)),
    ['start', 'middle', 'end', 'none', 'start', 'middle', 'end', 'none'],
  );
});

test('single and full-day periods render without reading beyond the row', () => {
  const single = [
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    true,
  ] as const;
  assert.equal(getShiftPosition(single, 7), 'single');
  const fullDay = [true, true, true, true, true, true, true, true] as const;
  assert.equal(getShiftPosition(fullDay, 0), 'start');
  assert.equal(getShiftPosition(fullDay, 7), 'end');
});
